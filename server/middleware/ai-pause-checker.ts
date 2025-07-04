/**
 * Middleware para verificar e reativar AI quando pausa automática expira
 * Conecta ai_paused_until com ai_active para N8N
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function checkAndReactivateExpiredAiPause() {
  try {
    console.log('🔄 Verificando conversas com pausa de IA expirada...');
    
    // Buscar conversas onde IA está pausada mas o tempo já expirou
    // CORREÇÃO: Só reativar pausas automáticas (reason='manual_message'), não manuais (reason='manual')
    const { data: expiredPauses, error } = await supabase
      .from('conversations')
      .select('id, ai_paused_until, ai_active, ai_pause_reason')
      .eq('ai_active', false) // AI está desativada
      .not('ai_paused_until', 'is', null) // Tem pausa configurada
      .eq('ai_pause_reason', 'manual_message') // APENAS pausas automáticas
      .lt('ai_paused_until', new Date().toISOString()); // Pausa já expirou
    
    if (error) {
      console.error('❌ Erro ao buscar pausas expiradas:', error);
      return;
    }
    
    if (!expiredPauses || expiredPauses.length === 0) {
      console.log('ℹ️ Nenhuma pausa de IA expirada encontrada');
      return;
    }
    
    console.log(`🔄 Encontradas ${expiredPauses.length} pausas expiradas para reativar`);
    
    // Reativar IA para conversas com pausa expirada
    for (const conversation of expiredPauses) {
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          ai_active: true, // ✅ Reativar IA para N8N
          ai_paused_until: null,
          ai_pause_reason: null,
          ai_paused_by_user_id: null
        })
        .eq('id', conversation.id);
      
      if (updateError) {
        console.error(`❌ Erro ao reativar IA para conversa ${conversation.id}:`, updateError);
      } else {
        console.log(`✅ IA reativada para conversa ${conversation.id} (pausa expirou)`);

        // Invalidar cache para forçar atualização no frontend
        const memoryCacheService = require('../cache/memory-cache.service');
        const cachePattern = `conversation:${conversation.id}:`;
        const deletedKeys = memoryCacheService.deletePattern(cachePattern);
        console.log('🧹 Cache invalidated after auto-reactivation, deleted keys:', deletedKeys);

        // Broadcast WebSocket para notificar frontend em tempo real
        try {
          const io = require('../websocket/websocket-server').getSocketServer();
          if (io) {
            io.to(`clinic_1`).emit('ai_reactivated', {
              conversation_id: conversation.id,
              ai_active: true,
              timestamp: new Date().toISOString()
            });
            console.log('📡 WebSocket notification sent for AI reactivation:', conversation.id);
          }
        } catch (wsError) {
          console.log('⚠️ WebSocket notification failed (fallback to polling):', wsError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no verificador de pausa de IA:', error);
  }
}

// Executar verificação a cada 30 segundos
export function startAiPauseChecker() {
  console.log('🚀 Iniciando verificador automático de pausa de IA...');
  
  // Execução inicial
  checkAndReactivateExpiredAiPause();
  
  // Execução periódica a cada 30 segundos
  setInterval(checkAndReactivateExpiredAiPause, 30000);
}