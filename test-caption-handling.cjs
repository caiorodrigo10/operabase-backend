/**
 * Test Script: Caption Handling for N8N File Uploads
 * Validates that when clients send files without text, caption remains empty
 * Created: June 26, 2025
 */

const FormData = require('form-data');

async function testCaptionHandling() {
  console.log('🧪 TESTE: Caption Handling para uploads N8N');
  console.log('================================================\n');

  const baseUrl = 'http://localhost:5000';
  const apiKey = process.env.N8N_API_KEY;
  
  if (!apiKey) {
    console.log('❌ N8N_API_KEY não encontrada nas variáveis de ambiente');
    return;
  }

  // Teste 1: Arquivo enviado SEM caption (deve ficar vazio)
  console.log('📝 TESTE 1: Arquivo sem caption (deve criar mensagem vazia)');
  await testFileWithoutCaption(baseUrl, apiKey);
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Teste 2: Arquivo enviado COM caption (deve usar o texto do cliente)
  console.log('📝 TESTE 2: Arquivo com caption (deve usar texto do cliente)');
  await testFileWithCaption(baseUrl, apiKey);
  
  console.log('\n✅ Teste de Caption Handling concluído!');
}

async function testFileWithoutCaption(baseUrl, apiKey) {
  try {
    // Importar fetch dinamicamente
    const { default: fetch } = await import('node-fetch');
    
    // Simular arquivo de teste
    const testFileContent = Buffer.from('Test file content for caption test');
    
    const formData = new FormData();
    formData.append('file', testFileContent, {
      filename: 'test-sem-caption.txt',
      contentType: 'text/plain'
    });

    const response = await fetch(`${baseUrl}/api/n8n/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'X-Conversation-Id': '559887694034551150391104', // Igor Venturin
        'X-Clinic-Id': '1',
        'X-Filename': 'test-sem-caption.txt',
        'X-Mime-Type': 'text/plain',
        // Sem X-Caption - simulando cliente que enviou só arquivo
        ...formData.getHeaders()
      },
      body: formData
    });

    const result = await response.json();
    
    console.log('📋 Status:', response.status);
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Arquivo sem caption enviado com sucesso');
      console.log('✅ Comportamento esperado: mensagem deve ter content vazio ("")');
    } else {
      console.log('❌ Falha no envio:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste sem caption:', error.message);
  }
}

async function testFileWithCaption(baseUrl, apiKey) {
  try {
    // Importar fetch dinamicamente
    const { default: fetch } = await import('node-fetch');
    
    // Simular arquivo de teste
    const testFileContent = Buffer.from('Test file content with caption');
    const clientText = 'Este é um texto que o cliente escreveu junto com o arquivo';
    
    const formData = new FormData();
    formData.append('file', testFileContent, {
      filename: 'test-com-caption.txt',
      contentType: 'text/plain'
    });

    const response = await fetch(`${baseUrl}/api/n8n/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'X-Conversation-Id': '559887694034551150391104', // Igor Venturin
        'X-Clinic-Id': '1',
        'X-Filename': 'test-com-caption.txt',
        'X-Mime-Type': 'text/plain',
        'X-Caption': clientText, // Cliente enviou texto junto com arquivo
        ...formData.getHeaders()
      },
      body: formData
    });

    const result = await response.json();
    
    console.log('📋 Status:', response.status);
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Arquivo com caption enviado com sucesso');
      console.log('✅ Comportamento esperado: mensagem deve ter content =', `"${clientText}"`);
    } else {
      console.log('❌ Falha no envio:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste com caption:', error.message);
  }
}

// Verificar comportamento atual das mensagens na conversa
async function verifyCurrentMessages() {
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('http://localhost:5000/api/conversations-simple/559887694034551150391104');
    const data = await response.json();
    
    console.log('\n🔍 VERIFICANDO mensagens atuais na conversa:');
    console.log('================================================');
    
    if (data.conversation && data.conversation.messages) {
      data.conversation.messages
        .filter(msg => msg.ai_action === 'file_upload')
        .slice(-5) // Últimas 5 mensagens com arquivo
        .forEach(msg => {
          console.log(`📄 Mensagem ID ${msg.id}:`);
          console.log(`   Content: "${msg.content}"`);
          console.log(`   Type: ${msg.message_type}`);
          console.log(`   Attachments: ${msg.attachments?.length || 0}`);
          console.log('');
        });
    }
  } catch (error) {
    console.error('❌ Erro ao verificar mensagens:', error.message);
  }
}

// Executar teste
testCaptionHandling()
  .then(() => {
    console.log('\n🔍 Verificando mensagens na conversa após teste...');
    return verifyCurrentMessages();
  })
  .catch(console.error);