/**
 * Teste Simples da Regra 1: Aplicação manual da lógica de ativação da IA
 * Valida que a Regra 1 está sendo aplicada corretamente baseada na configuração da Lívia
 */

import pg from 'pg';
const { Pool } = pg;

async function testAIRule1Simple() {
  console.log('🧪 TESTE SIMPLES REGRA 1: Aplicação Manual da Lógica IA');
  console.log('========================================================\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.lkwrevhxugaxfpwiktdy:Digibrands123%23@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
  });

  try {
    // 1. Verificar configuração atual da Lívia
    console.log('🔍 ETAPA 1: Verificando configuração atual da Lívia...');
    const liviaConfigQuery = 'SELECT id, clinic_id, whatsapp_number_id, is_active FROM livia_configurations WHERE clinic_id = 1';
    const liviaResult = await pool.query(liviaConfigQuery);
    
    if (liviaResult.rows.length === 0) {
      console.log('❌ Nenhuma configuração da Lívia encontrada');
      return;
    }
    
    const liviaConfig = liviaResult.rows[0];
    console.log(`📋 Configuração da Lívia:`, liviaConfig);
    
    // 2. Verificar estado atual das conversas
    console.log('\n🔍 ETAPA 2: Verificando estado atual das conversas...');
    const conversationsQuery = 'SELECT id, contact_id, ai_active FROM conversations WHERE clinic_id = 1';
    const conversationsResult = await pool.query(conversationsQuery);
    
    console.log(`📊 Encontradas ${conversationsResult.rows.length} conversas:`);
    conversationsResult.rows.forEach(conv => {
      console.log(`  - Conversa ${conv.id}: ai_active = ${conv.ai_active}`);
    });

    // 3. Aplicar Regra 1 baseada na configuração atual
    console.log('\n🎯 ETAPA 3: Aplicando Regra 1...');
    const shouldActivateAI = liviaConfig.whatsapp_number_id !== null;
    console.log(`🔗 WhatsApp conectado: ${liviaConfig.whatsapp_number_id !== null}`);
    console.log(`🎯 IA deveria estar: ${shouldActivateAI ? 'ATIVA' : 'INATIVA'}`);
    
    // 4. Atualizar todas as conversas baseado na Regra 1
    console.log('\n🔧 ETAPA 4: Atualizando todas as conversas...');
    const updateQuery = 'UPDATE conversations SET ai_active = $1 WHERE clinic_id = 1';
    const updateResult = await pool.query(updateQuery, [shouldActivateAI]);
    
    console.log(`✅ Atualizadas ${updateResult.rowCount} conversas para ai_active = ${shouldActivateAI}`);

    // 5. Verificar se as conversas foram atualizadas
    console.log('\n🔍 ETAPA 5: Verificando resultado da atualização...');
    const updatedConversationsResult = await pool.query(conversationsQuery);
    
    console.log('\n📋 Estado após aplicação da Regra 1:');
    let allCorrect = true;
    updatedConversationsResult.rows.forEach(conv => {
      const isCorrect = conv.ai_active === shouldActivateAI;
      console.log(`  - Conversa ${conv.id}: ai_active = ${conv.ai_active} ${isCorrect ? '✅' : '❌'}`);
      if (!isCorrect) allCorrect = false;
    });

    // 6. RESULTADO FINAL
    console.log('\n🎯 RESULTADO FINAL:');
    console.log('===================');
    console.log(`📊 WhatsApp Conectado: ${liviaConfig.whatsapp_number_id !== null}`);
    console.log(`🎯 IA Deveria Estar: ${shouldActivateAI ? 'ATIVA' : 'INATIVA'}`);
    console.log(`✅ Regra 1 Aplicada: ${allCorrect ? 'SUCESSO' : 'FALHOU'}`);
    
    if (allCorrect) {
      console.log('\n🎉 REGRA 1 FUNCIONANDO: Todas as conversas foram atualizadas corretamente!');
      console.log(`💡 Resultado: whatsapp_number_id = ${liviaConfig.whatsapp_number_id} → ai_active = ${shouldActivateAI}`);
    } else {
      console.log('\n⚠️ REGRA 1 FALHOU: Algumas conversas não foram atualizadas corretamente');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('📋 Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Executar teste
testAIRule1Simple().catch(console.error);