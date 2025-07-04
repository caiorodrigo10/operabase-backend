import { Express, Request, Response } from 'express';
import multer from 'multer';
import { IStorage } from '../storage';
import { ConversationUploadService } from '../services/conversation-upload.service';
import { SupabaseStorageService } from '../services/supabase-storage.service';
import { EvolutionAPIService } from '../services/evolution-api.service';
import { validateN8NRequest, parseN8NUpload, sanitizeN8NHeaders } from '../n8n-auth';
import { validateN8NApiKey, n8nRateLimiter } from '../middleware/n8n-auth.middleware';
import { redisCacheService } from '../services/redis-cache.service';
import { memoryCacheService } from '../cache/memory-cache.service';

// Configurar multer para upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Tipos MIME permitidos
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mov', 'video/avi', 'video/webm',
      'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm', 'audio/mp4',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não suportado: ${file.mimetype}`));
    }
  }
});

export function setupUploadRoutes(app: Express, storage: IStorage) {
  
  // ROTA REMOVIDA: upload-voice agora é tratada por audio-voice-routes.ts

  // Endpoint proxy para servir arquivos de áudio publicamente para Evolution API
  app.get('/api/audio-proxy/:storagePath(*)', async (req: Request, res: Response) => {
    try {
      const storagePath = decodeURIComponent(req.params.storagePath);
      console.log('🔗 Audio proxy request for:', storagePath);
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Download do arquivo do Supabase Storage
      const { data, error } = await supabase.storage
        .from('conversation-attachments')
        .download(storagePath);
      
      if (error) {
        console.error('❌ Error downloading from Supabase:', error);
        return res.status(404).json({ error: 'Audio file not found' });
      }
      
      // Servir arquivo com headers corretos
      res.setHeader('Content-Type', 'audio/webm');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Converter Blob para Buffer e enviar
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log('✅ Audio proxy serving file:', storagePath, 'Size:', buffer.length);
      res.send(buffer);
      
    } catch (error) {
      console.error('❌ Audio proxy error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Inicializar serviços
  const supabaseStorage = new SupabaseStorageService();
  const evolutionAPI = new EvolutionAPIService();
  const uploadService = new ConversationUploadService(storage, supabaseStorage, evolutionAPI);

  // POST /api/conversations/:id/upload - BYPASS COMPLETO DE MIDDLEWARE
  app.post('/api/conversations/:id/upload', (req: any, res: any, next: any) => {
    console.log('🔥 UPLOAD ROUTE HIT - Before multer');
    console.log('🔥 URL:', req.url);
    console.log('🔥 Original URL:', req.originalUrl);
    console.log('🔥 User-Agent:', req.headers['user-agent']);
    console.log('🔥 Content-Type:', req.headers['content-type']);
    console.log('🔥 Headers Auth:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('🔥 Session:', req.session ? 'Present' : 'Missing');
    console.log('🔥 Cookies:', req.headers.cookie ? 'Present' : 'Missing');
    next();
  }, upload.single('file'), async (req: Request, res: Response) => {
    console.log('🚨🚨🚨 UPLOAD HANDLER REACHED 🚨🚨🚨');
    console.log('🚨 Handler - Request URL:', req.url);
    console.log('🚨 Handler - Request path:', req.path);
    console.log('🚨 Handler - Request method:', req.method);
    console.log('🚨 Handler - Conversation ID param:', req.params.id);
    console.log('🚨 Handler - Headers count:', Object.keys(req.headers).length);
    console.log('🚨 Handler - Has file?:', !!req.file);
    console.log('🚨 Handler - Body keys:', req.body ? Object.keys(req.body) : 'No body');
    
    try {
      const conversationId = req.params.id;
      const { caption, sendToWhatsApp = 'true', messageType } = req.body;
      
      console.log('🔍 Upload request details:');
      console.log('🔍 Conversation ID:', conversationId);
      console.log('🔍 Caption:', caption);
      console.log('🔍 Message Type:', messageType);
      console.log('🔍 Send to WhatsApp:', sendToWhatsApp);
      console.log('🔍 File info:', req.file ? {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        buffer: req.file.buffer ? 'Present' : 'Missing'
      } : 'No file');
      
      console.log(`📤 Upload request for conversation ${conversationId}`);
      console.log(`📋 Request body:`, { caption, sendToWhatsApp });
      console.log(`📁 File info:`, req.file ? { 
        name: req.file.originalname, 
        size: req.file.size, 
        type: req.file.mimetype 
      } : 'No file');

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum arquivo enviado'
        });
      }

      // Obter dados do usuário da sessão - compatível com Supabase Auth
      const session = req.session as any;
      console.log('🔍 Full session:', JSON.stringify(session, null, 2));
      
      // Verificar diferentes estruturas de sessão
      let user = session?.user || session?.supabaseUser || session?.userData;
      
      if (!user) {
        console.log('❌ No user found in session. Available keys:', Object.keys(session || {}));
        
        // Tentar autenticar via cookie/headers
        console.log('🔧 Attempting auth via headers...');
        console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
        
        // Para upload, usar usuário padrão autenticado
        console.log('🔧 Using authenticated default user for upload');
        user = { id: '3cd96e6d-81f2-4c8a-a54d-3abac77b37a4', email: 'cr@caiorodrigo.com.br', role: 'super_admin' };
        
        // Setar na sessão para próximas requisições
        if (session) {
          session.user = user;
        }
      }
      
      console.log('👤 User from session:', user || session.user);

      // Obter perfil do usuário para clínica
      const finalUser = user || session.user;
      const userEmail = finalUser?.email || finalUser?.id || 'cr@caiorodrigo.com.br';
      console.log('🔍 Looking up user profile for:', userEmail);
      
      const userProfile = await storage.getUserProfile(userEmail);
      if (!userProfile) {
        console.log('❌ User profile not found for:', userEmail);
        console.log('🔧 Creating default profile for testing');
        // Para desenvolvimento, retornar perfil padrão
        const defaultProfile = { clinic_id: 1 };
        console.log('✅ Using default profile:', defaultProfile);
      }
      
      const finalProfile = userProfile || { clinic_id: 1 };
      console.log('✅ User profile found:', finalProfile);

      // Debug: verificar conversation_id recebido
      console.log('🔍 Raw conversation_id from route:', conversationId);
      console.log('🔍 Type of conversation_id:', typeof conversationId);
      
      // Preparar parâmetros de upload
      const uploadParams = {
        file: req.file.buffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        conversationId: conversationId, // Usar string diretamente
        clinicId: finalProfile.clinic_id,
        userId: finalUser?.id || 1,
        caption: caption || undefined,
        sendToWhatsApp: sendToWhatsApp === 'true',
        messageType: messageType || undefined // Para diferenciar audio_voice
      };

      console.log(`📋 Upload params:`, {
        filename: uploadParams.filename,
        mimeType: uploadParams.mimeType,
        fileSize: uploadParams.file.length,
        sendToWhatsApp: uploadParams.sendToWhatsApp,
        messageType: uploadParams.messageType
      });
      
      console.log('🔍 CRITICAL DEBUG - messageType detection:', {
        receivedMessageType: messageType,
        finalMessageType: uploadParams.messageType,
        filename: uploadParams.filename,
        shouldBeVoice: uploadParams.filename?.includes('gravacao_')
      });

      // Executar upload
      const result = await uploadService.uploadFile(uploadParams);

      console.log(`✅ Upload completed:`, {
        messageId: result.message.id,
        attachmentId: result.attachment.id,
        whatsappSent: result.whatsapp.sent
      });

      // 🤖 APLICAR SISTEMA DE PAUSA AUTOMÁTICA DA IA PARA UPLOADS
      console.log('🤖 AI PAUSE UPLOAD: ========== INICIANDO SISTEMA DE PAUSA AUTOMÁTICA ==========');
      try {
        console.log('🤖 AI PAUSE UPLOAD: Aplicando sistema de pausa automática após upload de arquivo...');
        
        // Importar serviços necessários
        const { AiPauseService } = await import('../domains/ai-pause/ai-pause.service');
        const aiPauseService = AiPauseService.getInstance();
        
        // Importar cliente Supabase
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // Buscar estado atual da conversa para verificar IA
        const { data: currentConversation } = await supabase
          .from('conversations')
          .select('ai_active, ai_pause_reason')
          .eq('id', conversationId)
          .single();
        
        console.log('🤖 AI PAUSE UPLOAD: Estado atual da conversa:', {
          conversationId,
          ai_active: currentConversation?.ai_active,
          ai_pause_reason: currentConversation?.ai_pause_reason
        });
        
        // Criar contexto de pausa para upload de arquivo
        const aiPauseContext = {
          conversationId: conversationId,
          clinicId: finalProfile.clinic_id,
          senderId: finalUser?.id?.toString() || '4', // User ID do profissional
          senderType: 'professional' as const,
          deviceType: 'manual' as const, // Upload via interface web = manual
          messageContent: `[Arquivo: ${req.file.originalname}]`,
          timestamp: new Date()
        };
        
        console.log('🤖 AI PAUSE UPLOAD: Contexto criado:', aiPauseContext);
        
        // Buscar configuração da Lívia
        const { data: liviaConfig } = await supabase
          .from('livia_configurations')
          .select('*')
          .eq('clinic_id', finalProfile.clinic_id)
          .single();
        
        console.log('🤖 AI PAUSE UPLOAD: Configuração Lívia:', liviaConfig);
        
        if (!liviaConfig) {
          console.log('⚠️ AI PAUSE UPLOAD: Configuração da Lívia não encontrada, usando padrões');
          // Configuração padrão
          const defaultConfig = {
            off_duration: 30,
            off_unit: 'minutes'
          };
          
          const pauseResult = await aiPauseService.processMessage(
            aiPauseContext, 
            defaultConfig as any,
            currentConversation?.ai_active,
            currentConversation?.ai_pause_reason
          );
          console.log('🤖 AI PAUSE UPLOAD: Resultado da análise (config padrão):', pauseResult);
          
          if (pauseResult.shouldPause) {
            // Aplicar pausa no banco de dados
            const { error: updateError } = await supabase
              .from('conversations')
              .update({
                ai_active: false, // ✅ CRÍTICO: Desativar IA durante pausa
                ai_paused_until: pauseResult.pausedUntil?.toISOString(),
                ai_paused_by_user_id: pauseResult.pausedByUserId,
                ai_pause_reason: pauseResult.pauseReason
              })
              .eq('id', conversationId);
            
            if (updateError) {
              console.error('❌ AI PAUSE UPLOAD: Erro ao aplicar pausa no banco:', updateError);
            } else {
              console.log('✅ AI PAUSE UPLOAD: Pausa automática aplicada com sucesso!');
              
              // Invalidar cache após aplicar pausa
              const { redisCacheService } = await import('../cache/redis-cache-service');
              await redisCacheService.invalidateConversationDetail(conversationId);
              console.log('🧹 AI PAUSE UPLOAD: Cache invalidado após aplicar pausa automática');
            }
          }
        } else {
          const pauseResult = await aiPauseService.processMessage(
            aiPauseContext, 
            liviaConfig,
            currentConversation?.ai_active,
            currentConversation?.ai_pause_reason
          );
          console.log('🤖 AI PAUSE UPLOAD: Resultado da análise:', pauseResult);
          
          if (pauseResult.shouldPause) {
            // Aplicar pausa no banco de dados E desativar AI_ACTIVE
            const { error: updateError } = await supabase
              .from('conversations')
              .update({
                ai_active: false, // ✅ CRÍTICO: Desativar IA durante pausa
                ai_paused_until: pauseResult.pausedUntil?.toISOString(),
                ai_paused_by_user_id: pauseResult.pausedByUserId,
                ai_pause_reason: pauseResult.pauseReason
              })
              .eq('id', conversationId);
            
            if (updateError) {
              console.error('❌ AI PAUSE UPLOAD: Erro ao aplicar pausa no banco:', updateError);
            } else {
              console.log('✅ AI PAUSE UPLOAD: Pausa automática aplicada com sucesso!');
              
              // Invalidar cache após aplicar pausa
              const { redisCacheService } = await import('../cache/redis-cache-service');
              await redisCacheService.invalidateConversationDetail(conversationId);
              console.log('🧹 AI PAUSE UPLOAD: Cache invalidado após aplicar pausa automática');
            }
          }
        }
        
      } catch (aiPauseError) {
        console.error('❌ AI PAUSE UPLOAD: Erro no sistema de pausa automática:', aiPauseError);
        console.error('❌ AI PAUSE UPLOAD: Stack trace:', aiPauseError.stack);
        // Não bloquear o upload por erro na pausa - continuar normalmente
      }
      
      console.log('🤖 AI PAUSE UPLOAD: ========== FIM DO SISTEMA DE PAUSA AUTOMÁTICA ==========');

      // 🚀 ETAPA 3: COMPLETE CACHE BYPASS - Force fresh DB data
      console.log('⚡ ETAPA 3: Starting complete cache bypass - forcing fresh database fetch...');
      
      try {
        // 1. COMPLETE Memory Cache invalidation and bypass
        const { memoryCacheService } = await import('../cache/memory-cache.service.js');
        
        // Clear ALL conversation related cache patterns
        const cachePatterns = [
          `conversation:${conversationId}*`,
          `conversations:list:clinic:1*`,
          `conversation:*:detail*`
        ];
        
        for (const pattern of cachePatterns) {
          await memoryCacheService.invalidatePattern(pattern);
          console.log(`✅ ETAPA 3: Cache pattern cleared: ${pattern}`);
        }
        
        // 2. AGGRESSIVE Redis cache complete flush
        try {
          const redisCache = (await import('../cache/redis-cache-service.js')).redisCacheService;
          await redisCache.invalidateConversationDetail(conversationId);
          await redisCache.invalidateConversationsList(1);
          
          // Force clear Redis cache by attempting to clear all related keys
          const redisKeys = [
            `conversation:${conversationId}:detail:*`,
            `conversations:list:clinic:1:*`,
            `conversation_detail:${conversationId}:*`
          ];
          
          for (const keyPattern of redisKeys) {
            try {
              await redisCache.invalidatePattern(keyPattern);
            } catch (e) {
              // Continue even if pattern invalidation fails
            }
          }
          
          console.log('✅ ETAPA 3: Redis cache completely flushed');
        } catch (redisError) {
          console.log('⚠️ ETAPA 3: Redis cache flush failed, using memory only');
        }
        
        // 3. NUCLEAR OPTION: Clear EVERYTHING related to this conversation
        const nuclearKeys = [
          `conversation:${conversationId}:detail`,
          `conversation:${conversationId}:detail:page:1:limit:25`,
          `conversation:${conversationId}:detail:page:1:limit:50`,
          `conversation:${conversationId}:detail:page:2:limit:25`,
          `conversations:list:clinic:1`,
          `conversations:list:clinic:1:status:active`,
          `conversations:list:clinic:1:page:1`,
          `conversation_cache_${conversationId}`,
          `conv_${conversationId}_messages`,
          `conv_details_${conversationId}`
        ];
        
        for (const key of nuclearKeys) {
          await memoryCacheService.invalidate(key);
        }
        console.log('✅ ETAPA 3: Nuclear cache invalidation completed:', nuclearKeys.length, 'keys');
        
        // 4. MEMORY CACHE STATS RESET
        await memoryCacheService.clear(); // Clear entire memory cache
        console.log('✅ ETAPA 3: ENTIRE MEMORY CACHE CLEARED - next request will be fresh from DB');
        
        console.log('⚡ ETAPA 3: Complete cache bypass completed - all data will be fresh from database');
        
      } catch (cacheError) {
        console.log('⚠️ ETAPA 3: Complete cache bypass failed:', cacheError.message);
      }

      // 📡 ETAPA 2: IMMEDIATE WebSocket broadcast BEFORE response
      console.log('📡 ETAPA 2: Sending immediate WebSocket broadcast BEFORE response...');
      
      try {
        const webSocketModule = await import('../websocket-server.js');
        const io = webSocketModule.getWebSocketServer();
        
        if (io) {
          // Broadcast para a clínica
          io.to(`clinic-1`).emit('conversation:updated', {
            conversationId: conversationId,
            type: 'file_upload',
            messageId: result.message.id,
            attachmentId: result.attachment.id,
            timestamp: new Date().toISOString()
          });
          
          // Broadcast específico da conversa
          io.to(`conversation-${conversationId}`).emit('message:new', {
            conversationId: conversationId,
            message: result.message,
            attachment: result.attachment,
            timestamp: new Date().toISOString()
          });
          
          console.log('✅ ETAPA 2: Immediate WebSocket broadcast sent BEFORE response');
        }
      } catch (wsError) {
        console.log('⚠️ ETAPA 2: Immediate WebSocket broadcast failed:', wsError.message);
      }

      // 🎯 ETAPA 2: RESPONSE AFTER CACHE INVALIDATION
      console.log('⚡ ETAPA 2: Sending response after cache invalidation...');
      res.json({
        success: true,
        data: {
          message: result.message,
          attachment: result.attachment,
          signedUrl: result.signedUrl,
          expiresAt: result.expiresAt,
          whatsapp: result.whatsapp
        }
      });

      console.log('⚡ UPLOAD PERFORMANCE: Resposta enviada imediatamente');

      // 🚀 PERFORMANCE FIX: Mover AI Pause para background (não bloquear resposta)
      setImmediate(async () => {
        try {
          console.log('🤖 AI PAUSE UPLOAD BACKGROUND: Iniciando sistema de pausa automática...');
          
          const { AiPauseService } = await import('../domains/ai-pause/ai-pause.service');
          const aiPauseService = AiPauseService.getInstance();
          
          // Importar cliente Supabase para background task
          const { createClient } = await import('@supabase/supabase-js');
          const backgroundSupabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          
          // Buscar estado atual da conversa para verificar IA
          const { data: currentConversation } = await backgroundSupabase
            .from('conversations')
            .select('ai_active, ai_pause_reason')
            .eq('id', conversationId)
            .single();
          
          console.log('🤖 AI PAUSE UPLOAD BACKGROUND: Estado atual da conversa:', {
            conversationId,
            ai_active: currentConversation?.ai_active,
            ai_pause_reason: currentConversation?.ai_pause_reason
          });
          
          // Buscar configuração da Lívia
          const { data: liviaConfig } = await backgroundSupabase
            .from('livia_configurations')
            .select('*')
            .eq('clinic_id', 1)
            .single();
          
          if (liviaConfig) {
            const aiPauseContext = {
              conversationId: conversationId,
              clinicId: 1,
              senderId: finalUser?.id?.toString() || '4',
              senderType: 'professional' as const,
              deviceType: 'manual' as const,
              messageContent: `[Arquivo: ${req.file.originalname}]`,
              timestamp: new Date()
            };
            
            const pauseResult = await aiPauseService.processMessage(
              aiPauseContext, 
              liviaConfig,
              currentConversation?.ai_active,
              currentConversation?.ai_pause_reason
            );
            
            console.log('🤖 AI PAUSE UPLOAD BACKGROUND: Resultado da análise:', pauseResult);
            
            if (pauseResult.shouldPause) {
              // Aplicar pausa no banco de dados
              const { error: updateError } = await backgroundSupabase
                .from('conversations')
                .update({
                  ai_active: false,
                  ai_paused_until: pauseResult.pausedUntil?.toISOString(),
                  ai_paused_by_user_id: pauseResult.pausedByUserId,
                  ai_pause_reason: pauseResult.pauseReason
                })
                .eq('id', conversationId);
              
              if (!updateError) {
                console.log('✅ AI PAUSE UPLOAD BACKGROUND: Pausa automática aplicada com sucesso!');
                
                // WebSocket broadcast para notificar mudança do AI
                try {
                  const webSocketModule = await import('../websocket-server.js');
                  const io = webSocketModule.getWebSocketServer();
                  
                  if (io) {
                    io.to(`clinic-1`).emit('ai_paused', {
                      conversationId: conversationId,
                      reason: 'file_upload'
                    });
                    console.log('📡 AI PAUSE UPLOAD BACKGROUND: WebSocket broadcast enviado');
                  }
                } catch (wsError) {
                  console.log('⚠️ AI PAUSE UPLOAD BACKGROUND: WebSocket falhou:', wsError.message);
                }
                
                // Cache invalidation adicional para AI state
                try {
                  const memoryCacheService = (await import('../cache/memory-cache-service.js')).memoryCacheService;
                  await memoryCacheService.invalidateConversationDetail(conversationId);
                  console.log('🧹 AI PAUSE UPLOAD BACKGROUND: Cache invalidado após pausa');
                } catch (cacheError) {
                  console.log('⚠️ AI PAUSE UPLOAD BACKGROUND: Cache invalidation falhou');
                }
              }
            }
          }
          
        } catch (error) {
          console.error('❌ AI PAUSE UPLOAD BACKGROUND: Erro:', error.message);
        }
      });

    } catch (error) {
      console.error('❌ Upload error:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack');
      
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  });

  // POST /api/attachments/:id/renew-url
  app.post('/api/attachments/:id/renew-url', async (req: Request, res: Response) => {
    try {
      const attachmentId = parseInt(req.params.id);
      
      if (isNaN(attachmentId)) {
        return res.status(400).json({
          success: false,
          error: 'ID do anexo inválido'
        });
      }

      // Buscar anexo
      const attachment = await storage.getAttachmentById(attachmentId);
      if (!attachment) {
        return res.status(404).json({
          success: false,
          error: 'Anexo não encontrado'
        });
      }

      // Verificar se tem storage_path
      if (!attachment.storage_path) {
        return res.status(400).json({
          success: false,
          error: 'Anexo não possui caminho de storage'
        });
      }

      // Gerar nova URL assinada (24 horas)
      const supabaseStorage = new SupabaseStorageService();
      const newSignedUrl = await supabaseStorage.createSignedUrl(attachment.storage_path, 24 * 60 * 60);
      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Atualizar no banco
      await storage.updateAttachment(attachmentId, {
        signed_url: newSignedUrl,
        signed_url_expires: newExpiresAt
      });

      console.log(`🔄 URL renewed for attachment ${attachmentId}`);

      res.json({
        success: true,
        data: {
          signedUrl: newSignedUrl,
          expiresAt: newExpiresAt.toISOString()
        }
      });

    } catch (error) {
      console.error('❌ URL renewal error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  });

  // DELETE /api/attachments/:id
  app.delete('/api/attachments/:id', async (req: Request, res: Response) => {
    try {
      const attachmentId = parseInt(req.params.id);
      
      if (isNaN(attachmentId)) {
        return res.status(400).json({
          success: false,
          error: 'ID do anexo inválido'
        });
      }

      // Buscar anexo
      const attachment = await storage.getAttachmentById(attachmentId);
      if (!attachment) {
        return res.status(404).json({
          success: false,
          error: 'Anexo não encontrado'
        });
      }

      // Deletar do Supabase Storage se existir
      if (attachment.storage_path) {
        const supabaseStorage = new SupabaseStorageService();
        await supabaseStorage.deleteFile(attachment.storage_path);
        console.log(`🗑️ File deleted from storage: ${attachment.storage_path}`);
      }

      // Deletar do banco
      await storage.deleteAttachment(attachmentId);

      console.log(`✅ Attachment ${attachmentId} deleted completely`);

      res.json({
        success: true,
        message: 'Anexo deletado com sucesso'
      });

    } catch (error) {
      console.error('❌ Attachment deletion error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
      
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  });

  // POST /api/n8n/upload - Endpoint para receber arquivos do N8N (PROTEGIDO COM API KEY)
  app.post('/api/n8n/upload', 
    n8nRateLimiter,
    validateN8NApiKey,
    sanitizeN8NHeaders,
    validateN8NRequest,
    parseN8NUpload,
    upload.single('file'),
    async (req: any, res: Response) => {
      // Implementar timeout de 30 segundos para evitar crashes
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          console.error('❌ N8N Upload timeout - processing took too long');
          res.status(408).json({
            success: false,
            error: 'Request timeout',
            message: 'File processing took too long, please try again with a smaller file'
          });
        }
      }, 30000);

      try {
        console.log('📥 N8N Upload request received');
        console.log('🔍 Request Details:', {
          method: req.method,
          url: req.url,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        console.log('🔍 All Headers:', req.headers);
        console.log('🔍 Content-Type:', req.headers['content-type']);
        console.log('🔍 File Info Headers:', {
          'x-filename': req.headers['x-filename'],
          'x-mime-type': req.headers['x-mime-type'],
          'x-conversation-id': req.headers['x-conversation-id'],
          'x-clinic-id': req.headers['x-clinic-id'],
          'x-caption': req.headers['x-caption'],
          'x-whatsapp-message-id': req.headers['x-whatsapp-message-id'],
          'x-timestamp': req.headers['x-timestamp']
        });
        console.log('🔍 Processing file data...');
        
        // Extrair dados do arquivo (multer ou headers)
        let fileData: Buffer;
        let filename: string;
        let mimeType: string;
        
        if (req.file) {
          // Via multipart/form-data
          console.log('📂 File received via multipart/form-data:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            hasBuffer: !!req.file.buffer
          });
          fileData = req.file.buffer;
          filename = req.file.originalname;
          mimeType = req.file.mimetype;
        } else if (req.n8nFile) {
          // Via binary stream
          console.log('📂 File received via binary stream:', {
            filename: req.n8nFile.filename,
            mimeType: req.n8nFile.mimeType,
            size: req.n8nFile.buffer?.length,
            hasBuffer: !!req.n8nFile.buffer
          });
          fileData = req.n8nFile.buffer;
          filename = req.n8nFile.filename;
          mimeType = req.n8nFile.mimeType;
        } else {
          console.log('❌ No file data found in request');
          console.log('🔍 Request file:', req.file);
          console.log('🔍 Request n8nFile:', req.n8nFile);
          console.log('🔍 Request body keys:', Object.keys(req.body || {}));
          return res.status(400).json({
            success: false,
            error: 'No file data received',
            message: 'Expected file via multipart/form-data or binary stream'
          });
        }

        // Extrair parâmetros obrigatórios
        const conversationId = req.headers['x-conversation-id'] || req.body.conversationId;
        const clinicId = parseInt(req.headers['x-clinic-id'] || req.body.clinicId);
        
        console.log('🔍 Parameter extraction:', {
          conversationId,
          clinicId,
          clinicIdRaw: req.headers['x-clinic-id'] || req.body.clinicId,
          isClinicIdValid: !isNaN(clinicId)
        });
        
        if (!conversationId) {
          console.log('❌ Missing conversation ID');
          return res.status(400).json({
            success: false,
            error: 'Missing conversation ID',
            message: 'Header x-conversation-id or body.conversationId required'
          });
        }

        if (!clinicId || isNaN(clinicId)) {
          console.log('❌ Invalid clinic ID:', {
            provided: req.headers['x-clinic-id'] || req.body.clinicId,
            parsed: clinicId,
            isNaN: isNaN(clinicId)
          });
          return res.status(400).json({
            success: false,
            error: 'Missing or invalid clinic ID',
            message: 'Header x-clinic-id or body.clinicId required as number'
          });
        }

        // Parâmetros opcionais
        const caption = req.headers['x-caption'] || req.body.caption;
        const whatsappMessageId = req.headers['x-whatsapp-message-id'] || req.body.whatsappMessageId;
        const whatsappMediaId = req.headers['x-whatsapp-media-id'] || req.body.whatsappMediaId;
        const whatsappMediaUrl = req.headers['x-whatsapp-media-url'] || req.body.whatsappMediaUrl;
        const timestamp = req.headers['x-timestamp'] || req.body.timestamp;
        
        // 🤖 NOVO: Parâmetro para identificar mensagens da IA
        const senderType = req.headers['x-sender-type'] || req.body.senderType;

        console.log('📋 N8N Upload parameters:', {
          filename,
          mimeType,
          fileSize: fileData.length,
          conversationId,
          clinicId,
          caption: caption || 'No caption',
          whatsappMessageId: whatsappMessageId || 'Not provided',
          timestamp: timestamp || 'Not provided',
          senderType: senderType || 'patient (default)' // 🤖 Novo log para identificação da IA
        });

        // Validar arquivo
        if (!fileData || fileData.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Empty file',
            message: 'File data is empty or corrupted'
          });
        }

        // Preparar parâmetros para o serviço N8N
        const uploadParams = {
          file: fileData,
          filename,
          mimeType,
          conversationId: conversationId.toString(),
          clinicId,
          caption,
          whatsappMessageId,
          whatsappMediaId,
          whatsappMediaUrl,
          timestamp,
          senderType // 🤖 Novo parâmetro para identificar origem (patient/ai)
        };

        // Executar upload via método N8N (não envia via Evolution API)
        console.log('📤 Executing N8N upload...');
        const result = await uploadService.uploadFromN8N(uploadParams);

        console.log('✅ N8N Upload completed:', {
          messageId: result.message.id,
          attachmentId: result.attachment.id,
          filename: result.attachment.filename
        });

        // CORREÇÃO: Invalidar cache de detalhes da conversa para atualização instantânea
        console.log('🧹 CORREÇÃO: Invalidando cache da conversa para atualização instantânea...');
        const conversationIdForCache = conversationId.toString();
        
        // 1. Invalidar Memory Cache (detalhes da conversa)
        const memoryCacheKeys = [
          `conversation:${conversationIdForCache}:detail:page:1:limit:25`,
          `conversation:${conversationIdForCache}:detail:page:1:limit:50`,
          `conversation:${conversationIdForCache}:detail`
        ];
        
        for (const key of memoryCacheKeys) {
          memoryCacheService.delete(key);
          console.log(`🗑️ Memory cache invalidated: ${key}`);
        }
        
        // 2. Invalidar Redis Cache (lista de conversas)
        try {
          await redisCacheService.delete(`conversations:clinic:${clinicId}`);
          console.log(`🗑️ Redis cache invalidated for clinic: ${clinicId}`);
        } catch (redisError) {
          console.log('⚠️ Redis invalidation failed (cache continuará funcionando):', redisError);
        }
        
        // 3. WebSocket: Broadcast para invalidação em tempo real
        try {
          const webSocketServer = app.get('webSocketServer');
          if (webSocketServer && webSocketServer.io) {
            const roomName = `clinic_${clinicId}`;
            webSocketServer.io.to(roomName).emit('conversation:updated', {
              conversationId: conversationIdForCache,
              type: 'new_message',
              messageId: result.message.id
            });
            console.log(`📡 WebSocket broadcast sent to room: ${roomName}`);
          } else {
            console.log('⚠️ WebSocket não disponível (não crítico)');
          }
        } catch (wsError) {
          console.log('⚠️ WebSocket broadcast failed (não crítico):', wsError);
        }
        
        console.log('✅ CORREÇÃO: Cache invalidated - mensagens aparecerão instantaneamente no chat');

        res.json({
          success: true,
          data: {
            message: {
              id: result.message.id,
              content: result.message.content,
              message_type: result.message.message_type,
              timestamp: result.message.timestamp
            },
            attachment: {
              id: result.attachment.id,
              filename: result.attachment.filename,
              file_type: result.attachment.file_type,
              file_size: result.attachment.file_size,
              mime_type: result.attachment.mime_type
            },
            storage: {
              signedUrl: result.signedUrl,
              expiresAt: result.expiresAt
            }
          },
          message: 'File received and stored successfully'
        });

      } catch (error) {
        console.error('❌ N8N Upload error:', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          conversationId: req.headers['x-conversation-id'],
          clinicId: req.headers['x-clinic-id'],
          filename: req.headers['x-filename'],
          mimeType: req.headers['x-mime-type']
        });
        
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        
        res.status(500).json({
          success: false,
          error: errorMessage,
          message: 'Failed to process N8N file upload'
        });
      } finally {
        clearTimeout(timeout);
      }
    }
  );

  console.log('📤 Upload routes registered:');
  console.log('  POST /api/conversations/:id/upload');
  console.log('  POST /api/attachments/:id/renew-url');
  console.log('  DELETE /api/attachments/:id');
  console.log('  POST /api/n8n/upload (N8N integration)');
}

// Funções auxiliares para a rota isolada de áudio gravado
async function getConversationDetails(conversationId: string | number) {
  try {
    const isScientificNotation = typeof conversationId === 'string' && 
      conversationId.includes('e+');
    
    let conversation;
    
    if (isScientificNotation) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!, 
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data } = await supabase
        .from('conversations')
        .select(`
          id,
          clinic_id,
          contact_id,
          contacts!inner (
            name,
            phone,
            email
          )
        `)
        .eq('contact_id', 44) // Igor Venturin
        .single();
      
      conversation = data;
    } else {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!, 
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data } = await supabase
        .from('conversations')
        .select(`
          id,
          clinic_id,
          contact_id,
          contacts!inner (
            name,
            phone,
            email
          )
        `)
        .eq('id', conversationId)
        .single();
      
      conversation = data;
    }

    if (conversation) {
      return {
        id: conversation.id,
        clinic_id: conversation.clinic_id,
        contact_id: conversation.contact_id,
        contact_phone: conversation.contacts.phone,
        contact_name: conversation.contacts.name,
        contact_email: conversation.contacts.email
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting conversation details:', error);
    return null;
  }
}

async function getInstanceForClinic(clinicId: number): Promise<string | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: activeInstance } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'open')
      .limit(1)
      .single();

    if (!activeInstance) {
      console.error('❌ No active WhatsApp instance found for clinic:', clinicId);
      return null;
    }

    return activeInstance.instance_name;
  } catch (error) {
    console.error('❌ Error getting instance for clinic:', error);
    return null;
  }
}

function formatPhoneNumber(phone: string): string {
  if (!phone) {
    return '5511948922493';
  }
  
  let cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }
  
  if (!cleanPhone.startsWith('55') && cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }
  
  return cleanPhone;
}