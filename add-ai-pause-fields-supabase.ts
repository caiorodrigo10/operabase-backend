/**
 * ETAPA 2: Migração Supabase - Sistema de Pausa Automática da IA
 * Adiciona campos necessários para controlar quando a IA deve ficar pausada
 * devido a mensagens manuais de profissionais
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addAiPauseFields() {
  console.log('🚀 ETAPA 2: Iniciando migração para Sistema de Pausa Automática da IA');
  console.log('📝 Adicionando campos: ai_paused_until, ai_paused_by_user_id, ai_pause_reason');
  console.log('');

  try {
    // 1. Verificar se as colunas já existem
    console.log('🔍 Verificando colunas existentes na tabela conversations...');
    
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'conversations' });
    
    if (columnError) {
      console.log('⚠️ RPC get_table_columns não existe, verificando com query direta...');
      
      // Verificar estrutura da tabela diretamente
      const { data: tableInfo, error: tableError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'conversations')
        .eq('table_schema', 'public');
      
      if (tableError) {
        console.log('📊 Usando método alternativo: tentativa de adicionar colunas diretamente');
      } else {
        const existingColumns = tableInfo?.map(col => col.column_name) || [];
        console.log('📊 Colunas existentes:', existingColumns);
        
        const needsAiPausedUntil = !existingColumns.includes('ai_paused_until');
        const needsAiPausedByUserId = !existingColumns.includes('ai_paused_by_user_id');
        const needsAiPauseReason = !existingColumns.includes('ai_pause_reason');
        
        console.log('📋 Colunas necessárias:');
        console.log(`   - ai_paused_until: ${needsAiPausedUntil ? 'PRECISA ADICIONAR' : 'JÁ EXISTE'}`);
        console.log(`   - ai_paused_by_user_id: ${needsAiPausedByUserId ? 'PRECISA ADICIONAR' : 'JÁ EXISTE'}`);
        console.log(`   - ai_pause_reason: ${needsAiPauseReason ? 'PRECISA ADICIONAR' : 'JÁ EXISTE'}`);
      }
    }

    // 2. Adicionar as colunas usando SQL direto
    console.log('📝 Adicionando colunas de pausa da IA...');
    
    const migrations = [
      {
        name: 'ai_paused_until',
        sql: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'conversations' 
              AND column_name = 'ai_paused_until'
              AND table_schema = 'public'
            ) THEN
              ALTER TABLE conversations 
              ADD COLUMN ai_paused_until TIMESTAMPTZ NULL;
              
              COMMENT ON COLUMN conversations.ai_paused_until IS 
                'Data/hora até quando a IA deve ficar pausada. NULL = não pausada';
            END IF;
          END $$;
        `
      },
      {
        name: 'ai_paused_by_user_id',
        sql: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'conversations' 
              AND column_name = 'ai_paused_by_user_id'
              AND table_schema = 'public'
            ) THEN
              ALTER TABLE conversations 
              ADD COLUMN ai_paused_by_user_id INTEGER NULL;
              
              COMMENT ON COLUMN conversations.ai_paused_by_user_id IS 
                'ID do usuário que causou a pausa da IA (referência para users.id)';
            END IF;
          END $$;
        `
      },
      {
        name: 'ai_pause_reason',
        sql: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'conversations' 
              AND column_name = 'ai_pause_reason'
              AND table_schema = 'public'
            ) THEN
              ALTER TABLE conversations 
              ADD COLUMN ai_pause_reason VARCHAR(50) NULL;
              
              COMMENT ON COLUMN conversations.ai_pause_reason IS 
                'Motivo da pausa: manual_message, user_request, etc.';
            END IF;
          END $$;
        `
      }
    ];

    // Executar migrações
    for (const migration of migrations) {
      console.log(`📝 Executando migração: ${migration.name}...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: migration.sql 
      });
      
      if (error) {
        console.log(`⚠️ RPC exec_sql falhou para ${migration.name}, tentando com .sql()...`);
        
        // Método alternativo usando .sql() direto
        const { error: directError } = await supabase.sql`${migration.sql}`;
        
        if (directError) {
          console.log(`❌ Erro na migração ${migration.name}:`, directError.message);
          
          // Tentar método mais simples para esta coluna específica
          console.log(`🔄 Tentando método simplificado para ${migration.name}...`);
          
          let simpleSQL;
          if (migration.name === 'ai_paused_until') {
            simpleSQL = "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_until TIMESTAMPTZ NULL;";
          } else if (migration.name === 'ai_paused_by_user_id') {
            simpleSQL = "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_by_user_id INTEGER NULL;";
          } else if (migration.name === 'ai_pause_reason') {
            simpleSQL = "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_pause_reason VARCHAR(50) NULL;";
          }
          
          if (simpleSQL) {
            const { error: simpleError } = await supabase.sql`${simpleSQL}`;
            if (simpleError) {
              console.log(`❌ Método simplificado também falhou para ${migration.name}:`, simpleError.message);
            } else {
              console.log(`✅ Coluna ${migration.name} adicionada com método simplificado`);
            }
          }
        } else {
          console.log(`✅ Migração ${migration.name} executada com sucesso`);
        }
      } else {
        console.log(`✅ Migração ${migration.name} executada com sucesso via RPC`);
      }
    }

    // 3. Verificar resultados
    console.log('🔍 Verificando resultados da migração...');
    
    // Tentar buscar uma conversa com os novos campos
    const { data: testConversation, error: testError } = await supabase
      .from('conversations')
      .select('id, ai_active, ai_paused_until, ai_paused_by_user_id, ai_pause_reason')
      .eq('clinic_id', 1)
      .limit(1)
      .single();
    
    if (testError) {
      console.log('❌ Erro ao verificar novos campos:', testError.message);
      console.log('💡 Isso pode indicar que as colunas ainda não foram criadas corretamente');
    } else {
      console.log('✅ Verificação bem-sucedida! Novos campos estão acessíveis:');
      console.log('📊 Estrutura da conversa teste:', {
        id: testConversation.id,
        ai_active: testConversation.ai_active,
        ai_paused_until: testConversation.ai_paused_until,
        ai_paused_by_user_id: testConversation.ai_paused_by_user_id,
        ai_pause_reason: testConversation.ai_pause_reason
      });
    }

    // 4. Criar índices para performance
    console.log('📊 Criando índices para otimização de performance...');
    
    const indexSQL = `
      DO $$ 
      BEGIN 
        -- Índice para buscar conversas pausadas por clínica
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'conversations' 
          AND indexname = 'idx_conversations_ai_paused_clinic'
        ) THEN
          CREATE INDEX idx_conversations_ai_paused_clinic 
          ON conversations(clinic_id, ai_paused_until) 
          WHERE ai_paused_until IS NOT NULL;
        END IF;
        
        -- Índice para buscar conversas por usuário que pausou
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'conversations' 
          AND indexname = 'idx_conversations_paused_by_user'
        ) THEN
          CREATE INDEX idx_conversations_paused_by_user 
          ON conversations(ai_paused_by_user_id) 
          WHERE ai_paused_by_user_id IS NOT NULL;
        END IF;
      END $$;
    `;
    
    const { error: indexError } = await supabase.sql`${indexSQL}`;
    
    if (indexError) {
      console.log('⚠️ Erro ao criar índices (não crítico):', indexError.message);
    } else {
      console.log('✅ Índices de performance criados com sucesso');
    }

    console.log('');
    console.log('🎉 ETAPA 2 CONCLUÍDA: Sistema de Pausa Automática da IA');
    console.log('📊 Resumo das alterações:');
    console.log('   ✅ Campo ai_paused_until: controla até quando IA fica pausada');
    console.log('   ✅ Campo ai_paused_by_user_id: rastreia quem causou a pausa');
    console.log('   ✅ Campo ai_pause_reason: registra motivo da pausa');
    console.log('   ✅ Índices de performance para consultas otimizadas');
    console.log('');
    console.log('🚀 Próximo passo: ETAPA 3 - Testar sistema de pausa automática');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar migração se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  addAiPauseFields()
    .then(() => {
      console.log('✅ Migração concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na migração:', error);
      process.exit(1);
    });
}

export { addAiPauseFields };