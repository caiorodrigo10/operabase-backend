/**
 * ETAPA 2: Migração Direta - Sistema de Pausa Automática da IA
 * Adiciona campos usando SQL direto via Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addAiPauseFieldsDirect() {
  console.log('🚀 ETAPA 2: Migração direta - Sistema de Pausa Automática da IA');
  console.log('📝 Adicionando campos: ai_paused_until, ai_paused_by_user_id, ai_pause_reason');
  console.log('');

  try {
    // Usar REST API para executar SQL direto
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        sql: `
          -- Adicionar ai_paused_until
          ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_until TIMESTAMPTZ NULL;
          
          -- Adicionar ai_paused_by_user_id  
          ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_by_user_id INTEGER NULL;
          
          -- Adicionar ai_pause_reason
          ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_pause_reason VARCHAR(50) NULL;
          
          -- Comentários
          COMMENT ON COLUMN conversations.ai_paused_until IS 'Data/hora até quando a IA deve ficar pausada automaticamente. NULL = não pausada';
          COMMENT ON COLUMN conversations.ai_paused_by_user_id IS 'ID do usuário que causou a pausa automática da IA';
          COMMENT ON COLUMN conversations.ai_pause_reason IS 'Motivo da pausa automática: manual_message, user_request, etc.';
          
          -- Índices de performance
          CREATE INDEX IF NOT EXISTS idx_conversations_ai_paused_clinic 
          ON conversations(clinic_id, ai_paused_until) 
          WHERE ai_paused_until IS NOT NULL;
          
          CREATE INDEX IF NOT EXISTS idx_conversations_paused_by_user 
          ON conversations(ai_paused_by_user_id) 
          WHERE ai_paused_by_user_id IS NOT NULL;
        `
      })
    });

    if (!response.ok) {
      console.log('⚠️ RPC exec_sql não disponível, tentando método alternativo...');
      
      // Método alternativo: usar fetch direto para Edge Functions
      const altResponse = await fetch(`${supabaseUrl}/functions/v1/sql-migration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_until TIMESTAMPTZ NULL;
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_by_user_id INTEGER NULL;
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_pause_reason VARCHAR(50) NULL;
          `
        })
      });

      if (!altResponse.ok) {
        console.log('⚠️ Edge Functions também não disponível, usando método de teste direto...');
        
        // Método de teste: tentar executar query simples para verificar se as colunas existem
        const { data: testResult, error: testError } = await supabase
          .from('conversations')
          .select('id, ai_active, ai_paused_until, ai_paused_by_user_id, ai_pause_reason')
          .limit(1);
        
        if (testError && testError.message.includes('does not exist')) {
          console.log('❌ Colunas não existem ainda. Será necessário executar a migração manualmente.');
          console.log('');
          console.log('🔧 Execute os seguintes comandos SQL no painel do Supabase:');
          console.log('');
          console.log('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_until TIMESTAMPTZ NULL;');
          console.log('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_by_user_id INTEGER NULL;');
          console.log('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_pause_reason VARCHAR(50) NULL;');
          console.log('');
          console.log('CREATE INDEX IF NOT EXISTS idx_conversations_ai_paused_clinic ON conversations(clinic_id, ai_paused_until) WHERE ai_paused_until IS NOT NULL;');
          console.log('CREATE INDEX IF NOT EXISTS idx_conversations_paused_by_user ON conversations(ai_paused_by_user_id) WHERE ai_paused_by_user_id IS NOT NULL;');
          console.log('');
          
          return false;
        } else if (testResult && testResult.length > 0) {
          console.log('✅ Colunas já existem! Migração foi executada anteriormente');
          console.log('📊 Estrutura verificada:', Object.keys(testResult[0]));
          return true;
        }
      } else {
        console.log('✅ Migração executada via Edge Functions');
        return true;
      }
    } else {
      console.log('✅ Migração executada via RPC exec_sql');
      return true;
    }

    // Verificar se a migração funcionou
    console.log('🔍 Verificando resultado da migração...');
    
    const { data: verifyResult, error: verifyError } = await supabase
      .from('conversations')
      .select('id, ai_active, ai_paused_until, ai_paused_by_user_id, ai_pause_reason')
      .limit(1);
    
    if (verifyError) {
      console.log('❌ Erro na verificação:', verifyError.message);
      return false;
    } else {
      console.log('✅ Migração bem-sucedida! Colunas disponíveis:');
      console.log('📊 Campos da conversa:', Object.keys(verifyResult[0] || {}));
      
      console.log('');
      console.log('🎉 ETAPA 2 CONCLUÍDA: Sistema de Pausa Automática da IA');
      console.log('📊 Campos adicionados:');
      console.log('   ✅ ai_paused_until: controla pausa automática por tempo');
      console.log('   ✅ ai_paused_by_user_id: rastreia quem causou a pausa');
      console.log('   ✅ ai_pause_reason: registra motivo da pausa');
      console.log('   ✅ ai_active: controle manual existente (preservado)');
      console.log('');
      console.log('🧠 Lógica integrada:');
      console.log('   - IA responde somente quando: ai_active = true E ai_paused_until é null/passado');
      console.log('   - Botão IA controla ai_active (usuário)');
      console.log('   - Mensagens manuais de profissionais pausam automaticamente (ai_paused_until)');
      
      return true;
    }

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return false;
  }
}

// Executar migração se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  addAiPauseFieldsDirect()
    .then((success) => {
      if (success) {
        console.log('✅ Migração concluída com sucesso!');
        process.exit(0);
      } else {
        console.log('⚠️ Migração precisa ser executada manualmente');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Falha na migração:', error);
      process.exit(1);
    });
}

export { addAiPauseFieldsDirect };