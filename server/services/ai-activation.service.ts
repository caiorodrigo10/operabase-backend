/**
 * AI Activation Service - Regra 1: Ativação baseada na vinculação WhatsApp da Lívia
 * 
 * Regra 1: AI baseada na vinculação WhatsApp
 * - Quando whatsapp_number_id = null → todas conversas ai_active = false  
 * - Quando whatsapp_number_id = ID_válido → todas conversas ai_active = true
 * 
 * APLICAÇÃO: Apenas quando configuração da Lívia muda (Ponto 4)
 * NÃO aplicar em mensagens individuais (Pontos 2,3 removidos)
 */

import { createClient } from '@supabase/supabase-js';

interface LiviaConfiguration {
  id: number;
  clinic_id: number;
  whatsapp_number_id: number | null;
  is_active: boolean;
}

interface AIActivationContext {
  shouldActivateAI: boolean;
  reason: string;
  liviaConfig: LiviaConfiguration | null;
}

export class AIActivationService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Determina se a IA deve estar ativa baseado na configuração atual da Lívia
   * 
   * @param clinicId ID da clínica
   * @returns Contexto de ativação da IA
   */
  async shouldActivateAI(clinicId: number): Promise<AIActivationContext> {
    try {
      console.log(`🤖 AI RULE 1: Verificando ativação da IA para clínica ${clinicId}`);

      // Buscar configuração da Lívia da clínica
      const { data: liviaConfig, error } = await this.supabase
        .from('livia_configurations')
        .select('id, clinic_id, whatsapp_number_id, is_active')
        .eq('clinic_id', clinicId)
        .single();

      if (error) {
        console.log(`⚠️ AI RULE 1: Configuração da Lívia não encontrada para clínica ${clinicId}:`, error.message);
        return {
          shouldActivateAI: false,
          reason: 'livia_config_not_found',
          liviaConfig: null
        };
      }

      if (!liviaConfig.is_active) {
        console.log(`🚫 AI RULE 1: Lívia está desativada para clínica ${clinicId}`);
        return {
          shouldActivateAI: false,
          reason: 'livia_inactive',
          liviaConfig
        };
      }

      if (liviaConfig.whatsapp_number_id === null) {
        console.log(`🚫 AI RULE 1: Lívia sem WhatsApp vinculado para clínica ${clinicId} → ai_active = false`);
        return {
          shouldActivateAI: false,
          reason: 'no_whatsapp_linked',
          liviaConfig
        };
      }

      // Verificar se o número WhatsApp ainda está ativo
      const { data: whatsappNumber, error: whatsappError } = await this.supabase
        .from('whatsapp_numbers')
        .select('id, phone_number, status, is_deleted')
        .eq('id', liviaConfig.whatsapp_number_id)
        .eq('is_deleted', false)
        .single();

      if (whatsappError || !whatsappNumber) {
        console.log(`⚠️ AI RULE 1: Número WhatsApp ${liviaConfig.whatsapp_number_id} não encontrado ou deletado`);
        return {
          shouldActivateAI: false,
          reason: 'whatsapp_number_not_found',
          liviaConfig
        };
      }

      if (whatsappNumber.status !== 'open') {
        console.log(`⚠️ AI RULE 1: Número WhatsApp ${whatsappNumber.phone_number} não está conectado (status: ${whatsappNumber.status})`);
        return {
          shouldActivateAI: false,
          reason: 'whatsapp_not_connected',
          liviaConfig
        };
      }

      console.log(`✅ AI RULE 1: Lívia ativa com WhatsApp ${whatsappNumber.phone_number} conectado → ai_active = true`);
      return {
        shouldActivateAI: true,
        reason: 'whatsapp_connected',
        liviaConfig
      };

    } catch (error) {
      console.error('❌ AI RULE 1: Erro ao verificar ativação da IA:', error);
      return {
        shouldActivateAI: false,
        reason: 'error',
        liviaConfig: null
      };
    }
  }

  /**
   * Atualiza o status da IA para todas as conversas de uma clínica
   * quando a configuração da Lívia muda
   * 
   * @param clinicId ID da clínica
   * @param newAIActive Novo status da IA
   * @param reason Motivo da mudança
   */
  async updateAllConversationsAIStatus(
    clinicId: number, 
    newAIActive: boolean, 
    reason: string
  ): Promise<{ updated: number; reason: string }> {
    try {
      console.log(`🔄 AI RULE 1: Atualizando status da IA para todas conversas da clínica ${clinicId} → ${newAIActive}`);

      const { data, error } = await this.supabase
        .from('conversations')
        .update({ 
          ai_active: newAIActive,
          updated_at: new Date().toISOString()
        })
        .eq('clinic_id', clinicId)
        .select('id');

      if (error) {
        console.error('❌ AI RULE 1: Erro ao atualizar conversas:', error);
        return { updated: 0, reason: 'update_error' };
      }

      const updatedCount = data?.length || 0;
      console.log(`✅ AI RULE 1: ${updatedCount} conversas atualizadas para ai_active = ${newAIActive} (motivo: ${reason})`);

      return { updated: updatedCount, reason };

    } catch (error) {
      console.error('❌ AI RULE 1: Erro ao atualizar conversas em massa:', error);
      return { updated: 0, reason: 'error' };
    }
  }

  /**
   * Aplica a Regra 1 quando a configuração da Lívia muda
   * Atualiza TODAS as conversas da clínica baseado na nova configuração
   * 
   * @param clinicId ID da clínica
   * @returns Resultado da aplicação
   */
  async applyRule1OnConfigChange(clinicId: number): Promise<{ success: boolean; updated: number; reason: string }> {
    try {
      console.log(`🔄 AI RULE 1: Aplicando Regra 1 após mudança de configuração da Lívia para clínica ${clinicId}`);
      
      const aiContext = await this.shouldActivateAI(clinicId);
      
      console.log(`🎯 AI RULE 1: Nova configuração determinada:`, {
        shouldActivate: aiContext.shouldActivateAI,
        reason: aiContext.reason
      });

      const result = await this.updateAllConversationsAIStatus(
        clinicId, 
        aiContext.shouldActivateAI, 
        `config_change_${aiContext.reason}`
      );

      return {
        success: result.updated >= 0,
        updated: result.updated,
        reason: result.reason
      };

    } catch (error) {
      console.error('❌ AI RULE 1: Erro ao aplicar regra após mudança de configuração:', error);
      return { success: false, updated: 0, reason: 'error' };
    }
  }
}

// Export singleton instance
export const aiActivationService = new AIActivationService();