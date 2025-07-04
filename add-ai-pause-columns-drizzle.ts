/**
 * Script para adicionar colunas AI Pause usando Drizzle ORM
 * Usa a mesma configuração de conexão do sistema para Supabase
 */

import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function addAiPauseColumns() {
  console.log('🚀 Iniciando migração das colunas AI PAUSE via Drizzle ORM...');
  
  try {
    console.log('📋 ETAPA 1: Adicionando coluna ai_paused_until...');
    
    await db.execute(sql`
      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS ai_paused_until TIMESTAMPTZ NULL
    `);
    
    console.log('✅ ai_paused_until adicionada');
    
    console.log('📋 ETAPA 2: Adicionando coluna ai_paused_by_user_id...');
    
    await db.execute(sql`
      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS ai_paused_by_user_id INTEGER NULL
    `);
    
    console.log('✅ ai_paused_by_user_id adicionada');
    
    console.log('📋 ETAPA 3: Adicionando coluna ai_pause_reason...');
    
    await db.execute(sql`
      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS ai_pause_reason VARCHAR(100) NULL
    `);
    
    console.log('✅ ai_pause_reason adicionada');
    
    console.log('📝 ETAPA 4: Adicionando comentários explicativos...');
    
    await db.execute(sql`
      COMMENT ON COLUMN conversations.ai_paused_until IS 'Data/hora até quando a IA deve ficar pausada automaticamente. NULL = não pausada'
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN conversations.ai_paused_by_user_id IS 'ID do usuário que causou a pausa automática da IA'
    `);
    
    await db.execute(sql`
      COMMENT ON COLUMN conversations.ai_pause_reason IS 'Motivo da pausa automática: manual_message, user_request, etc.'
    `);
    
    console.log('✅ Comentários adicionados');
    
    console.log('🔍 ETAPA 5: Criando índices de performance...');
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_conversations_ai_paused_clinic 
      ON conversations(clinic_id, ai_paused_until) 
      WHERE ai_paused_until IS NOT NULL
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_conversations_paused_by_user 
      ON conversations(ai_paused_by_user_id) 
      WHERE ai_paused_by_user_id IS NOT NULL
    `);
    
    console.log('✅ Índices criados');
    
    console.log('🔍 ETAPA 6: Verificando estrutura final...');
    
    // Testar se as colunas existem fazendo uma consulta
    const result = await db.execute(sql`
      SELECT ai_paused_until, ai_paused_by_user_id, ai_pause_reason, ai_active
      FROM conversations 
      LIMIT 1
    `);
    
    console.log('\n=== RESULTADO FINAL ===');
    console.log('✅ SUCESSO: Todas as colunas AI PAUSE foram criadas!');
    console.log('🎯 Sistema de pausa automática da IA está PRONTO!');
    console.log('📊 Exemplo de dados:', result[0] || 'Nenhuma conversa encontrada');
    
    // Verificar quantas conversas existem
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM conversations
    `);
    
    console.log(`📈 Total de conversas na base: ${countResult[0]?.total || 0}`);
    console.log('\n📋 Próximo passo: tsx test-ai-pause-system-complete.ts');
    
  } catch (error: any) {
    console.error('❌ ERRO na migração:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Algumas colunas já existiam, isso é normal.');
      console.log('🔍 Verificando se todas as colunas estão presentes...');
      
      try {
        const testResult = await db.execute(sql`
          SELECT ai_paused_until, ai_paused_by_user_id, ai_pause_reason 
          FROM conversations 
          LIMIT 1
        `);
        console.log('✅ Todas as colunas AI PAUSE estão funcionando!');
      } catch (testError: any) {
        console.log('❌ Erro ao testar colunas:', testError.message);
      }
    }
  }
}

// Executar migração
addAiPauseColumns();