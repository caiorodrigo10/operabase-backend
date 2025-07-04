/**
 * ETAPA 3: Serviço de Pausa Automática da IA
 * Detecta mensagens manuais de profissionais e pausa IA automaticamente
 */

import { LiviaConfiguration } from '../../../shared/schema';

export interface AiPauseContext {
  conversationId: string | number;
  clinicId: number;
  senderId: string;
  senderType: 'patient' | 'professional' | 'ai' | 'system';
  deviceType: 'manual' | 'system';
  messageContent: string;
  timestamp: Date;
}

export interface AiPauseResult {
  shouldPause: boolean;
  pausedUntil?: Date;
  pauseReason?: string;
  pausedByUserId?: number;
}

export class AiPauseService {
  private static instance: AiPauseService;
  
  public static getInstance(): AiPauseService {
    if (!AiPauseService.instance) {
      AiPauseService.instance = new AiPauseService();
    }
    return AiPauseService.instance;
  }

  /**
   * ETAPA 3: Detecta se uma mensagem deve pausar a IA
   * Critério: sender_type = 'professional' AND device_type = 'manual'
   * CORREÇÃO: Só aplica pausa automática se IA estiver ativa (não desativada manualmente)
   */
  public shouldPauseAi(context: AiPauseContext, currentAiActive?: boolean, currentPauseReason?: string): boolean {
    console.log('🔍 ETAPA 3: Analisando se deve pausar IA...', {
      conversationId: context.conversationId,
      senderType: context.senderType,
      deviceType: context.deviceType,
      senderId: context.senderId,
      currentAiActive,
      currentPauseReason
    });

    // PROTEÇÃO: Se IA foi desativada manualmente, não aplicar pausa automática
    if (currentAiActive === false && currentPauseReason === 'manual') {
      console.log('🚫 ETAPA 3: IA desativada manualmente - não aplicar pausa automática');
      return false;
    }

    // PROTEÇÃO: Só aplicar pausa se IA estiver atualmente ativa
    if (currentAiActive === false) {
      console.log('🚫 ETAPA 3: IA já está inativa - não aplicar pausa automática');
      return false;
    }

    // Regra principal: profissional enviando mensagem (manual OU system)
    const isProfessionalMessage = 
      context.senderType === 'professional' && 
      (context.deviceType === 'manual' || context.deviceType === 'system');

    if (isProfessionalMessage) {
      console.log('✅ ETAPA 3: Mensagem de profissional detectada - IA deve ser pausada', {
        senderType: context.senderType,
        deviceType: context.deviceType,
        trigger: context.deviceType === 'manual' ? 'manual_message' : 'system_web_message'
      });
      return true;
    }

    console.log('⏭️ ETAPA 3: Mensagem não requer pausa da IA', {
      senderType: context.senderType,
      deviceType: context.deviceType,
      reason: context.senderType !== 'professional' ? 'sender_not_professional' : 'device_not_manual_or_system'
    });

    return false;
  }

  /**
   * ETAPA 3: Calcula por quanto tempo a IA deve ficar pausada
   * Baseado na configuração da clínica (off_duration + off_unit)
   */
  public calculatePauseDuration(
    liviaConfig: LiviaConfiguration,
    currentTime: Date = new Date()
  ): Date {
    const duration = liviaConfig.off_duration || 30; // padrão 30
    const unit = liviaConfig.off_unit || 'minutes'; // padrão minutes

    console.log('⏰ ETAPA 3: Calculando duração da pausa...', {
      duration,
      unit,
      currentTime: currentTime.toISOString()
    });

    const pauseEnd = new Date(currentTime);

    switch (unit) {
      case 'minutes':
        pauseEnd.setMinutes(pauseEnd.getMinutes() + duration);
        break;
      case 'hours':
        pauseEnd.setHours(pauseEnd.getHours() + duration);
        break;
      case 'days':
        pauseEnd.setDate(pauseEnd.getDate() + duration);
        break;
      default:
        // Fallback para minutos
        pauseEnd.setMinutes(pauseEnd.getMinutes() + duration);
        console.log('⚠️ ETAPA 3: Unidade desconhecida, usando minutos como fallback');
    }

    console.log('✅ ETAPA 3: Pausa calculada até:', pauseEnd.toISOString());
    return pauseEnd;
  }

