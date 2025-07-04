/**
 * Teste Completo: Sistema Visual + Override Manual do Botão IA
 * Valida que botão fica cinza quando ai_active=false
 * e que ativação manual limpa pausa automática
 */

const BASE_URL = 'http://localhost:5000';

async function testAIVisualOverrideSystem() {
  console.log('🧪 TESTE VISUAL + OVERRIDE: Sistema Botão IA');
  console.log('============================================\n');

  try {
    // 1. Login
    console.log('1️⃣ Fazendo login...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cr@caiorodrigo.com.br',
        password: 'senha123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Erro no login');
      return;
    }

    const cookies = loginResponse.headers.get('set-cookie') || '';
    console.log('✅ Login realizado, cookies obtidos\n');

    // 2. Usar conversa com pausa ativa
    const testConversationId = '5511965860124551150391104';
    console.log(`2️⃣ Testando conversa: ${testConversationId}`);

    // 3. Verificar estado atual (deveria estar pausada = ai_active: false)
    console.log('\n3️⃣ Verificando estado atual da IA...');
    const currentState = await fetch(`${BASE_URL}/api/conversations-simple/${testConversationId}?t=${Date.now()}`, {
      headers: {
        'Cookie': cookies,
        'Cache-Control': 'no-cache'
      }
    });

    if (!currentState.ok) {
      console.log('❌ Erro ao buscar estado atual');
      return;
    }

    const currentData = await currentState.json();
    console.log('📊 Estado atual da IA:', {
      ai_active: currentData.conversation.ai_active,
      ai_paused_until: currentData.conversation.ai_paused_until,
      ai_pause_reason: currentData.conversation.ai_pause_reason
    });

    // 4. Se não está pausada, pausar primeiro
    if (currentData.conversation.ai_active === true || !currentData.conversation.ai_paused_until) {
      console.log('\n4️⃣ Pausando IA primeiro (enviando mensagem do sistema)...');
      
      const pauseMessage = await fetch(`${BASE_URL}/api/conversations-simple/${testConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify({
          content: 'Teste para pausar IA - ' + new Date().toLocaleTimeString(),
          sender_type: 'professional',
          device_type: 'system'
        })
      });

      if (!pauseMessage.ok) {
        console.log('❌ Erro ao enviar mensagem para pausar');
        return;
      }

      console.log('✅ Mensagem enviada para pausar IA');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 5. Verificar se está pausada (ai_active = false)
    console.log('\n5️⃣ Verificando se IA está pausada...');
    const pausedState = await fetch(`${BASE_URL}/api/conversations-simple/${testConversationId}?t=${Date.now()}`, {
      headers: {
        'Cookie': cookies,
        'Cache-Control': 'no-cache'
      }
    });

    const pausedData = await pausedState.json();
    console.log('📊 Estado pausado:', {
      ai_active: pausedData.conversation.ai_active,
      ai_paused_until: pausedData.conversation.ai_paused_until
    });

    if (pausedData.conversation.ai_active !== false) {
      console.log('❌ IA deveria estar pausada (ai_active = false) mas não está');
      return;
    }

    console.log('✅ IA está pausada - botão deveria aparecer CINZA CLARO na interface');

    // 6. Teste Override Manual - Ativar IA manualmente
    console.log('\n6️⃣ Testando override manual - ativando IA...');
    const overrideResponse = await fetch(`${BASE_URL}/api/conversations/${testConversationId}/ai-toggle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({ ai_active: true })
    });

    if (!overrideResponse.ok) {
      console.log('❌ Erro no override manual:', await overrideResponse.text());
      return;
    }

    const overrideResult = await overrideResponse.json();
    console.log('✅ Override manual executado:', overrideResult);

    // 7. Verificar se pausa foi limpa
    console.log('\n7️⃣ Verificando se pausa automática foi limpa...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalState = await fetch(`${BASE_URL}/api/conversations-simple/${testConversationId}?t=${Date.now()}`, {
      headers: {
        'Cookie': cookies,
        'Cache-Control': 'no-cache'
      }
    });

    const finalData = await finalState.json();
    console.log('📊 Estado final após override:', {
      ai_active: finalData.conversation.ai_active,
      ai_paused_until: finalData.conversation.ai_paused_until,
      ai_pause_reason: finalData.conversation.ai_pause_reason,
      ai_paused_by_user_id: finalData.conversation.ai_paused_by_user_id
    });

    // 8. Validação final
    console.log('\n8️⃣ VALIDAÇÃO DOS RESULTADOS:');
    console.log('=============================');

    const testResults = {
      aiReativada: finalData.conversation.ai_active === true,
      pausaLimpa: finalData.conversation.ai_paused_until === null,
      motivoLimpo: finalData.conversation.ai_pause_reason === null,
      usuarioLimpo: finalData.conversation.ai_paused_by_user_id === null
    };

    console.log('✅ IA reativada (ai_active = true):', testResults.aiReativada ? 'SIM' : 'NÃO');
    console.log('✅ Pausa limpa (ai_paused_until = null):', testResults.pausaLimpa ? 'SIM' : 'NÃO');
    console.log('✅ Motivo limpo (ai_pause_reason = null):', testResults.motivoLimpo ? 'SIM' : 'NÃO');
    console.log('✅ Usuário limpo (ai_paused_by_user_id = null):', testResults.usuarioLimpo ? 'SIM' : 'NÃO');

    const allTestsPassed = Object.values(testResults).every(result => result === true);

    if (allTestsPassed) {
      console.log('\n🎉 SUCESSO! Sistema de override manual funcionando completamente!');
      console.log('📋 Visual esperado:');
      console.log('   • Botão IA CINZA quando ai_active = false (pausado)');
      console.log('   • Botão IA VERDE/AZUL quando ai_active = true (ativo)');
      console.log('   • Override manual limpa pausa automática');
    } else {
      console.log('\n❌ FALHA! Alguns testes não passaram');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar teste
testAIVisualOverrideSystem();