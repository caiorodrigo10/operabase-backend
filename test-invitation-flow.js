/**
 * Teste completo do fluxo de convites de clínica
 * Valida criação, listagem e link público
 */

const baseUrl = 'http://localhost:5000/api/clinics';

async function testInvitationFlow() {
  console.log('🧪 TESTE COMPLETO DO FLUXO DE CONVITES DE CLÍNICA\n');

  // ETAPA 1: Login como super_admin
  console.log('1️⃣ Fazendo login como super_admin...');
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'cr@caiorodrigo.com.br',
      password: 'digibrands123'
    })
  });

  if (!loginResponse.ok) {
    console.error('❌ Erro no login:', await loginResponse.text());
    return;
  }

  const loginData = await loginResponse.json();
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('✅ Login realizado:', loginData.user.email);

  // ETAPA 2: Criar convite
  console.log('\n2️⃣ Criando convite de clínica...');
  const invitationData = {
    admin_email: 'admin.teste@example.com',
    admin_name: 'Admin de Teste',
    clinic_name: 'Clínica Teste Convites'
  };

  const createResponse = await fetch(`${baseUrl}/invitations`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies 
    },
    body: JSON.stringify(invitationData)
  });

  if (!createResponse.ok) {
    console.error('❌ Erro ao criar convite:', await createResponse.text());
    return;
  }

  const createResult = await createResponse.json();
  console.log('✅ Convite criado:', createResult);
  
  const { token, id: invitationId } = createResult;

  // ETAPA 3: Verificar se aparece na listagem
  console.log('\n3️⃣ Verificando listagem de convites...');
  const listResponse = await fetch(`${baseUrl}/invitations`, {
    headers: { 'Cookie': cookies }
  });

  if (!listResponse.ok) {
    console.error('❌ Erro ao listar convites:', await listResponse.text());
    return;
  }

  const listResult = await listResponse.json();
  console.log('📋 Convites encontrados:', listResult.length);
  
  const foundInvitation = listResult.find(inv => inv.id === invitationId);
  if (foundInvitation) {
    console.log('✅ Convite encontrado na listagem:', foundInvitation.clinic_name);
  } else {
    console.log('❌ Convite NÃO encontrado na listagem');
    console.log('🔍 IDs na lista:', listResult.map(inv => inv.id));
  }

  // ETAPA 4: Testar acesso público ao convite
  console.log('\n4️⃣ Testando acesso público ao convite...');
  const publicResponse = await fetch(`${baseUrl}/invitations/${token}`);

  if (!publicResponse.ok) {
    console.error('❌ Erro ao acessar convite público:', await publicResponse.text());
    return;
  }

  const publicResult = await publicResponse.json();
  console.log('✅ Convite acessível publicamente:', publicResult.clinic_name);

  // ETAPA 5: Testar URL do frontend
  console.log('\n5️⃣ Testando URL do frontend...');
  const frontendUrl = `http://localhost:5000/convite-clinica/${token}`;
  console.log('🌐 URL do frontend:', frontendUrl);
  
  try {
    const frontendResponse = await fetch(frontendUrl);
    if (frontendResponse.ok) {
      console.log('✅ Frontend responde corretamente (status:', frontendResponse.status, ')');
    } else {
      console.log('⚠️ Frontend resposta:', frontendResponse.status);
    }
  } catch (error) {
    console.log('❌ Erro no frontend:', error.message);
  }

  // ETAPA 6: Cancelar convite para limpeza
  console.log('\n6️⃣ Limpando convite de teste...');
  const cancelResponse = await fetch(`${baseUrl}/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: { 'Cookie': cookies }
  });

  if (cancelResponse.ok) {
    console.log('✅ Convite cancelado com sucesso');
  } else {
    console.log('⚠️ Erro ao cancelar convite:', await cancelResponse.text());
  }

  console.log('\n🎯 TESTE CONCLUÍDO!');
  console.log('📝 Resumo:');
  console.log('- Criação de convite:', createResponse.ok ? '✅' : '❌');
  console.log('- Listagem:', foundInvitation ? '✅' : '❌');
  console.log('- Acesso público:', publicResponse.ok ? '✅' : '❌');
  console.log('- Frontend URL:', frontendUrl);
}

// Executar teste
testInvitationFlow().catch(console.error);