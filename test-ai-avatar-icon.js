/**
 * Teste Visual: Ícone de Robô no Avatar da IA
 * Cria uma mensagem de teste da IA para validar que o ícone de robô aparece no avatar
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAiAvatarIcon() {
  console.log('🤖 =================');
  console.log('🤖 TESTE: Ícone de Robô no Avatar da IA');
  console.log('🤖 =================');
  
  try {
    // ETAPA 1: Encontrar uma conversa existente para adicionar mensagem de teste
    console.log('\n📋 ETAPA 1: Buscando conversa existente para teste');
    
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, clinic_id')
      .eq('clinic_id', 1)
      .limit(1);
    
    if (convError || !conversations || conversations.length === 0) {
      console.log('❌ Erro ao buscar conversas:', convError?.message || 'Nenhuma conversa encontrada');
      return;
    }
    
    const conversation = conversations[0];
    console.log(`✅ Conversa encontrada: ID ${conversation.id}`);
    
    // ETAPA 2: Criar mensagem de teste da IA com áudio
    console.log('\n📋 ETAPA 2: Criando mensagem de teste da IA');
    
    const testMessage = {
      conversation_id: conversation.id.toString(),
      content: 'Mensagem de áudio gerada pela IA - TESTE VISUAL',
      sender_type: 'ai',
      device_type: 'system',
      message_type: 'audio_voice',
      timestamp: new Date().toISOString()
    };
    
    const { data: newMessage, error: msgError } = await supabase
      .from('messages')
      .insert([testMessage])
      .select()
      .single();
    
    if (msgError) {
      console.log('❌ Erro ao criar mensagem:', msgError.message);
      return;
    }
    
    console.log(`✅ Mensagem da IA criada: ID ${newMessage.id}`);
    console.log('📊 Dados da mensagem:');
    console.log(`   • sender_type: '${newMessage.sender_type}'`);
    console.log(`   • device_type: '${newMessage.device_type}'`);
    console.log(`   • message_type: '${newMessage.message_type}'`);
    console.log(`   • content: "${newMessage.content}"`);
    
    // ETAPA 3: Verificar que a mensagem está no banco
    console.log('\n📋 ETAPA 3: Validando mensagem no banco de dados');
    
    const { data: verification, error: verifyError } = await supabase
      .from('messages')
      .select('id, sender_type, device_type, message_type, content')
      .eq('id', newMessage.id)
      .single();
    
    if (verifyError) {
      console.log('❌ Erro ao verificar mensagem:', verifyError.message);
      return;
    }
    
    console.log('✅ Mensagem verificada no banco:');
    console.log(`   • ID: ${verification.id}`);
    console.log(`   • sender_type: '${verification.sender_type}'`);
    console.log(`   • device_type: '${verification.device_type}'`);
    
    // ETAPA 4: Instruções para testar visualmente
    console.log('\n📋 ETAPA 4: Instruções para teste visual');
    console.log('🎯 Para ver o ícone de robô no avatar:');
    console.log(`1. Abra a conversa ID: ${conversation.id}`);
    console.log('2. Procure pela mensagem: "Mensagem de áudio gerada pela IA - TESTE VISUAL"');
    console.log('3. O avatar dessa mensagem deve mostrar um ícone de robô 🤖');
    console.log('4. Confirme que mensagens de pacientes ainda mostram a primeira letra do nome');
    
    console.log('\n✅ Teste criado com sucesso! Verifique visualmente na interface.');
    
    // ETAPA 5: Limpeza (opcional)
    console.log('\n📋 ETAPA 5: Limpeza (opcional)');
    console.log('💡 Para remover a mensagem de teste, execute:');
    console.log(`   DELETE FROM messages WHERE id = ${newMessage.id};`);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    throw error;
  }
}

// Executar teste
testAiAvatarIcon()
  .then(() => {
    console.log('\n🎉 Teste de avatar da IA concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Teste falhou:', error);
    process.exit(1);
  });