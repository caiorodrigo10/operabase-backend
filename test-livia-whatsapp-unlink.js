/**
 * Teste: Desvinculamento do WhatsApp na Configuração da Lívia
 * Valida que whatsapp_number_id é definido como null quando não selecionado
 */

import { getStorage } from './server/storage.js';

async function testLiviaWhatsAppUnlink() {
  console.log('🧪 Teste: Desvinculamento WhatsApp na Configuração da Lívia');
  console.log('='.repeat(60));
  
  try {
    const storage = await getStorage();
    
    // 1. Verificar configuração atual da Lívia
    console.log('\n📋 ETAPA 1: Verificando configuração atual da Lívia');
    const currentConfig = await storage.getLiviaConfiguration(1);
    
    if (!currentConfig) {
      console.log('❌ Nenhuma configuração da Lívia encontrada');
      return;
    }
    
    console.log(`📱 WhatsApp Number ID atual: ${currentConfig.whatsapp_number_id}`);
    console.log(`🔗 Status: ${currentConfig.whatsapp_number_id ? 'VINCULADO' : 'DESVINCULADO'}`);
    
    // 2. Simular desvinculamento (setando para null)
    console.log('\n🔗 ETAPA 2: Simulando desvinculamento do WhatsApp');
    
    const updateData = {
      clinic_id: 1,
      whatsapp_number_id: null,
      general_prompt: currentConfig.general_prompt,
      off_duration: currentConfig.off_duration,
      off_unit: currentConfig.off_unit,
      selected_professional_ids: currentConfig.selected_professional_ids,
      connected_knowledge_base_ids: currentConfig.connected_knowledge_base_ids,
      is_active: currentConfig.is_active
    };
    
    console.log('📝 Dados de atualização:', JSON.stringify(updateData, null, 2));
    
    const updatedConfig = await storage.updateLiviaConfiguration(1, updateData);
    
    if (!updatedConfig) {
      console.log('❌ Falha ao atualizar configuração');
      return;
    }
    
    console.log('✅ Configuração atualizada com sucesso');
    console.log(`📱 Novo WhatsApp Number ID: ${updatedConfig.whatsapp_number_id}`);
    
    // 3. Verificar se desvinculamento funcionou
    console.log('\n🔍 ETAPA 3: Verificando desvinculamento');
    
    const verifyConfig = await storage.getLiviaConfiguration(1);
    
    if (verifyConfig.whatsapp_number_id === null) {
      console.log('✅ SUCESSO: WhatsApp desvinculado corretamente');
      console.log('✅ whatsapp_number_id = null no banco de dados');
    } else {
      console.log('❌ FALHA: WhatsApp ainda vinculado');
      console.log(`❌ whatsapp_number_id = ${verifyConfig.whatsapp_number_id}`);
    }
    
    // 4. Testar diferentes cenários de desvinculamento
    console.log('\n🧪 ETAPA 4: Testando cenários de desvinculamento');
    
    const testCases = [
      { name: 'String vazia', value: '' },
      { name: 'Undefined', value: undefined },
      { name: 'Null explícito', value: null },
      { name: 'String "null"', value: 'null' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🔸 Testando: ${testCase.name} (${testCase.value})`);
      
      try {
        const testUpdateData = {
          ...updateData,
          whatsapp_number_id: testCase.value
        };
        
        const testResult = await storage.updateLiviaConfiguration(1, testUpdateData);
        
        if (testResult && testResult.whatsapp_number_id === null) {
          console.log(`  ✅ ${testCase.name}: Desvinculamento funcionou`);
        } else {
          console.log(`  ❌ ${testCase.name}: Desvinculamento falhou`);
          console.log(`  📱 Resultado: ${testResult?.whatsapp_number_id}`);
        }
      } catch (error) {
        console.log(`  ❌ ${testCase.name}: Erro - ${error.message}`);
      }
    }
    
    // 5. Testar revinculamento (para confirmar que vinculação ainda funciona)
    console.log('\n🔗 ETAPA 5: Testando revinculamento');
    
    // Buscar um número WhatsApp ativo para testar
    const whatsappNumbers = await storage.getWhatsAppNumbers(1);
    const activeNumber = whatsappNumbers.find(n => n.status === 'open');
    
    if (activeNumber) {
      console.log(`📱 Testando revinculamento com número: ${activeNumber.phone_number} (ID: ${activeNumber.id})`);
      
      const relinkData = {
        ...updateData,
        whatsapp_number_id: activeNumber.id
      };
      
      const relinkedConfig = await storage.updateLiviaConfiguration(1, relinkData);
      
      if (relinkedConfig && relinkedConfig.whatsapp_number_id === activeNumber.id) {
        console.log('✅ Revinculamento funcionou corretamente');
        
        // Desvincular novamente para deixar limpo
        const finalUnlinkData = {
          ...updateData,
          whatsapp_number_id: null
        };
        
        await storage.updateLiviaConfiguration(1, finalUnlinkData);
        console.log('🧹 Desvinculado novamente para limpeza');
      } else {
        console.log('❌ Revinculamento falhou');
      }
    } else {
      console.log('⚠️ Nenhum número WhatsApp ativo encontrado para teste de revinculamento');
    }
    
    // 6. Resumo dos resultados
    console.log('\n📊 RESUMO DO TESTE');
    console.log('='.repeat(50));
    
    const finalConfig = await storage.getLiviaConfiguration(1);
    
    const testResults = {
      'Configuração Lívia existe': finalConfig ? '✅' : '❌',
      'Desvinculamento null funciona': finalConfig?.whatsapp_number_id === null ? '✅' : '❌',
      'Schema aceita null': 'Testado nos cenários acima',
      'Update preserva outras configurações': finalConfig?.general_prompt ? '✅' : '❌'
    };
    
    Object.entries(testResults).forEach(([test, result]) => {
      console.log(`  ${test}: ${result}`);
    });
    
    if (finalConfig?.whatsapp_number_id === null) {
      console.log('\n🎉 TESTE PASSOU: Sistema de desvinculamento funcionando corretamente');
      console.log('✅ whatsapp_number_id agora é null quando nenhum número é selecionado');
    } else {
      console.log('\n❌ TESTE FALHOU: Sistema ainda não desvíncula corretamente');
      console.log(`❌ whatsapp_number_id = ${finalConfig?.whatsapp_number_id}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    throw error;
  }
}

// Executar teste
testLiviaWhatsAppUnlink()
  .then(() => {
    console.log('\n🎉 Teste de desvinculamento finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Teste falhou:', error);
    process.exit(1);
  });

export { testLiviaWhatsAppUnlink };