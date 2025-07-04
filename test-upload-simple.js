/**
 * Teste Simples de Upload para verificar logs de pausa automática
 */

import FormData from 'form-data';
import fetch from 'node-fetch';

async function testUploadSimple() {
  console.log('📁 Testando upload com logs de pausa automática...');

  try {
    const conversationId = '559887694034551150391104';
    const baseUrl = 'http://localhost:5000';
    
    // Criar arquivo de teste
    const testFileContent = Buffer.from('Test file for AI pause debug');
    const testFileName = `debug-test-${Date.now()}.png`;
    
    const formData = new FormData();
    formData.append('file', testFileContent, {
      filename: testFileName,
      contentType: 'image/png'
    });
    formData.append('sendToWhatsApp', 'true');
    formData.append('caption', 'Teste de pausa automática - debug');
    
    console.log(`📤 Fazendo upload: ${testFileName}`);
    
    const uploadResponse = await fetch(`${baseUrl}/api/conversations/${conversationId}/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    console.log(`📊 Status: ${uploadResponse.status}`);
    
    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      console.log('✅ Upload realizado:', {
        messageId: result.data.message.id,
        attachmentId: result.data.attachment.id
      });
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ Erro no upload:', errorText);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testUploadSimple().catch(console.error);