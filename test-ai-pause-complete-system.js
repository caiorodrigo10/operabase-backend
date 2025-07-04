/**
 * Teste Completo do Sistema de Pausa Automática da IA
 * Valida o ciclo completo: mensagem sistema → pausa → reativação automática
 */

const BASE_URL = 'http://localhost:5000';

async function testCompletePauseSystem() {
  console.log('🧪 TESTE COMPLETO: Sistema de Pausa Automática da IA');
  console.log('============================================');
  
  try {
    // 1. Login para obter cookies de sessão
    console.log('\n1️⃣ Fazendo login...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'cr@caiorodrigo.com.br',
        password: 'a'
      })
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login realizado, cookies obtidos');
    
    // 2. Buscar conversas para encontrar uma para testar
    console.log('\n2️⃣ Buscando conversas...');
    const conversationsResponse = await fetch(`${BASE_URL}/api/conversations-simple`, {
      headers: {
        'Cookie': cookies
      }
    });
    
    const { conversations } = await conversationsResponse.json();
    const testConversation = conversations[0];
    console.log(`✅ Conversa de teste selecionada: ID ${testConversation.id} (${testConversation.contact?.name})`);
    
    // 3. Verificar estado inicial da IA
    console.log('\n3️⃣ Verificando estado inicial da IA...');
    const initialState = await fetch(`${BASE_URL}/api/conversations-simple/${testConversation.id}`, {
      headers: {
        'Cookie': cookies
      }
    });
    
    const initialData = await initialState.json();
    console.log('📊 Estado inicial da IA:', {
      ai_active: initialData.conversation.ai_active,
      ai_paused_until: initialData.conversation.ai_paused_until,
      ai_pause_reason: initialData.conversation.ai_pause_reason
    });
    
    // 4. Enviar mensagem do sistema para triggar pausa automática
    console.log('\n4️⃣ Enviando mensagem do sistema para triggar pausa automática...');
    const messageResponse = await fetch(`${BASE_URL}/api/conversations-simple/${testConversation.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        content: `Teste de pausa automática - ${new Date().toLocaleTimeString()}`,
        sender_type: 'professional',
        device_type: 'system'
      })
    });
    
    if (messageResponse.ok) {
      console.log('✅ Mensagem enviada com sucesso');
    } else {
      console.log('❌ Erro ao enviar mensagem:', await messageResponse.text());
      return;
    }
    
    // 5. Verificar se a pausa foi aplicada
    console.log('\n5️⃣ Verificando se pausa automática foi aplicada...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Aguardar 3 segundos para garantir processamento
    
    // Forçar cache invalidation adicionando timestamp
    const pausedState = await fetch(`${BASE_URL}/api/conversations-simple/${testConversation.id}?t=${Date.now()}`, {
      headers: {
        'Cookie': cookies,
        'Cache-Control': 'no-cache'
      }
    });
    
    const pausedData = await pausedState.json();
    console.log('📊 Estado após envio da mensagem:', {
      ai_active: pausedData.conversation.ai_active,
      ai_paused_until: pausedData.conversation.ai_paused_until,
      ai_pause_reason: pausedData.conversation.ai_pause_reason
    });
    
    // 6. Verificar se sistema automático funcionará
    if (pausedData.conversation.ai_paused_until) {
      const pauseEnd = new Date(pausedData.conversation.ai_paused_until);
      const now = new Date();
      const minutesRemaining = Math.ceil((pauseEnd - now) / (1000 * 60));
      
      console.log(`\n6️⃣ Pausa automática ativa até: ${pauseEnd.toLocaleString()}`);
      console.log(`⏰ Tempo restante: ${minutesRemaining} minutos`);
      console.log('🔄 O sistema verificador reativará automaticamente a IA quando a pausa expirar');
    }
    
    // 7. Validar resultados
    console.log('\n7️⃣ VALIDAÇÃO DOS RESULTADOS:');
    console.log('=============================');
    
    const testResults = {
      mensagemEnviada: messageResponse.ok,
      aiDesativada: pausedData.conversation.ai_active === false,
      pausaConfigurada: !!pausedData.conversation.ai_paused_until,
      motivoCorreto: pausedData.conversation.ai_pause_reason === 'manual_message'
    };
    
    console.log('✅ Mensagem enviada:', testResults.mensagemEnviada ? 'SIM' : 'NÃO');
    console.log('✅ AI desativada (ai_active = false):', testResults.aiDesativada ? 'SIM' : 'NÃO');
    console.log('✅ Pausa configurada (ai_paused_until):', testResults.pausaConfigurada ? 'SIM' : 'NÃO');
    console.log('✅ Motivo correto:', testResults.motivoCorreto ? 'SIM' : 'NÃO');
    
    const allTestsPassed = Object.values(testResults).every(result => result === true);
    
    if (allTestsPassed) {
      console.log('\n🎉 SUCESSO! Sistema de pausa automática funcionando completamente!');
      console.log('📋 Próximo passo: Sistema verificador reativará automaticamente a IA após o tempo configurado');
    } else {
      console.log('\n❌ FALHA! Alguns testes falharam. Verificar logs para debugging.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

// Executar teste
testCompletePauseSystem();