/**
 * ETAPA 2: Migração para Sistema de Pausa Automática da IA
 * Adiciona campos necessários para controlar quando a IA deve ficar pausada
 * devido a mensagens manuais de profissionais
 */
import { Client } from 'pg';

async function addAiPauseFields() {
  console.log('🔧 ETAPA 2: Iniciando migração de campos de pausa automática da IA...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ ETAPA 2: Conectado ao banco de dados');

    // Verificar se as colunas já existem
    console.log('🔍 ETAPA 2: Verificando colunas existentes...');
    const existingColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      AND column_name IN ('ai_paused_until', 'ai_paused_by_user_id', 'ai_pause_reason');
    `);
    
    console.log('🔍 ETAPA 2: Colunas encontradas:', existingColumns.rows.map(r => r.column_name));

    // 1. Adicionar coluna ai_paused_until (timestamp para controle de tempo)
    if (!existingColumns.rows.some(r => r.column_name === 'ai_paused_until')) {
      console.log('📝 ETAPA 2: Adicionando coluna ai_paused_until...');
      await client.query(`
        ALTER TABLE conversations 
        ADD COLUMN ai_paused_until TIMESTAMP DEFAULT NULL;
      `);
      console.log('✅ ETAPA 2: Coluna ai_paused_until adicionada');
    } else {
      console.log('⚠️ ETAPA 2: Coluna ai_paused_until já existe');
    }

    // 2. Adicionar coluna ai_paused_by_user_id (quem pausou)
    if (!existingColumns.rows.some(r => r.column_name === 'ai_paused_by_user_id')) {
      console.log('📝 ETAPA 2: Adicionando coluna ai_paused_by_user_id...');
      await client.query(`
        ALTER TABLE conversations 
        ADD COLUMN ai_paused_by_user_id INTEGER DEFAULT NULL;
      `);
      console.log('✅ ETAPA 2: Coluna ai_paused_by_user_id adicionada');
    } else {
      console.log('⚠️ ETAPA 2: Coluna ai_paused_by_user_id já existe');
    }

    // 3. Adicionar coluna ai_pause_reason (motivo da pausa)
    if (!existingColumns.rows.some(r => r.column_name === 'ai_pause_reason')) {
      console.log('📝 ETAPA 2: Adicionando coluna ai_pause_reason...');
      await client.query(`
        ALTER TABLE conversations 
        ADD COLUMN ai_pause_reason VARCHAR(100) DEFAULT NULL;
      `);
      console.log('✅ ETAPA 2: Coluna ai_pause_reason adicionada');
    } else {
      console.log('⚠️ ETAPA 2: Coluna ai_pause_reason já existe');
    }

    // 4. Criar índice para performance em consultas de pausa
    console.log('📝 ETAPA 2: Criando índice para performance...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_ai_paused 
      ON conversations(clinic_id, ai_paused_until) 
      WHERE ai_paused_until IS NOT NULL;
    `);
    console.log('✅ ETAPA 2: Índice idx_conversations_ai_paused criado');

    // 5. Verificar estrutura final
    console.log('🔍 ETAPA 2: Verificando estrutura final da tabela conversations...');
    const finalStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      AND column_name IN ('ai_active', 'ai_paused_until', 'ai_paused_by_user_id', 'ai_pause_reason')
      ORDER BY column_name;
    `);
    
    console.log('✅ ETAPA 2: Estrutura final:');
    finalStructure.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}, nullable: ${row.is_nullable}, default: ${row.column_default}`);
    });

    console.log('🎉 ETAPA 2: Migração de schema concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ ETAPA 2: Erro na migração:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 ETAPA 2: Conexão fechada');
  }
}

// Executar migração
addAiPauseFields().catch(console.error);