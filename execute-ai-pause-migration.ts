/**
 * Script para executar migração das colunas AI Pause no Supabase
 * Adiciona as colunas: ai_paused_until, ai_paused_by_user_id, ai_pause_reason
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeAiPauseMigration() {
  console.log('🚀 Iniciando migração das colunas AI PAUSE...');
  
  try {
    console.log('📋 ETAPA 1: Adicionando coluna ai_paused_until...');
    
    // 1. Adicionar ai_paused_until
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_until TIMESTAMPTZ NULL;'
    });
    
    if (error1) {
      console.log('⚠️ Tentativa RPC falhou, usando approach manual...');
    } else {
      console.log('✅ ai_paused_until adicionada');
    }
    
    console.log('📋 ETAPA 2: Adicionando coluna ai_paused_by_user_id...');
    
    // 2. Adicionar ai_paused_by_user_id  
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_by_user_id INTEGER NULL;'
    });
    
    if (!error2) {
      console.log('✅ ai_paused_by_user_id adicionada');
    }
    
    console.log('📋 ETAPA 3: Adicionando coluna ai_pause_reason...');
    
    // 3. Adicionar ai_pause_reason
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_pause_reason VARCHAR(50) NULL;'
    });
    
    if (!error3) {
      console.log('✅ ai_pause_reason adicionada');
    }
    
    // Se RPC não funcionou, tentar abordagem direta
    if (error1 || error2 || error3) {
      console.log('🔄 Tentando abordagem alternativa...');
      
      // Executar usando query raw
      const { data, error } = await supabase
        .from('conversations')
        .select('id, ai_paused_until, ai_paused_by_user_id, ai_pause_reason')
        .limit(1);
        
      if (error && error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Colunas ainda não existem, migração necessária via painel Supabase');
        console.log('📋 Execute estes comandos no SQL Editor do Supabase:');
        console.log('');
        console.log('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_until TIMESTAMPTZ NULL;');
        console.log('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_by_user_id INTEGER NULL;');
        console.log('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_pause_reason VARCHAR(50) NULL;');
        console.log('');
        return;
      }
    }
    
    console.log('🔍 ETAPA 4: Verificando estrutura final...');
    
    // Verificar se as colunas foram criadas
    const { data: verification, error: verifyError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    if (verifyError) {
      throw new Error(`Erro na verificação: ${verifyError.message}`);
    }
    
    const allColumns = Object.keys(verification[0] || {});
    const aiPauseColumns = allColumns.filter(col => col.includes('ai_pause'));
    
    console.log('\n=== RESULTADO FINAL ===');
    if (aiPauseColumns.length === 3) {
      console.log('✅ SUCESSO: Todas as 3 colunas AI PAUSE foram criadas:');
      aiPauseColumns.forEach(col => console.log(`  - ${col}`));
      console.log('\n🎯 Sistema de pausa automática da IA está PRONTO!');
      console.log('📋 Próximo passo: Executar teste com "tsx test-ai-pause-system-complete.ts"');
    } else if (aiPauseColumns.length > 0) {
      console.log(`⚠️ PARCIAL: ${aiPauseColumns.length}/3 colunas criadas:`, aiPauseColumns.join(', '));
      console.log('❌ Migração incompleta - execute comandos SQL manualmente');
    } else {
      console.log('❌ FALHA: Nenhuma coluna AI PAUSE encontrada');
      console.log('📋 Execute os comandos SQL no painel do Supabase');
    }
    
    console.log(`\nTotal de colunas na tabela: ${allColumns.length}`);
    
  } catch (error: any) {
    console.error('❌ ERRO na migração:', error.message);
    console.log('\n📋 Comandos SQL para executar manualmente no Supabase:');
    console.log('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_until TIMESTAMPTZ NULL;');
    console.log('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_by_user_id INTEGER NULL;');
    console.log('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_pause_reason VARCHAR(50) NULL;');
  }
}

// Executar migração
executeAiPauseMigration();