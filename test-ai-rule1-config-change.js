/**
 * Teste da Regra 1: Ativação Automática da IA baseada na configuração da Lívia
 * Valida que mudanças na configuração da Lívia atualizam todas as conversas
 */

async function testAIRule1ConfigChange() {
  console.log('🧪 TESTE AI RULE 1: Iniciando teste de mudança de configuração da Lívia');
  
  try {
    const baseUrl = 'http://localhost:5000';
    
    // 1. Login para obter session
    console.log('🔐 TESTE: Fazendo login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cr@caiorodrigo.com.br',
        password: 'senha123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const cookies = loginResponse.headers.get('set-cookie') || '';
    console.log('✅ TESTE: Login realizado');

    // 2. Verificar conversas atuais antes da mudança
    console.log('📊 TESTE: Verificando status atual das conversas...');
    const conversationsResponse = await fetch(`${baseUrl}/api/conversations-simple`, {
      headers: { Cookie: cookies }
    });
    
    const conversationsData = await conversationsResponse.json();
    const conversations = conversationsData.conversations || [];
    
    console.log(`📊 TESTE: ${conversations.length} conversas encontradas:`);
    conversations.forEach(conv => {
      console.log(`  - Conversa ${conv.id}: ai_active = ${conv.ai_active}`);
    });

    // 3. Obter configuração atual da Lívia
    console.log('🔍 TESTE: Obtendo configuração atual da Lívia...');
    const liviaConfigResponse = await fetch(`${baseUrl}/api/livia/config`, {
      headers: { Cookie: cookies }
    });
    
    const liviaConfig = await liviaConfigResponse.json();
    console.log('📋 TESTE: Configuração atual da Lívia:', {
      id: liviaConfig.id,
      whatsapp_number_id: liviaConfig.whatsapp_number_id,
      is_active: liviaConfig.is_active
    });

    // 4. CENÁRIO 1: Desvincular WhatsApp (todas conversas devem ficar ai_active = false)
    console.log('🚫 TESTE: CENÁRIO 1 - Desvinculando WhatsApp da Lívia...');
    const unLinkResponse = await fetch(`${baseUrl}/api/livia/config`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Cookie: cookies 
      },
      body: JSON.stringify({
        ...liviaConfig,
        whatsapp_number_id: null // Desvincular
      })
    });
    
    if (!unLinkResponse.ok) {
      throw new Error(`Unlink failed: ${unLinkResponse.status}`);
    }
    
    console.log('✅ TESTE: WhatsApp desvinculado da Lívia');
    
    // Aguardar processamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Verificar se todas conversas ficaram ai_active = false
    console.log('🔍 TESTE: Verificando se conversas foram atualizadas...');
    const conversationsAfterUnlink = await fetch(`${baseUrl}/api/conversations-simple`, {
      headers: { Cookie: cookies }
    });
    
    const conversationsUnlinkData = await conversationsAfterUnlink.json();
    const conversationsUnlink = conversationsUnlinkData.conversations || [];
    
    console.log('📊 TESTE: Status das conversas após desvincular WhatsApp:');
    let allInactive = true;
    conversationsUnlink.forEach(conv => {
      console.log(`  - Conversa ${conv.id}: ai_active = ${conv.ai_active}`);
      if (conv.ai_active !== false) {
        allInactive = false;
      }
    });

    if (allInactive) {
      console.log('✅ TESTE: CENÁRIO 1 PASSOU - Todas conversas com ai_active = false');
    } else {
      console.log('❌ TESTE: CENÁRIO 1 FALHOU - Nem todas conversas foram desativadas');
    }

    // 6. CENÁRIO 2: Vincular WhatsApp novamente (todas conversas devem ficar ai_active = true)
    console.log('🔗 TESTE: CENÁRIO 2 - Vinculando WhatsApp à Lívia novamente...');
    const linkResponse = await fetch(`${baseUrl}/api/livia/config`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Cookie: cookies 
      },
      body: JSON.stringify({
        ...liviaConfig,
        whatsapp_number_id: liviaConfig.whatsapp_number_id // Restaurar vinculação
      })
    });
    
    if (!linkResponse.ok) {
      throw new Error(`Link failed: ${linkResponse.status}`);
    }
    
    console.log('✅ TESTE: WhatsApp vinculado à Lívia novamente');
    
    // Aguardar processamento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 7. Verificar se todas conversas ficaram ai_active = true
    console.log('🔍 TESTE: Verificando se conversas foram reativadas...');
    const conversationsAfterLink = await fetch(`${baseUrl}/api/conversations-simple`, {
      headers: { Cookie: cookies }
    });
    
    const conversationsLinkData = await conversationsAfterLink.json();
    const conversationsLink = conversationsLinkData.conversations || [];
    
    console.log('📊 TESTE: Status das conversas após vincular WhatsApp:');
    let allActive = true;
    conversationsLink.forEach(conv => {
      console.log(`  - Conversa ${conv.id}: ai_active = ${conv.ai_active}`);
      if (conv.ai_active !== true) {
        allActive = false;
      }
    });

    if (allActive) {
      console.log('✅ TESTE: CENÁRIO 2 PASSOU - Todas conversas com ai_active = true');
    } else {
      console.log('❌ TESTE: CENÁRIO 2 FALHOU - Nem todas conversas foram reativadas');
    }

    // 8. Resultado final
    const testPassed = allInactive && allActive;
    console.log('\n📋 TESTE: RESULTADO FINAL');
    console.log(`🎯 REGRA 1 IMPLEMENTADA: ${testPassed ? 'SUCESSO' : 'FALHA'}`);
    console.log(`  - Desvincular WhatsApp → ai_active = false: ${allInactive ? 'PASSOU' : 'FALHOU'}`);
    console.log(`  - Vincular WhatsApp → ai_active = true: ${allActive ? 'PASSOU' : 'FALHOU'}`);
    
    if (testPassed) {
      console.log('🎉 TESTE: Sistema de ativação automática da IA funcionando perfeitamente!');
    } else {
      console.log('❌ TESTE: Sistema precisa de ajustes');
    }

  } catch (error) {
    console.error('❌ TESTE: Erro durante execução:', error);
  }
}

// Executar teste
testAIRule1ConfigChange();