/**
 * SISTEMA DE ÁUDIO LIMPO - URLs Públicas Temporárias
 * Solução definitiva com URLs acessíveis externamente pela Evolution API
 */

import { Express, Request, Response } from 'express';
import multer from 'multer';
import { IStorage } from '../storage';
// Usando cliente Supabase direto para evitar dependências problemáticas
import { EvolutionAPIService } from '../services/evolution-api.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
  }
});

export function setupAudioVoiceCleanRoutes(app: Express, storage: IStorage) {
  console.log('🎤 ÁUDIO LIMPO: Registrando endpoint de áudio com URLs públicas...');
  
  // Endpoint específico para áudio gravado - ROTA COMPLETAMENTE NOVA
  app.post('/api/audio/voice-message/:conversationId', upload.single('file'), async (req: Request, res: Response) => {
    console.log('\n🎤 =================================');
    console.log('🎤 ÁUDIO LIMPO: Handler ativado');
    console.log('🎤 URL:', req.originalUrl);
    console.log('🎤 Método:', req.method);
    console.log('🎤 Conversation ID:', req.params.conversationId);
    console.log('🎤 File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'Não encontrado');
    console.log('🎤 =================================\n');
    
    try {
      const conversationId = req.params.conversationId;
      
      if (!req.file) {
        console.log('❌ ÁUDIO LIMPO: Arquivo não encontrado');
        return res.status(400).json({
          success: false,
          error: 'Arquivo de áudio não encontrado'
        });
      }
      
      console.log('📤 ÁUDIO LIMPO: Iniciando upload para Supabase Storage...');
      
      // Upload para Supabase Storage
      const timestamp = Date.now();
      const fileName = `voice_${timestamp}_${req.file.originalname}`;
      const filePath = `clinic-1/conversation-${conversationId}/audio/${fileName}`;
      
      // Upload direto para Supabase Storage usando cliente direto
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('conversation-attachments')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          duplex: 'half'
        });
      
      if (uploadError) {
        console.error('❌ ÁUDIO LIMPO: Erro no upload Supabase:', uploadError);
        throw new Error('Falha no upload para Supabase Storage');
      }
      
      console.log('✅ ÁUDIO LIMPO: Upload Supabase Storage concluído');
      console.log('📂 ÁUDIO LIMPO: Arquivo salvo:', filePath);
      
      // Criar URL PÚBLICA TEMPORÁRIA (1 hora)
      console.log('🔗 ÁUDIO LIMPO: Criando URL pública temporária...');
      
      // URL pública temporária válida por 1 hora
      const { data: publicUrl, error: urlError } = await supabase.storage
        .from('conversation-attachments')
        .createSignedUrl(filePath, 3600); // 3600 segundos = 1 hora
      
      if (urlError) {
        console.error('❌ ÁUDIO LIMPO: Erro ao criar URL pública:', urlError);
        throw new Error('Falha ao criar URL pública temporária');
      }
      
      console.log('✅ ÁUDIO LIMPO: URL pública criada com sucesso');
      console.log('🌐 ÁUDIO LIMPO: URL temporária:', publicUrl.signedUrl);
      
      // Salvar mensagem no banco de dados
      console.log('💾 ÁUDIO LIMPO: Salvando mensagem no banco...');
      
      const user = {
        id: '3cd96e6d-81f2-4c8a-a54d-3abac77b37a4',
        clinic_id: 1
      };
      
      const messageData = {
        conversation_id: conversationId,
        content: 'Mensagem de voz',
        sender_type: 'professional' as const,
        ai_action: 'voice_upload',
        device_type: 'manual' as const,
        evolution_status: 'pending' as const,
        message_type: 'audio_voice' as const
      };
      
      const message = await storage.createMessage(messageData);
      console.log('✅ ÁUDIO LIMPO: Mensagem criada ID:', message.id);
      
      // Criar anexo
      const attachmentData = {
        message_id: message.id,
        clinic_id: user.clinic_id,
        file_name: req.file.originalname,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        file_url: publicUrl.signedUrl, // URL pública temporária
      };
      
      const attachment = await storage.createAttachment(attachmentData);
      console.log('✅ ÁUDIO LIMPO: Anexo criado ID:', attachment.id);
      
      // ========== NOVA SEÇÃO: TRANSCRIÇÃO + N8N INTEGRATION ==========
      console.log('🔤 ÁUDIO LIMPO: Iniciando transcrição de áudio para memória da IA...');
      
      setImmediate(async () => {
        try {
          console.log('🔤 TRANSCRIPTION: Iniciando processo de transcrição em background...');
          
          // Verificar se o arquivo existe antes de processar
          if (!req.file || !req.file.buffer || !req.file.originalname) {
            console.error('❌ TRANSCRIPTION: Arquivo não disponível para transcrição');
            return;
          }
          
          // 1. Importar serviços
          const TranscriptionService = (await import('../services/transcription.service.js')).default;
          const { saveToN8NTable } = await import('../utils/n8n-integration.js');
          
          // 2. Transcrever áudio usando Whisper
          const transcriptionService = new TranscriptionService();
          const transcribedText = await transcriptionService.transcribeAudio(
            req.file.buffer, 
            req.file.originalname
          );
          
          console.log('🔤 TRANSCRIPTION: Texto transcrito obtido:', {
            length: transcribedText.length,
            preview: transcribedText.substring(0, 100) + (transcribedText.length > 100 ? '...' : '')
          });
          
          // 3. Salvar na n8n_chat_messages (tipo "human" = profissional enviando)
          await saveToN8NTable(conversationId, transcribedText, 'human');
          
          console.log('✅ TRANSCRIPTION: Transcrição + N8N integration completa para conversa:', conversationId);
          
        } catch (transcriptionError: any) {
          console.error('❌ TRANSCRIPTION: Erro na transcrição/N8N:', {
            message: transcriptionError.message,
            conversationId,
            fileName: req.file?.originalname,
            fileSize: req.file?.size
          });
          // Não afeta o fluxo principal do áudio WhatsApp
        }
      });
      
      // ========== CONTINUA FLUXO ATUAL (Evolution API + WhatsApp) ==========
      
      // Enviar para WhatsApp via Evolution API usando MESMA LÓGICA das mensagens normais
      console.log('📱 ÁUDIO LIMPO: Enviando para WhatsApp via Evolution API...');

      console.log('🔍 ÁUDIO LIMPO: Buscando instância WhatsApp ativa para clínica:', user.clinic_id);
      
      const { data: instanceArray, error: instanceError } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('clinic_id', user.clinic_id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log('🔍 ÁUDIO LIMPO: Resultado query instância:', instanceArray);
      console.log('🔍 ÁUDIO LIMPO: Erro query:', instanceError);
      
      const activeInstance = instanceArray?.[0];
      
      console.log('🔍 ÁUDIO LIMPO: Instância selecionada:', activeInstance?.instance_name);

      if (instanceError) {
        console.error('❌ ÁUDIO LIMPO: Erro ao buscar instância WhatsApp:', instanceError);
        await storage.updateMessage(message.id, { evolution_status: 'failed' });
        
        return res.json({
          success: true,
          data: {
            message,
            attachment,
            whatsapp: {
              sent: false,
              error: 'Erro ao buscar instância WhatsApp ativa'
            }
          },
          message: 'Áudio salvo, mas não enviado para WhatsApp'
        });
      }

      if (!activeInstance) {
        console.error('❌ ÁUDIO LIMPO: Nenhuma instância WhatsApp ativa encontrada para clínica:', user.clinic_id);
        await storage.updateMessage(message.id, { evolution_status: 'failed' });
        
        return res.json({
          success: true,
          data: {
            message,
            attachment,
            whatsapp: {
              sent: false,
              error: 'Nenhuma instância WhatsApp ativa encontrada para esta clínica'
            }
          },
          message: 'Áudio salvo, mas não enviado para WhatsApp'
        });
      }

      console.log('✅ ÁUDIO LIMPO: Instância WhatsApp ativa encontrada:', {
        instance_name: activeInstance.instance_name,
        phone_number: activeInstance.phone_number,
        status: activeInstance.status
      });

      // Buscar informações de contato
      const conversationDetail = await storage.getConversationById(conversationId);

      console.log('🔍 ÁUDIO LIMPO: Resultado busca conversa:', {
        conversationId: conversationId,
        found: !!conversationDetail,
        phone: conversationDetail?.contact?.phone
      });

      if (!conversationDetail?.contact?.phone) {
        console.error('❌ ÁUDIO LIMPO: Conversa não possui contato com telefone:', conversationId);
        await storage.updateMessage(message.id, { evolution_status: 'failed' });
        
        return res.json({
          success: true,
          data: {
            message,
            attachment,
            whatsapp: {
              sent: false,
              error: 'Conversa não possui contato com telefone'
            }
          },
          message: 'Áudio salvo, mas não enviado para WhatsApp'
        });
      }
      
      // Tentar enviar para Evolution API usando URL pública
      console.log('🚀 ÁUDIO LIMPO: Chamando Evolution API...');
      console.log('🌐 ÁUDIO LIMPO: URL para Evolution:', publicUrl.signedUrl);
      
      try {
        console.log('🔍 ÁUDIO LIMPO: Dados antes da chamada Evolution:', {
          instanceName: activeInstance.instance_name,
          phone: conversationDetail.contact.phone,
          urlLength: publicUrl.signedUrl?.length || 0,
          hasUrl: !!publicUrl.signedUrl
        });
        
        console.log('🔍 ÁUDIO LIMPO: Inicializando EvolutionAPIService...');
        const evolutionService = new EvolutionAPIService();
        console.log('✅ ÁUDIO LIMPO: EvolutionAPIService inicializado');
        
        // Helper para MIME type correto (baseado no conversation-upload.service.ts)
        const getMimeType = (mediaType: string): string => {
          const mimeTypes = {
            'image': 'image/png',
            'video': 'video/mp4', 
            'audio': 'audio/mpeg',
            'document': 'application/pdf'
          };
          return mimeTypes[mediaType as keyof typeof mimeTypes] || 'application/octet-stream';
        };
        
        // Download file from Supabase and convert to base64 for Evolution API
        console.log('📥 ÁUDIO LIMPO: Baixando arquivo do Supabase para base64...');
        const response = await fetch(publicUrl.signedUrl);
        if (!response.ok) {
          throw new Error(`Failed to download audio file: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');
        
        console.log('✅ ÁUDIO LIMPO: Arquivo convertido para base64:', {
          originalSize: buffer.length,
          base64Length: base64Audio.length
        });

        const audioPayload = {
          number: conversationDetail.contact.phone,
          audio: base64Audio, // Base64 encoded audio for better Evolution API compatibility
          delay: 1000
        };
        
        console.log('🔍 ÁUDIO LIMPO: Payload de áudio (sendWhatsAppAudio):', {
          number: audioPayload.number,
          audioLength: audioPayload.audio.length,
          delay: audioPayload.delay
        });
        console.log('🔍 ÁUDIO LIMPO: Chamando sendWhatsAppAudio...');
        
        const whatsappResult = await evolutionService.sendWhatsAppAudio(activeInstance.instance_name, audioPayload);
        
        console.log('✅ ÁUDIO LIMPO: Evolution API - Sucesso!');
        console.log('📨 ÁUDIO LIMPO: MessageId:', whatsappResult.key?.id);
        
        // Atualizar status da mensagem
        await storage.updateMessage(message.id, { 
          evolution_status: 'sent',
          evolution_message_id: whatsappResult.key?.id 
        });
        
        console.log('🎯 ÁUDIO LIMPO: SUCESSO COMPLETO - Áudio enviado para WhatsApp!');
        
        return res.json({
          success: true,
          data: {
            message: { ...message, evolution_status: 'sent' },
            attachment,
            whatsapp: {
              sent: true,
              messageId: whatsappResult.key?.id
            }
          },
          message: 'Áudio enviado com sucesso para WhatsApp'
        });
        
      } catch (evolutionError: any) {
        console.error('❌ ÁUDIO LIMPO: Erro na Evolution API:', evolutionError);
        
        await storage.updateMessage(message.id, { evolution_status: 'failed' });
        
        return res.json({
          success: true,
          data: {
            message,
            attachment,
            whatsapp: {
              sent: false,
              error: evolutionError.message || 'Erro na Evolution API'
            }
          },
          message: 'Áudio salvo, mas falha no envio para WhatsApp'
        });
      }
      
    } catch (error: any) {
      console.error('❌ ÁUDIO LIMPO: Erro geral:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro interno do servidor',
        message: 'Falha no processamento do áudio'
      });
    }
  });
  
  console.log('🎤 ÁUDIO LIMPO: Endpoint registrado em /api/audio/voice-message/:conversationId');
}