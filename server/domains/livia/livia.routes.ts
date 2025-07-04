import { Router } from 'express';
import { z } from 'zod';
import { insertLiviaConfigurationSchema, updateLiviaConfigurationSchema } from '../../../shared/schema';
import { IStorage } from '../../storage';
import { isAuthenticated } from '../../auth';
import { tenantContext } from '../../shared/tenant-context.provider';

export function createLiviaRoutes(storage: IStorage): Router {
  const router = Router();

  // Test endpoint (no auth required)
  router.get('/livia/test', async (req, res) => {
    res.json({ message: 'Livia routes working', timestamp: new Date().toISOString() });
  });

  // Test configuration endpoint (no auth for testing)
  router.get('/livia/test-config', async (req, res) => {
    try {
      // Mock clinic ID for testing
      const clinicId = 1;
      const config = await storage.getLiviaConfiguration(clinicId);
      res.json({ 
        success: true,
        config,
        message: 'Configuration retrieved successfully'
      });
    } catch (error) {
      console.error('Test config error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get configuration'
      });
    }
  });

  // GET /api/livia/config - Get current Livia configuration for the clinic
  router.get('/livia/config', isAuthenticated, async (req, res) => {
    try {
      console.log('🔍 LIVIA CONFIG DEBUG: Starting request');
      console.log('🔍 LIVIA CONFIG DEBUG: User object:', JSON.stringify(req.user, null, 2));
      
      const context = tenantContext.getContext();
      console.log('🔍 LIVIA CONFIG DEBUG: Tenant context:', context);
      
      const clinicId = context?.clinicId || (req.user as any)?.clinic_id || 1;
      console.log('🔍 LIVIA CONFIG DEBUG: Clinic ID:', clinicId);
      console.log('🔍 LIVIA CONFIG DEBUG: Storage object type:', typeof storage);
      console.log('🔍 LIVIA CONFIG DEBUG: Storage constructor:', storage.constructor.name);
      console.log('🔍 LIVIA CONFIG DEBUG: getLiviaConfiguration method exists?', typeof storage.getLiviaConfiguration === 'function');
      
      const config = await storage.getLiviaConfiguration(clinicId);
      console.log('🔍 LIVIA CONFIG DEBUG: Got config result:', config);
      
      if (!config) {
        console.log('⚠️ LIVIA CONFIG DEBUG: No configuration found, creating default one');
        // Create default configuration
        const defaultConfig = {
          clinic_id: clinicId,
          general_prompt: `Você é Livia, assistente virtual especializada da nossa clínica médica. Seja sempre empática, profissional e prestativa.

Suas principais responsabilidades:
- Responder dúvidas sobre procedimentos e horários
- Auxiliar no agendamento de consultas
- Fornecer informações gerais sobre a clínica
- Identificar situações de urgência

Mantenha um tom acolhedor e use linguagem simples. Em caso de dúvidas médicas específicas, sempre oriente a procurar um profissional.`,
          whatsapp_number_id: null,
          off_duration: 30,
          off_unit: 'minutos',
          selected_professional_ids: [],
          connected_knowledge_base_ids: [],
          is_active: true
        };
        
        console.log('🔍 LIVIA CONFIG DEBUG: Attempting to create default config');
        const createdConfig = await storage.createLiviaConfiguration(defaultConfig);
        console.log('🔍 LIVIA CONFIG DEBUG: Created config:', createdConfig);
        return res.json(createdConfig);
      }
      
      console.log('✅ LIVIA CONFIG DEBUG: Configuration found:', config);
      res.json(config);
    } catch (error) {
      console.error('❌ LIVIA CONFIG DEBUG: Error getting Livia configuration:', error);
      console.error('❌ LIVIA CONFIG DEBUG: Error stack:', error.stack);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao buscar configuração da Livia' 
      });
    }
  });

  // POST /api/livia/config - Create new Livia configuration
  router.post('/livia/config', isAuthenticated, async (req, res) => {
    try {
      const context = tenantContext.getContext();
      const clinicId = context?.clinicId || (req.user as any)?.clinic_id || 1;
      
      // Validate request body
      const validatedData = insertLiviaConfigurationSchema.parse({
        ...req.body,
        clinic_id: clinicId
      });
      
      // Check if configuration already exists
      const existingConfig = await storage.getLiviaConfiguration(clinicId);
      if (existingConfig) {
        return res.status(409).json({ 
          error: 'Configuração da Livia já existe para esta clínica' 
        });
      }
      
      const config = await storage.createLiviaConfiguration(validatedData);
      
      res.status(201).json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: error.errors 
        });
      }
      
      console.error('Error creating Livia configuration:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao criar configuração da Livia' 
      });
    }
  });

  // PUT /api/livia/config - Update Livia configuration
  router.put('/livia/config', isAuthenticated, async (req, res) => {
    try {
      const context = tenantContext.getContext();
      const clinicId = context?.clinicId || (req.user as any)?.clinic_id || 1;
      
      console.log('🔧 LIVIA UPDATE: Raw request body:', JSON.stringify(req.body, null, 2));
      console.log('🔧 LIVIA UPDATE: Clinic ID:', clinicId);
      
      // Handle whatsapp_number_id desvinculamento
      let processedBody = { ...req.body };
      
      // Se whatsapp_number_id não está definido, é string vazia, ou é explicitamente null, definir como null
      if (processedBody.whatsapp_number_id === '' || 
          processedBody.whatsapp_number_id === undefined || 
          processedBody.whatsapp_number_id === null ||
          processedBody.whatsapp_number_id === 'null') {
        processedBody.whatsapp_number_id = null;
        console.log('🔗 LIVIA UPDATE: WhatsApp number desvinculado (set to null)');
      }
      
      // Add clinic_id to the request body for validation
      const bodyWithClinicId = {
        ...processedBody,
        clinic_id: clinicId
      };
      
      console.log('🔧 LIVIA UPDATE: Body with clinic_id:', JSON.stringify(bodyWithClinicId, null, 2));
      
      // Validate request body
      const validatedData = updateLiviaConfigurationSchema.parse(bodyWithClinicId);
      console.log('🔧 LIVIA UPDATE: Validated data:', JSON.stringify(validatedData, null, 2));
      
      const config = await storage.updateLiviaConfiguration(clinicId, validatedData);
      
      if (!config) {
        return res.status(404).json({ 
          error: 'Configuração da Livia não encontrada' 
        });
      }

      // 🤖 REGRA 1: Aplicar ativação automática da IA após mudança na configuração da Lívia
      try {
        console.log('🤖 AI RULE 1: Configuração da Lívia alterada, aplicando Regra 1...');
        const { aiActivationService } = await import('../../services/ai-activation.service');
        const result = await aiActivationService.applyRule1OnConfigChange(clinicId);
        
        if (result.success) {
          console.log(`✅ AI RULE 1: ${result.updated} conversas atualizadas após mudança na configuração da Lívia`);
        } else {
          console.error('⚠️ AI RULE 1: Falha ao aplicar regra, configuração salva mas IA pode estar desatualizada');
        }
      } catch (aiError) {
        console.error('❌ AI RULE 1: Erro ao aplicar regra após mudança de configuração:', aiError);
        // Não falhar a operação por causa da regra da IA
      }

      // ⚡ CACHE INVALIDATION: Invalidar caches para atualização em tempo real
      try {
        console.log('⚡ CACHE INVALIDATION: Iniciando invalidação após mudança da Lívia...');
        
        // Invalidar cache memory + Redis para todas as conversas
        const { cacheService } = await import('../../cache/cache-service');
        const { webSocketService } = await import('../../websocket/websocket-service');
        
        // 1. Invalidar lista de conversas
        await cacheService.invalidate(`conversations:clinic:${clinicId}`);
        console.log('🗑️ Cache de lista de conversas invalidado');
        
        // 2. Invalidar detalhes de todas as conversas da clínica
        const conversations = await storage.getConversations(clinicId);
        for (const conv of conversations) {
          const cacheKeys = [
            `conversation:${conv.id}:detail:page:1:limit:25`,
            `conversation:${conv.id}:detail:page:1:limit:50`
          ];
          
          for (const key of cacheKeys) {
            await cacheService.invalidate(key);
          }
        }
        console.log(`🗑️ Cache de ${conversations.length} conversas invalidado`);
        
        // 3. Notificar via WebSocket para atualização em tempo real
        webSocketService.broadcastToClinic(clinicId, 'ai_config_changed', {
          clinic_id: clinicId,
          whatsapp_connected: config.whatsapp_number_id !== null,
          ai_should_be_active: config.whatsapp_number_id !== null,
          timestamp: new Date().toISOString()
        });
        console.log('📡 WebSocket notification enviada para clínica:', clinicId);
        
        console.log('✅ CACHE INVALIDATION: Concluída com sucesso - frontend deve atualizar em <5 segundos');
        
      } catch (cacheError) {
        console.error('⚠️ CACHE INVALIDATION: Erro na invalidação, mas configuração foi salva:', cacheError);
        // Não falhar a operação por causa do cache
      }
      
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: error.errors 
        });
      }
      
      console.error('Error updating Livia configuration:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao atualizar configuração da Livia' 
      });
    }
  });

  // DELETE /api/livia/config - Delete Livia configuration
  router.delete('/livia/config', isAuthenticated, async (req, res) => {
    try {
      const context = tenantContext.getContext();
      const clinicId = context?.clinicId || (req.user as any)?.clinic_id || 1;
      
      const deleted = await storage.deleteLiviaConfiguration(clinicId);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Configuração da Livia não encontrada' 
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting Livia configuration:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao deletar configuração da Livia' 
      });
    }
  });

  // GET /api/livia/config/n8n - Special endpoint for N8N integration with enhanced data
  router.get('/livia/config/n8n', isAuthenticated, async (req, res) => {
    try {
      const context = tenantContext.getContext();
      const clinicId = context?.clinicId || (req.user as any)?.clinic_id || 1;
      
      const config = await storage.getLiviaConfigurationForN8N(clinicId);
      
      if (!config) {
        return res.status(404).json({ 
          error: 'Configuração da Livia não encontrada' 
        });
      }
      
      res.json(config);
    } catch (error) {
      console.error('Error getting Livia configuration for N8N:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao buscar configuração da Livia para N8N' 
      });
    }
  });

  return router;
}