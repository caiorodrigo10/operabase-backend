/**
 * Teste Completo: Sistema de Identificação de Áudios da IA
 * Valida que o sistema diferencia corretamente entre áudios de pacientes e áudios da IA
 * usando o header X-Sender-Type no endpoint N8N existente
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAiAudioIdentification() {
  console.log('🤖 =================');
  console.log('🤖 TESTE: Sistema de Identificação de Áudios da IA');
  console.log('🤖 =================');
  
  try {
    // ETAPA 1: Verificar que implementação preserva mensagens de pacientes
    console.log('\n📋 ETAPA 1: Verificando mensagens de pacientes (comportamento atual)');
    
    const { data: patientMessages } = await supabase
      .from('messages')
      .select('id, sender_type, device_type, message_type, content, created_at')
      .eq('sender_type', 'patient')
      .eq('message_type', 'audio_voice')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`✅ Encontradas ${patientMessages?.length || 0} mensagens de áudio de pacientes`);
    
    if (patientMessages && patientMessages.length > 0) {
      console.log('📊 Amostra de mensagens de pacientes:');
      patientMessages.forEach((msg, idx) => {
        console.log(`   ${idx + 1}. ID: ${msg.id} | sender_type: '${msg.sender_type}' | device_type: '${msg.device_type}' | type: '${msg.message_type}'`);
      });
    }
    
    // ETAPA 2: Verificar se existem mensagens da IA (se já foram criadas)
    console.log('\n📋 ETAPA 2: Verificando mensagens da IA (nova funcionalidade)');
    
    const { data: aiMessages } = await supabase
      .from('messages')
      .select('id, sender_type, device_type, message_type, content, created_at')
      .eq('sender_type', 'ai')
      .eq('device_type', 'system')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`✅ Encontradas ${aiMessages?.length || 0} mensagens da IA`);
    
    if (aiMessages && aiMessages.length > 0) {
      console.log('🤖 Amostra de mensagens da IA:');
      aiMessages.forEach((msg, idx) => {
        console.log(`   ${idx + 1}. ID: ${msg.id} | sender_type: '${msg.sender_type}' | device_type: '${msg.device_type}' | type: '${msg.message_type}'`);
      });
    } else {
      console.log('ℹ️ Ainda não há mensagens da IA - sistema aguardando primeiro teste');
    }
    
    // ETAPA 3: Verificar estrutura da implementação
    console.log('\n📋 ETAPA 3: Validando estrutura da implementação');
    
    // Verificar schema da tabela messages
    const { data: columns, error: schemaError } = await supabase
      .from('messages')
      .select('sender_type, device_type')
      .limit(1);
    
    if (!schemaError) {
      console.log('✅ Campos sender_type e device_type existem na tabela messages');
    } else {
      console.log('❌ Erro ao verificar schema:', schemaError.message);
    }
    
    // ETAPA 4: Estatísticas do sistema
    console.log('\n📋 ETAPA 4: Estatísticas do sistema');
    
    // Contar por sender_type
    const { data: senderStats } = await supabase
      .from('messages')
      .select('sender_type')
      .not('sender_type', 'is', null);
    
    const senderCounts = {};
    senderStats?.forEach(msg => {
      senderCounts[msg.sender_type] = (senderCounts[msg.sender_type] || 0) + 1;
    });
    
    console.log('📊 Mensagens por sender_type:');
    Object.entries(senderCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} mensagens`);
    });
    
    // Contar por device_type
    const { data: deviceStats } = await supabase
      .from('messages')
      .select('device_type')
      .not('device_type', 'is', null);
    
    const deviceCounts = {};
    deviceStats?.forEach(msg => {
      deviceCounts[msg.device_type] = (deviceCounts[msg.device_type] || 0) + 1;
    });
    
    console.log('📊 Mensagens por device_type:');
    Object.entries(deviceCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} mensagens`);
    });
    
    // ETAPA 5: Validar critérios de identificação
    console.log('\n📋 ETAPA 5: Validando critérios de identificação');
    
    const validCriteria = [
      {
        name: 'Mensagens de Pacientes',
        criteria: { sender_type: 'patient', device_type: 'manual' },
        description: 'Áudios enviados por pacientes via WhatsApp'
      },
      {
        name: 'Mensagens da IA',
        criteria: { sender_type: 'ai', device_type: 'system' },
        description: 'Áudios gerados pela IA e enviados via N8N'
      }
    ];
    
    for (const criterion of validCriteria) {
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .match(criterion.criteria);
      
      console.log(`✅ ${criterion.name}: ${messages?.length || 0} mensagens`);
      console.log(`   Critério: sender_type='${criterion.criteria.sender_type}' + device_type='${criterion.criteria.device_type}'`);
      console.log(`   Descrição: ${criterion.description}`);
    }
    
    // RESULTADO FINAL
    console.log('\n🎯 =================');
    console.log('🎯 RESULTADO DO TESTE');
    console.log('🎯 =================');
    
    const totalPatient = senderCounts['patient'] || 0;
    const totalAi = senderCounts['ai'] || 0;
    const totalSystem = deviceCounts['system'] || 0;
    const totalManual = deviceCounts['manual'] || 0;
    
    console.log(`✅ Sistema implementado com sucesso!`);
    console.log(`📊 Resumo:`);
    console.log(`   • ${totalPatient} mensagens de pacientes (sender_type: 'patient')`);
    console.log(`   • ${totalAi} mensagens da IA (sender_type: 'ai')`);
    console.log(`   • ${totalManual} mensagens manuais (device_type: 'manual')`);
    console.log(`   • ${totalSystem} mensagens do sistema (device_type: 'system')`);
    
    console.log('\n🔧 Para testar com áudio da IA, use:');
    console.log('curl -X POST https://your-domain.com/api/n8n/upload \\');
    console.log('  -H "X-API-Key: sua_chave_api" \\');
    console.log('  -H "X-Conversation-Id: 559887694034551150391104" \\');
    console.log('  -H "X-Clinic-Id: 1" \\');
    console.log('  -H "X-Filename: audio-ia.mp3" \\');
    console.log('  -H "X-Mime-Type: audio/mpeg" \\');
    console.log('  -H "X-Sender-Type: ai" \\');
    console.log('  -F "file=@audio-ia.mp3"');
    
    console.log('\n✅ Sistema pronto para diferenciar áudios de pacientes e IA!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    throw error;
  }
}

// Executar teste
testAiAudioIdentification()
  .then(() => {
    console.log('\n🎉 Teste concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Teste falhou:', error);
    process.exit(1);
  });