/**
 * Teste simplificado do sistema de convites
 * Usando autenticação via cookie session
 */

const baseUrl = 'http://localhost:5000/api/clinics';

async function getSession() {
  // Usar cookie de sessão atual (copiado dos logs do browser)
  return 's%3AJFo9Ou8jdOCVYVGpbDaGYOBs3VXXqkX.ZJ1c3QIqW%2FyANdmMsJ8gXz5sxBtjXyF%2FKxExqGjLqJA';
}

async function testInvitations() {
  console.log('🧪 TESTE SIMPLIFICADO DE CONVITES\n');

  const sessionCookie = await getSession();
  const cookieHeader = `connect.sid=${sessionCookie}`;

  // TESTE 1: Listar convites existentes
  console.log('1️⃣ Listando convites existentes...');
  try {
    const listResponse = await fetch(`${baseUrl}/invitations`, {
      headers: { 'Cookie': cookieHeader }
    });

    if (listResponse.ok) {
      const invitations = await listResponse.json();
      console.log(`✅ Encontrados ${invitations.invitations?.length || 0} convites`);
      console.log('📋 Convites:', invitations.invitations?.map(inv => ({
        id: inv.id,
        email: inv.email,
        clinic_name: inv.clinic_name,
        status: inv.status
      })));
    } else {
      console.log('❌ Erro ao listar:', listResponse.status, await listResponse.text());
    }
  } catch (error) {
    console.log('❌ Erro na listagem:', error.message);
  }

  // TESTE 2: Criar novo convite
  console.log('\n2️⃣ Criando novo convite...');
  const newInvitation = {
    admin_email: `test.${Date.now()}@example.com`,
    admin_name: 'Admin Teste',
    clinic_name: `Clínica Teste ${Date.now()}`
  };

  try {
    const createResponse = await fetch(`${baseUrl}/invitations`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookieHeader 
      },
      body: JSON.stringify(newInvitation)
    });

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ Convite criado:', result.token?.substring(0, 10) + '...');
      
      // TESTE 3: Verificar acesso público
      console.log('\n3️⃣ Testando acesso público...');
      const publicResponse = await fetch(`${baseUrl}/invitations/${result.token}`);
      
      if (publicResponse.ok) {
        const publicData = await publicResponse.json();
        console.log('✅ Acesso público OK:', publicData.clinic_name);
        
        // TESTE 4: URL do frontend
        const frontendUrl = `http://localhost:5000/convite-clinica/${result.token}`;
        console.log('🌐 URL para teste manual:', frontendUrl);
        
        return result.token;
      } else {
        console.log('❌ Erro no acesso público:', await publicResponse.text());
      }
    } else {
      console.log('❌ Erro ao criar:', createResponse.status, await createResponse.text());
    }
  } catch (error) {
    console.log('❌ Erro na criação:', error.message);
  }

  return null;
}

// Executar teste
testInvitations()
  .then(token => {
    if (token) {
      console.log('\n🎯 TESTE CONCLUÍDO COM SUCESSO!');
      console.log(`🔗 Link de teste: http://localhost:5000/convite-clinica/${token}`);
    } else {
      console.log('\n❌ TESTE FALHOU');
    }
  })
  .catch(console.error);