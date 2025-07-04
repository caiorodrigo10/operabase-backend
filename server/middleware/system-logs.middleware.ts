import { Request, Response, NextFunction } from 'express';
import { systemLogsService } from '../services/system-logs.service';
import { tenantContext } from '../shared/tenant-context.provider';

/**
 * Middleware para capturar automaticamente logs de ações do sistema
 * Implementação da Fase 1 - Logs Críticos
 */

interface LogContext {
  entityType: 'contact' | 'appointment' | 'message' | 'conversation';
  action: string;
  entityId?: number;
  previousData?: any;
  newData?: any;
}

// Store da requisição para comparar estados antes/depois
const requestStore = new Map<string, any>();

// Sistema de deduplicação mais robusto
interface LogDeduplication {
  entity_type: string;
  entity_id: number;
  action_type: string;
  clinic_id: number;
  timestamp: number;
}

const recentLogs = new Map<string, LogDeduplication>();
const DEDUP_WINDOW_MS = 5000; // 5 segundos para considerar duplicata

/**
 * Função para verificar e prevenir duplicação de logs
 */
function checkAndPreventDuplication(entityType: string, entityId: number, actionType: string, clinicId: number): boolean {
  const now = Date.now();
  const logKey = `${entityType}-${entityId}-${actionType}-${clinicId}`;
  
  // Limpar logs antigos
  cleanupOldLogs(now);
  
  // Verificar se já existe um log similar recente
  const existingLog = recentLogs.get(logKey);
  if (existingLog && (now - existingLog.timestamp) < DEDUP_WINDOW_MS) {
    return true; // É duplicata
  }
  
  // Registrar novo log
  recentLogs.set(logKey, {
    entity_type: entityType,
    entity_id: entityId,
    action_type: actionType,
    clinic_id: clinicId,
    timestamp: now
  });
  
  return false; // Não é duplicata
}

/**
 * Limpar logs antigos para evitar vazamento de memória
 */
function cleanupOldLogs(currentTime: number): void {
  for (const [key, log] of recentLogs.entries()) {
    if (currentTime - log.timestamp > DEDUP_WINDOW_MS) {
      recentLogs.delete(key);
    }
  }
}

/**
 * Middleware para capturar dados antes da operação
 */
