/**
 * Teste Abrangente: Persistência da Desativação Manual da IA
 * Valida que IA desativada manualmente não é reativada por mensagens do sistema
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuração do teste
const BASE_URL = 'http://localhost:5000/api';
const CONVERSATION_ID = '5511965860124551150391104';

async function testManualAiDisablePersistence() {
  console.log('🧪 TESTE: Persistência da Desativação Manual da IA');
  console.log('=================================================');

  try {
    // 1. Login
    console.log('\n1️⃣ Fazendo login...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cr@caiorodrigo.com.br',
        password: 'senha123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Falha no login');
    }

    const cookies = loginResponse.headers.raw()['set-cookie'];
    const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    console.log('✅ Login realizado');

    // 2. Verificar estado inicial
    console.log('\n2️⃣ Verificando estado inicial...');
    const { data: initialState } = await supabase
      .from('conversations')
      .select('ai_active, ai_pause_reason, ai_paused_until')
      .eq('id', CONVERSATION_ID)
      .single();

    console.log('📊 Estado inicial:', initialState);

    // 3. Desativar IA manualmente
    console.log('\n3️⃣ Desativando IA manualmente...');
    const toggleResponse = await fetch(`${BASE_URL}/conversations-simple/${CONVERSATION_ID}/ai-toggle`, {
      method: 'PATCH',
      headers: { 'Cookie': cookieHeader }
    });

    if (!toggleResponse.ok) {
      throw new Error('Falha ao desativar IA');
    }
    console.log('✅ IA desativada manualmente');

    // 4. Verificar estado após desativação manual
    console.log('\n4️⃣ Verificando estado após desativação manual...');
    const { data: manualDisabledState } = await supabase
      .from('conversations')
      .select('ai_active, ai_pause_reason, ai_paused_until')
      .eq('id', CONVERSATION_ID)
      .single();

    console.log('📊 Estado após desativação manual:', manualDisabledState);

    if (manualDisabledState.ai_active !== false) {
      throw new Error('IA deveria estar desativada após toggle manual');
    }

    if (manualDisabledState.ai_pause_reason !== 'manual') {
      throw new Error('ai_pause_reason deveria ser "manual"');
    }

    console.log('✅ Desativação manual aplicada corretamente');

    // 5. Enviar mensagem do sistema (que normalmente pausaria IA)
    console.log('\n5️⃣ Enviando mensagem do sistema...');
    const messageResponse = await fetch(`${BASE_URL}/conversations-simple/${CONVERSATION_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify({
        content: `Teste persistência manual - ${new Date().toLocaleTimeString()}`,
        sender_type: 'professional',
        device_type: 'system'
      })
    });

    if (!messageResponse.ok) {
      throw new Error('Falha ao enviar mensagem');
    }
    console.log('✅ Mensagem do sistema enviada');

    // 6. Aguardar processamento
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 7. Verificar se IA permaneceu desativada
    console.log('\n6️⃣ Verificando persistência da desativação manual...');
    const { data: finalState } = await supabase
      .from('conversations')
      .select('ai_active, ai_pause_reason, ai_paused_until')
      .eq('id', CONVERSATION_ID)
      .single();

    console.log('📊 Estado final:', finalState);

    // 8. Validação dos resultados
    console.log('\n7️⃣ VALIDAÇÃO DOS RESULTADOS:');
    console.log('============================');

    if (finalState.ai_active === false && finalState.ai_pause_reason === 'manual') {
      console.log('✅ TESTE PASSOU: IA permaneceu desativada manualmente');
      console.log('✅ ai_pause_reason mantém "manual"');
      console.log('✅ Sistema não sobrescreveu desativação manual');
    } else {
      console.log('❌ TESTE FALHOU: Sistema alterou desativação manual');
      console.log('❌ Esperado: ai_active=false, ai_pause_reason="manual"');
      console.log(`❌ Obtido: ai_active=${finalState.ai_active}, ai_pause_reason="${finalState.ai_pause_reason}"`);
      return;
    }

    // 9. Teste de reativação manual
    console.log('\n8️⃣ Testando reativação manual...');
    const reactivateResponse = await fetch(`${BASE_URL}/conversations-simple/${CONVERSATION_ID}/ai-toggle`, {
      method: 'PATCH',
      headers: { 'Cookie': cookieHeader }
    });

    if (!reactivateResponse.ok) {
      throw new Error('Falha ao reativar IA');
    }

    const { data: reactivatedState } = await supabase
      .from('conversations')
      .select('ai_active, ai_pause_reason, ai_paused_until')
      .eq('id', CONVERSATION_ID)
      .single();

    console.log('📊 Estado após reativação manual:', reactivatedState);

    if (reactivatedState.ai_active === true && !reactivatedState.ai_pause_reason) {
      console.log('✅ Reativação manual funcionando corretamente');
    } else {
      console.log('❌ Problema na reativação manual');
    }

    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('===============================');
    console.log('✅ Desativação manual da IA persiste através de mensagens do sistema');
    console.log('✅ ai_pause_reason="manual" protege contra reativação automática');
    console.log('✅ Sistema respeita controle manual do profissional');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testManualAiDisablePersistence();