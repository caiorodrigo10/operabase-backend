/**
 * Teste do Sistema de Recuperação de Senha com Email
 * Executa: node test-password-reset.js
 */

async function testPasswordReset() {
  const baseUrl = 'http://localhost:5000';
  const testEmail = 'cr@caiorodrigo.com.br'; // Email que existe no sistema
  
  console.log('🧪 Testando Sistema de Recuperação de Senha com Email\n');
  
  try {
    // ETAPA 1: Solicitar recuperação de senha
    console.log('📧 ETAPA 1: Solicitando recuperação de senha...');
    const response = await fetch(`${baseUrl}/api/auth/request-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Solicitação enviada com sucesso!');
      console.log('📋 Resposta:', result);
      console.log('\n🔍 Verifique os logs do servidor para:');
      console.log('  - Email enviado via Supabase');
      console.log('  - Token de recuperação (dev mode)');
      console.log('  - Link de recuperação gerado');
    } else {
      console.error('❌ Erro na solicitação:', result);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
  }
}

testPasswordReset();