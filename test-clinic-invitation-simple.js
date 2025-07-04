/**
 * Teste simplificado do sistema de convites de clínica
 * Testa endpoints públicos e demonstra funcionalidade
 */

async function testClinicInvitationSimple() {
  console.log('🏥 Testando sistema de convites de clínica...\n');

  const baseUrl = 'http://localhost:5000/api/clinics';
  
  // TESTE 1: Tentar buscar convite com token inexistente (endpoint público)
  console.log('🔍 TESTE 1: Testando endpoint público de busca de convite...');
  const testToken = 'test-token-123';
  
  const getInviteResponse = await fetch(`${baseUrl}/invitations/${testToken}`);
  
  if (getInviteResponse.status === 404) {
    console.log('✅ Endpoint funcionando - token não encontrado (esperado)');
  } else {
    console.log('📝 Resposta:', getInviteResponse.status, await getInviteResponse.text());
  }

  // TESTE 2: Testar endpoint de aceitação com dados inválidos
  console.log('\n✋ TESTE 2: Testando endpoint de aceitação de convite...');
  const acceptData = {
    password: 'TestPassword123!'
  };

  const acceptResponse = await fetch(`${baseUrl}/invitations/${testToken}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(acceptData)
  });

  console.log('📝 Status da aceitação:', acceptResponse.status);
  console.log('📝 Resposta:', await acceptResponse.text());

  // TESTE 3: Verificar estrutura das rotas (health check)
  console.log('\n🏥 TESTE 3: Verificando se rotas estão registradas...');
  
  // Testar se as rotas existem (401 é melhor que 404)
  const authRequiredEndpoints = [
    '/invitations',
    '/1' // GET clinic by ID
  ];

  for (const endpoint of authRequiredEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      if (response.status === 401) {
        console.log(`✅ Rota ${endpoint} existe (requer autenticação)`);
      } else if (response.status === 404) {
        console.log(`❌ Rota ${endpoint} não encontrada`);
      } else {
        console.log(`🔍 Rota ${endpoint} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Erro na rota ${endpoint}:`, error.message);
    }
  }

  console.log('\n🏁 Teste básico do sistema de convites concluído!');
  console.log('ℹ️ Para testes completos, é necessário autenticação de super_admin');
}

// Executar teste
testClinicInvitationSimple().catch(console.error);