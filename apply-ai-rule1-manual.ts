/**
 * Script para aplicar manualmente a Regra 1 da IA usando Drizzle ORM
 * Aplica a lógica: whatsapp_number_id = null → ai_active = false
 *                whatsapp_number_id = ID_válido → ai_active = true
 */

import { db } from './server/db';
import { conversations, livia_configurations } from './shared/schema';
import { eq } from 'drizzle-orm';

async function applyAIRule1Manual() {
  console.log('🧪 APLICAÇÃO MANUAL REGRA 1: Sistema de Ativação Automática da IA');
  console.log('====================================================================\n');

  try {
    // 1. Verificar configuração atual da Lívia
    console.log('🔍 ETAPA 1: Verificando configuração atual da Lívia...');
    const liviaConfig = await db
      .select()
      .from(livia_configurations)
      .where(eq(livia_configurations.clinic_id, 1))
      .limit(1);

    if (liviaConfig.length === 0) {
      console.log('❌ Nenhuma configuração da Lívia encontrada para clínica 1');
      return;
    }

    const config = liviaConfig[0];
    console.log('📋 Configuração da Lívia:');
    console.log(`   - ID: ${config.id}`);
    console.log(`   - Clínica: ${config.clinic_id}`);
    console.log(`   - WhatsApp ID: ${config.whatsapp_number_id}`);
    console.log(`   - Ativa: ${config.is_active}`);

    // 2. Verificar estado atual das conversas
    console.log('\n🔍 ETAPA 2: Verificando estado atual das conversas...');
    const currentConversations = await db
      .select({
        id: conversations.id,
        contact_id: conversations.contact_id,
        ai_active: conversations.ai_active
      })
      .from(conversations)
      .where(eq(conversations.clinic_id, 1));

    console.log(`📊 Encontradas ${currentConversations.length} conversas:`);
    currentConversations.forEach(conv => {
      console.log(`   - Conversa ${conv.id}: ai_active = ${conv.ai_active}`);
    });

    // 3. Aplicar Regra 1
    console.log('\n🎯 ETAPA 3: Aplicando Regra 1...');
    const shouldActivateAI = config.whatsapp_number_id !== null;
    console.log(`🔗 WhatsApp conectado: ${config.whatsapp_number_id !== null}`);
    console.log(`🎯 IA deveria estar: ${shouldActivateAI ? 'ATIVA (true)' : 'INATIVA (false)'}`);

    // 4. Atualizar todas as conversas
    console.log('\n🔧 ETAPA 4: Atualizando todas as conversas...');
    const updateResult = await db
      .update(conversations)
      .set({ ai_active: shouldActivateAI })
      .where(eq(conversations.clinic_id, 1));

    console.log(`✅ Comando de atualização executado`);

    // 5. Verificar resultado
    console.log('\n🔍 ETAPA 5: Verificando resultado da atualização...');
    const updatedConversations = await db
      .select({
        id: conversations.id,
        contact_id: conversations.contact_id,
        ai_active: conversations.ai_active
      })
      .from(conversations)
      .where(eq(conversations.clinic_id, 1));

    console.log('\n📋 Estado após aplicação da Regra 1:');
    let allCorrect = true;
    updatedConversations.forEach(conv => {
      const isCorrect = conv.ai_active === shouldActivateAI;
      console.log(`   - Conversa ${conv.id}: ai_active = ${conv.ai_active} ${isCorrect ? '✅' : '❌'}`);
      if (!isCorrect) allCorrect = false;
    });

    // 6. RESULTADO FINAL
    console.log('\n🎯 RESULTADO FINAL:');
    console.log('===================');
    console.log(`📊 WhatsApp Conectado: ${config.whatsapp_number_id !== null}`);
    console.log(`🔗 WhatsApp Number ID: ${config.whatsapp_number_id}`);
    console.log(`🎯 IA Deveria Estar: ${shouldActivateAI ? 'ATIVA' : 'INATIVA'}`);
    console.log(`✅ Regra 1 Aplicada: ${allCorrect ? 'SUCESSO' : 'FALHOU'}`);
    console.log(`📊 Total Conversas: ${updatedConversations.length}`);
    
    if (allCorrect) {
      console.log('\n🎉 REGRA 1 APLICADA COM SUCESSO!');
      console.log(`💡 Resultado: whatsapp_number_id = ${config.whatsapp_number_id} → ai_active = ${shouldActivateAI}`);
      console.log('📱 Agora todas as conversas seguem a configuração da Lívia');
    } else {
      console.log('\n⚠️ REGRA 1 FALHOU: Algumas conversas não foram atualizadas');
      console.log('💡 Verificar logs do Drizzle ORM para possíveis erros');
    }

  } catch (error) {
    console.error('❌ Erro durante aplicação da Regra 1:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

// Executar aplicação manual
applyAIRule1Manual().catch(console.error);