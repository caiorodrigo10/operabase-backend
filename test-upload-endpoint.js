import FormData from 'form-data';
import fetch from 'node-fetch';

async function testUploadEndpoint() {
  try {
    console.log('🧪 Testando endpoint de upload...');
    
    // Criar um arquivo de teste simples
    const testContent = Buffer.from('Test image content for Evolution API');
    const testFileName = 'test-image.png';
    
    // Criar FormData
    const formData = new FormData();
    formData.append('file', testContent, {
      filename: testFileName,
      contentType: 'image/png'
    });
    formData.append('sendToWhatsApp', 'true');
    
    console.log('📤 Enviando para:', 'http://localhost:5000/api/conversations/5511965860124551150391104/upload');
    
    const response = await fetch('http://localhost:5000/api/conversations/5511965860124551150391104/upload', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('📊 Status:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log('📊 Response:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUploadEndpoint();