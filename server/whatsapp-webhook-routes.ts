import { Request, Response } from 'express';
import { IStorage } from './storage';
import { systemLogsService } from './services/system-logs.service';
import { validateN8NApiKey, n8nRateLimiter } from './middleware/n8n-auth.middleware';

interface WebhookConnectionUpdate {
  instanceName: string;
  connectionStatus: 'open' | 'close' | 'connecting' | 'qr';
  phoneNumber?: string;
  profileName?: string;
  profilePicUrl?: string;
  ownerJid?: string;
  timestamp?: string;
  event: string;
}

export function setupWhatsAppWebhookRoutes(app: any, storage: IStorage) {
  
  /**
   * Endpoint para receber webhooks do N8N sobre atualizações de conexão
   * Protegido com autenticação N8N_API_KEY e rate limiting
   */
  app.post('/api/whatsapp/webhook/connection-update', 
    n8nRateLimiter, 
    validateN8NApiKey, 
    async (req: Request, res: Response) => {
    try {
      console.log('🔗 Webhook recebido do N8N:', JSON.stringify(req.body, null, 2));
      
      const webhookData: WebhookConnectionUpdate = req.body;
      
      // Validar dados essenciais
      if (!webhookData.instanceName || !webhookData.event) {
        console.error('❌ Webhook inválido - dados obrigatórios ausentes');
        return res.status(400).json({ 
          error: 'Missing required fields: instanceName, event' 
        });
      }

      // Log do evento recebido
      console.log(`📱 Processando webhook para instância: ${webhookData.instanceName}`);
      console.log(`🔄 Status de conexão: ${webhookData.connectionStatus}`);
      console.log(`📞 Número: ${webhookData.phoneNumber || 'Não identificado'}`);
      console.log(`👤 Nome do perfil: ${webhookData.profileName || 'Não disponível'}`);

      // Processar apenas eventos de connection.update
      console.log(`🔍 Comparing event: "${webhookData.event}" === "connection.update" => ${webhookData.event === 'connection.update'}`);
      if (webhookData.event === 'connection.update') {
        
        // Determinar status baseado na resposta da Evolution API
        let status = 'disconnected';
        let isConnected = false;
        
        switch (webhookData.connectionStatus) {
          case 'open':
            status = 'open';
            isConnected = true;
            console.log('✅ WhatsApp conectado com sucesso!');
            break;
          case 'close':
            status = 'disconnected';
            console.log('❌ WhatsApp desconectado');
            break;
          case 'connecting':
            status = 'connecting';
            console.log('🔄 WhatsApp conectando...');
            break;
          case 'qr':
            status = 'qr_generated';
            console.log('📱 QR Code gerado, aguardando escaneamento');
            break;
          default:
            status = 'unknown';
            console.log(`⚠️ Status desconhecido: ${webhookData.connectionStatus}`);
        }

        // Preparar dados para atualização
        const updateData = {
          status,
          phone_number: webhookData.phoneNumber || null,
          connected_at: isConnected ? new Date() : null,
          disconnected_at: status === 'disconnected' ? new Date() : null,
          last_seen: new Date(),
          updated_at: new Date()
        };

        // Atualizar no banco de dados
        const updated = await storage.updateWhatsAppConnectionFromWebhook(
          webhookData.instanceName,
          updateData
        );

        if (updated) {
          console.log(`✅ WhatsApp ${webhookData.instanceName} atualizado com sucesso`);
          
          // Log das informações atualizadas
          if (webhookData.phoneNumber) {
            console.log(`📞 Número conectado: ${webhookData.phoneNumber}`);
          }
          if (webhookData.profileName) {
            console.log(`👤 Nome do perfil: ${webhookData.profileName}`);
          }

          // Log WhatsApp connection status change
          if (updated.id) {
            const actionType = isConnected ? 'connected' : 
                             status === 'connecting' ? 'connecting' : 
                             'disconnected';
            
            await systemLogsService.logWhatsAppAction(
              actionType as any,
              updated.id,
              updated.clinic_id,
              undefined,
              'system',
              null,
              {
                ...updated,
                status,
                phone_number: webhookData.phoneNumber,
                profile_name: webhookData.profileName
              },
              {
                source: 'whatsapp',
                instance_name: webhookData.instanceName,
                phone_number: webhookData.phoneNumber
              }
            );
          }
          
          res.status(200).json({ 
            success: true, 
            message: 'WhatsApp connection updated successfully',
            instanceName: webhookData.instanceName,
            status: status,
            phoneNumber: webhookData.phoneNumber
          });
        } else {
          console.warn(`⚠️ Instância não encontrada: ${webhookData.instanceName}`);
          res.status(404).json({ 
            error: 'WhatsApp instance not found',
            instanceName: webhookData.instanceName
          });
        }
      } else {
        // Outros tipos de eventos (MESSAGES_UPSERT, etc.)
        console.log(`📨 Evento recebido: ${webhookData.event} (não processado neste endpoint)`);
        res.status(200).json({ 
          success: true, 
          message: 'Event received but not processed',
          event: webhookData.event
        });
      }

    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      res.status(500).json({ 
        error: 'Internal server error processing webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Endpoint para testar webhook (desenvolvimento)
   * Protegido com autenticação N8N_API_KEY e rate limiting
   */
  app.post('/api/whatsapp/webhook/test', 
    n8nRateLimiter, 
    validateN8NApiKey, 
    async (req: Request, res: Response) => {
    console.log('🧪 Teste de webhook recebido:', req.body);
    res.status(200).json({ 
      success: true, 
      message: 'Test webhook received',
      receivedData: req.body
    });
  });
}