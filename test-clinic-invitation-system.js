/**
 * Script de teste para validar o sistema completo de convites de clínica
 * Testa: criação de convite, busca de convite, aceitação, e listagem
 */

async function testClinicInvitationSystem() {
  console.log('🏥 Iniciando teste do sistema de convites de clínica...\n');

  const baseUrl = 'http://localhost:5000/api/clinics';
  
  // Primeiro, verificar se conseguimos fazer login
  console.log('🔐 Tentando fazer login...');
  
  const loginResponse = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'cr@caiorodrigo.com.br',
      password: 'Digibrands123#'
    })
  });

  let cookies = '';
  let isLoggedIn = false;

  if (loginResponse.ok) {
    const { user } = await loginResponse.json();
    console.log('✅ Login realizado como:', user.role);
    cookies = loginResponse.headers.get('set-cookie') || '';
    isLoggedIn = true;
  } else {
    console.log('ℹ️ Falha no login, testando endpoints públicos apenas');
    console.log('📝 Resposta:', await loginResponse.text());
  }
  
  // TESTE 1: Criar convite de clínica (apenas se logado)
  let token = null;
  let invitationId = null;

  if (isLoggedIn) {
    console.log('\n📤 TESTE 1: Criando convite de clínica...');
    const createInviteData = {
      email: 'novo.admin@exemplo.com',
      adminName: 'Dr. João Silva',
      clinicName: 'Clínica São João'
    };

    const createResponse = await fetch(`${baseUrl}/invitations`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(createInviteData)
    });

    if (createResponse.ok) {
      const createResult = await createResponse.json();
      console.log('✅ Convite criado:', createResult);
      
      invitationId = createResult.invitation.id;
      token = createResult.invitation.token;
    
    // TESTE 2: Buscar convite por token
    console.log('\n🔍 TESTE 2: Buscando convite por token...');
    const getInviteResponse = await fetch(`${baseUrl}/invitations/${token}`);
    
    if (getInviteResponse.ok) {
      const invitation = await getInviteResponse.json();
      console.log('✅ Convite encontrado:', invitation);
    } else {
      console.error('❌ Erro ao buscar convite:', await getInviteResponse.text());
    }

    // TESTE 3: Listar convites
    console.log('\n📋 TESTE 3: Listando convites...');
    const listResponse = await fetch(`${baseUrl}/invitations`, {
      headers: { 'Cookie': cookies }
    });
    
    if (listResponse.ok) {
      const listResult = await listResponse.json();
      console.log('✅ Lista de convites:', listResult);
    } else {
      console.error('❌ Erro ao listar convites:', await listResponse.text());
    }

    // TESTE 4: Aceitar convite (simulação)
    console.log('\n✋ TESTE 4: Simulando aceitação de convite...');
    const acceptData = {
      password: 'NovaSenga123!'
    };

    const acceptResponse = await fetch(`${baseUrl}/invitations/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(acceptData)
    });

    if (acceptResponse.ok) {
      const acceptResult = await acceptResponse.json();
      console.log('✅ Convite aceito:', acceptResult);
    } else {
      const error = await acceptResponse.text();
      console.log('ℹ️ Resposta da aceitação (pode ser esperado):', error);
    }

    // TESTE 5: Cancelar convite
    console.log('\n🗑️ TESTE 5: Cancelando convite...');
    const cancelResponse = await fetch(`${baseUrl}/invitations/${invitationId}`, {
      method: 'DELETE',
      headers: { 'Cookie': cookies }
    });

    if (cancelResponse.ok) {
      const cancelResult = await cancelResponse.json();
      console.log('✅ Convite cancelado:', cancelResult);
    } else {
      console.error('❌ Erro ao cancelar convite:', await cancelResponse.text());
    }

  } else {
    console.error('❌ Erro ao criar convite:', await createResponse.text());
  }

  console.log('\n🏁 Teste do sistema de convites concluído!');
}

// Executar teste
testClinicInvitationSystem().catch(console.error);