export const capturePreOperationData = (entityType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestId = `${req.method}-${req.path}-${Date.now()}-${Math.random()}`;
      req.logRequestId = requestId;
      req.logEntityType = entityType;

      // Capturar dados existentes para operações de UPDATE/DELETE
      if ((req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') && req.params.id) {
        const entityId = parseInt(req.params.id);
        if (!isNaN(entityId)) {
          try {
            const storage = req.app.get('storage');
            let previousData = null;

            // Buscar dados existentes baseado no tipo de entidade
            switch (entityType) {
              case 'contact':
                previousData = await storage.getContact(entityId);
                break;
              case 'appointment':
                previousData = await storage.getAppointment(entityId);
                break;
              case 'message':
                previousData = await storage.getMessage(entityId);
                break;
              case 'conversation':
                previousData = await storage.getConversation(entityId);
                break;
            }

            requestStore.set(requestId, {
              entityType,
              entityId,
              previousData,
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('❌ Error capturing pre-operation data:', error);
          }
        }
      }

      next();
    } catch (error) {
      console.error('❌ Error in capturePreOperationData middleware:', error);
      next();
    }
  };
};

/**
 * Middleware simplificado para logs pós-operação com deduplicação
 */
export const logPostOperation = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    let logCaptured = false;

    res.json = function(data) {
      if (!logCaptured && res.statusCode >= 200 && res.statusCode < 300) {
        logCaptured = true;
        
        // Processar log de forma assíncrona
        setImmediate(async () => {
          try {
            const entityType = req.logEntityType;
            if (!entityType) return;

            let actionType = '';
            switch (req.method) {
              case 'POST': actionType = 'created'; break;
              case 'PUT':
              case 'PATCH': actionType = 'updated'; break;
              case 'DELETE': actionType = 'deleted'; break;
              default: return;
            }

            let entityId = null;
            let newData = data;
            
            if (newData && newData.id) {
              entityId = newData.id;
            } else if (req.params.id) {
              entityId = parseInt(req.params.id);
            }

            let clinicId;
            try {
              clinicId = tenantContext.getClinicId();
            } catch {
              clinicId = newData?.clinic_id || req.body?.clinic_id;
              if (typeof clinicId === 'string') {
                clinicId = parseInt(clinicId);
              }
            }

            if (!clinicId || !entityId) {
              return;
            }

            // Verificar duplicação
            const isDuplicate = checkAndPreventDuplication(entityType, entityId, actionType, clinicId);
            if (isDuplicate) {
              console.log(`🚫 Log duplicado previsto: ${entityType}.${actionType} entity ${entityId}`);
              return;
            }

            // Registrar log baseado no tipo
            const context = {
              source: 'web',
              actor_name: req.user?.name,
              professional_id: req.user?.id ? parseInt(req.user.id) : undefined
            };

            switch (entityType) {
              case 'appointment':
                await systemLogsService.logAppointmentAction(
                  actionType as any,
                  entityId,
                  clinicId,
                  req.user?.id,
                  'professional',
                  null,
                  newData,
                  { ...context, related_entity_id: newData?.contact_id }
                );
                break;
              case 'contact':
                await systemLogsService.logContactAction(
                  actionType as any,
                  entityId,
                  clinicId,
                  req.user?.id,
                  'professional',
                  null,
                  newData,
                  context
                );
                break;
            }

            console.log(`📝 System log recorded: ${entityType}.${actionType} for entity ${entityId}`);
          } catch (error) {
            console.error('❌ Error recording system log:', error);
          }
        });
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * DEPRECATED - Função antiga removida para eliminar duplicações
 * A lógica foi movida para o middleware simplificado acima
 */
async function captureOperationLog_DEPRECATED(req: any, res: Response, responseData: any) {
  try {
    // Só processar se a resposta foi bem-sucedida
    if (res.statusCode < 200 || res.statusCode >= 300) {
      return;
    }

    const requestId = req.logRequestId;
    const entityType = req.logEntityType;
    
    if (!requestId || !entityType) {
      return;
    }

    // Determinar tipo de ação baseado no método HTTP
    let actionType = '';
    switch (req.method) {
      case 'POST':
        actionType = 'created';
        break;
      case 'PUT':
      case 'PATCH':
        actionType = 'updated';
        break;
      case 'DELETE':
        actionType = 'deleted';
        break;
      default:
        return; // Não logar operações GET
    }

    // Recuperar dados pré-operação
    const preOpData = requestStore.get(requestId);
    if (preOpData) {
      requestStore.delete(requestId);
    }

    // Extrair dados da resposta
    let newData = null;
    let entityId = null;

    try {
      if (typeof responseData === 'string') {
        const parsed = JSON.parse(responseData);
        newData = parsed.data || parsed;
      } else {
        newData = responseData.data || responseData;
      }

      // Extrair ID da entidade
      if (newData && newData.id) {
        entityId = newData.id;
      } else if (req.params.id) {
        entityId = parseInt(req.params.id);
      }
    } catch (error) {
      console.error('❌ Error parsing response data for logging:', error);
      return;
    }

    // Obter contexto do usuário e clínica
    let clinicId;
    try {
      clinicId = tenantContext.getClinicId();
    } catch {
      // Fallback: extrair clinic_id dos dados da resposta ou parâmetros
      clinicId = newData?.clinic_id || req.query.clinic_id || req.body?.clinic_id;
      if (typeof clinicId === 'string') {
        clinicId = parseInt(clinicId);
      }
    }
    
    const userId = req.user?.id;
    const userName = req.user?.name;

    if (!clinicId || !entityId) {
      console.log(`⚠️ Skipping log - missing data:`, { 
        clinicId, 
        entityId, 
        hasNewData: !!newData,
        newDataKeys: newData ? Object.keys(newData) : [],
        bodyClinicId: req.body?.clinic_id,
        queryClinicId: req.query.clinic_id
      });
      return; // Não conseguiu obter informações necessárias
    }

    // Sistema robusto de deduplicação baseado em conteúdo e tempo
    const isDuplicate = checkAndPreventDuplication(entityType, entityId, actionType, clinicId);
    if (isDuplicate) {
      console.log(`🚫 Log duplicado previsto: ${entityType}.${actionType} entity ${entityId} clinic ${clinicId}`);
      return;
    }

    // Extrair contexto da requisição
    const context = systemLogsService.extractRequestContext(req);

    // Registrar log baseado no tipo de entidade
    switch (entityType) {
      case 'contact':
        await systemLogsService.logContactAction(
          actionType as any,
          entityId,
          clinicId,
          userId,
          'professional',
          preOpData?.previousData,
          newData,
          { ...context, actor_name: userName }
        );
        break;

      case 'appointment':
        await systemLogsService.logAppointmentAction(
          actionType as any,
          entityId,
          clinicId,
          userId,
          'professional',
          preOpData?.previousData,
          newData,
          {
            ...context,
            actor_name: userName,
            professional_id: userId ? parseInt(userId) : undefined,
            related_entity_id: newData?.contact_id
          }
        );
        break;

      case 'message':
        await systemLogsService.logMessageAction(
          actionType === 'created' ? 'sent' : actionType as any,
          entityId,
          clinicId,
          newData?.conversation_id || preOpData?.previousData?.conversation_id,
          userId,
          'professional',
          {
            ...context,
            actor_name: userName,
            professional_id: userId ? parseInt(userId) : undefined,
            contact_id: newData?.contact_id || preOpData?.previousData?.contact_id
          }
        );
        break;

      case 'conversation':
        await systemLogsService.logAction({
          entity_type: 'conversation',
          entity_id: entityId,
          action_type: actionType,
          clinic_id: clinicId,
          actor_id: userId,
          actor_type: 'professional',
          actor_name: userName,
          professional_id: userId ? parseInt(userId) : undefined,
          related_entity_id: newData?.contact_id || preOpData?.previousData?.contact_id,
          previous_data: preOpData?.previousData,
          new_data: newData,
          changes: systemLogsService['calculateChanges'](preOpData?.previousData, newData),
          ...context
        });
        break;

      case 'medical_record':
        await systemLogsService.logMedicalRecordAction(
          actionType as any,
          entityId,
          clinicId,
          userId,
          'professional',
          preOpData?.previousData,
          newData,
          {
            ...context,
            actor_name: userName,
            professional_id: userId ? parseInt(userId) : undefined,
            contact_id: newData?.contact_id || preOpData?.previousData?.contact_id,
            appointment_id: newData?.appointment_id || preOpData?.previousData?.appointment_id
          }
        );
        break;

      case 'anamnesis':
        await systemLogsService.logAnamnesisAction(
          actionType as any,
          entityId,
          clinicId,
          userId,
          'professional',
          preOpData?.previousData,
          newData,
          {
            ...context,
            actor_name: userName,
            professional_id: userId ? parseInt(userId) : undefined,
            contact_id: newData?.contact_id || preOpData?.previousData?.contact_id,
            template_id: newData?.template_id || preOpData?.previousData?.template_id
          }
        );
        break;

      case 'whatsapp_number':
        await systemLogsService.logWhatsAppAction(
          actionType as any,
          entityId,
          clinicId,
          userId,
          'professional',
          preOpData?.previousData,
          newData,
          {
            ...context,
            actor_name: userName,
            professional_id: userId ? parseInt(userId) : undefined,
            instance_name: newData?.instance_name || preOpData?.previousData?.instance_name,
            phone_number: newData?.phone_number || preOpData?.previousData?.phone_number
          }
        );
        break;
    }

    console.log(`📝 System log recorded: ${entityType}.${actionType} for entity ${entityId}`);

  } catch (error) {
    console.error('❌ Error recording system log:', error);
    // Não falhar a requisição por causa de erro no log
  }
}

/**
 * Middleware específico para logs de contatos
 */
export const contactLogsMiddleware = [
  capturePreOperationData('contact'),
  logPostOperation()
];

/**
 * Middleware específico para logs de agendamentos
 */
export const appointmentLogsMiddleware = [
  capturePreOperationData('appointment'),
  logPostOperation()
];

/**
 * Middleware específico para logs de mensagens
 */
export const messageLogsMiddleware = [
  capturePreOperationData('message'),
  logPostOperation()
];

/**
 * Middleware específico para logs de conversas
 */
export const conversationLogsMiddleware = [
  capturePreOperationData('conversation'),
  logPostOperation()
];

/**
 * Middleware específico para logs de prontuários médicos
 */
export const medicalRecordLogsMiddleware = [
  capturePreOperationData('medical_record'),
  logPostOperation()
];

/**
 * Middleware específico para logs de anamneses
 */
export const anamnesisLogsMiddleware = [
  capturePreOperationData('anamnesis'),
  logPostOperation()
];

/**
 * Middleware específico para logs de WhatsApp
 */
export const whatsappLogsMiddleware = [
  capturePreOperationData('whatsapp_number'),
  logPostOperation()
];

/**
 * Cleanup de dados antigos do requestStore (executado periodicamente)
 */
setInterval(() => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutos

  for (const [key, data] of requestStore.entries()) {
    if (now - data.timestamp > maxAge) {
      requestStore.delete(key);
    }
  }
}, 60 * 1000); // Executar a cada minuto

// Extend Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      logRequestId?: string;
      logEntityType?: string;
    }
  }
}