  /**
   * ETAPA 3: Processa mensagem e retorna resultado da análise de pausa
   * CORREÇÃO: Recebe estado atual da IA para evitar sobrescrever desativação manual
   */
  public async processMessage(
    context: AiPauseContext,
    liviaConfig: LiviaConfiguration,
    currentAiActive?: boolean,
    currentPauseReason?: string
  ): Promise<AiPauseResult> {
    console.log('🚀 ETAPA 3: Processando mensagem para sistema de pausa da IA', {
      currentAiActive,
      currentPauseReason
    });

    const shouldPause = this.shouldPauseAi(context, currentAiActive, currentPauseReason);

    if (!shouldPause) {
      return {
        shouldPause: false
      };
    }

    // Calcular duração da pausa
    const pausedUntil = this.calculatePauseDuration(liviaConfig);

    // Extrair user_id do sender_id (pode ser numero ou string)
    const pausedByUserId = this.extractUserId(context.senderId);

    const result: AiPauseResult = {
      shouldPause: true,
      pausedUntil,
      pauseReason: 'manual_message',
      pausedByUserId
    };

    console.log('✅ ETAPA 3: Resultado da análise de pausa:', {
      shouldPause: result.shouldPause,
      pausedUntil: result.pausedUntil?.toISOString(),
      pauseReason: result.pauseReason,
      pausedByUserId: result.pausedByUserId
    });

    return result;
  }

  /**
   * ETAPA 3: Verifica se IA está atualmente pausada
   */
  public isAiCurrentlyPaused(
    aiPausedUntil: Date | null | undefined,
    currentTime: Date = new Date()
  ): boolean {
    if (!aiPausedUntil) {
      return false;
    }

    const isPaused = aiPausedUntil > currentTime;
    
    console.log('🔍 ETAPA 3: Verificando se IA está pausada...', {
      aiPausedUntil: aiPausedUntil.toISOString(),
      currentTime: currentTime.toISOString(),
      isPaused
    });

    return isPaused;
  }

  /**
   * ETAPA 3: Verifica se uma conversa deve receber resposta da IA
   * Leva em conta tanto ai_active quanto ai_paused_until
   */
  public shouldAiRespond(
    aiActive: boolean,
    aiPausedUntil: Date | null | undefined,
    currentTime: Date = new Date()
  ): boolean {
    // Primeiro verifica se IA está ativa para a conversa
    if (!aiActive) {
      console.log('⏸️ ETAPA 3: IA desativada para esta conversa (ai_active = false)');
      return false;
    }

    // Depois verifica se IA está pausada temporariamente
    const isPaused = this.isAiCurrentlyPaused(aiPausedUntil, currentTime);
    
    if (isPaused) {
      console.log('⏸️ ETAPA 3: IA temporariamente pausada até:', aiPausedUntil?.toISOString());
      return false;
    }

    console.log('✅ ETAPA 3: IA pode responder (ativa e não pausada)');
    return true;
  }

  /**
   * Helper: Extrai user_id numérico do sender_id
   */
  private extractUserId(senderId: string): number | undefined {
    try {
      const numericId = parseInt(senderId, 10);
      return isNaN(numericId) ? undefined : numericId;
    } catch (error) {
      console.log('⚠️ ETAPA 3: Não foi possível extrair user_id do sender_id:', senderId);
      return undefined;
    }
  }

  /**
   * ETAPA 3: Reseta pausa da IA (por exemplo, quando usuário manda mensagem)
   */
  public resetAiPause(): { aiPausedUntil: null; aiPauseReason: null; aiPausedByUserId: null } {
    console.log('🔄 ETAPA 3: Resetando pausa da IA');
    return {
      aiPausedUntil: null,
      aiPauseReason: null,
      aiPausedByUserId: null
    };
  }

  /**
   * ETAPA 3: Formata tempo restante de pausa para exibição
   */
  public formatPauseTimeRemaining(
    aiPausedUntil: Date | null | undefined,
    currentTime: Date = new Date()
  ): string | null {
    if (!aiPausedUntil || !this.isAiCurrentlyPaused(aiPausedUntil, currentTime)) {
      return null;
    }

    const diffMs = aiPausedUntil.getTime() - currentTime.getTime();
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    }

    const diffHours = Math.ceil(diffMinutes / 60);
    return `${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  }
}