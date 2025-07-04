/**
 * Teste direto da rota de áudio para verificar se está funcionando
 */

async function testAudioVoiceRoute() {
  const API_BASE = 'http://localhost:5000';
  const CONVERSATION_ID = '5511965860124551150391104';
  
  console.log('🎤 TESTE DIRETO: Rota de Áudio Gravado');
  console.log('=====================================');
  
  try {
    // Simular exatamente como o frontend Browser envia o arquivo
    const fs = await import('fs');
    const path = await import('path');
    
    // Criar um arquivo WebM válido (dados simulados)
    const webmHeader = Buffer.from([
      0x1A, 0x45, 0xDF, 0xA3, // EBML header
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F,
      0x42, 0x86, 0x81, 0x01, 0x42, 0xF7, 0x81, 0x01,
      0x42, 0xF2, 0x81, 0x04, 0x42, 0xF3, 0x81, 0x08,
      0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6D
    ]);
    
    const audioData = Buffer.concat([
      webmHeader,
      Buffer.from('FAKE_AUDIO_WEBM_DATA_' + Date.now())
    ]);
    
    // Usar FormData nativo (como no browser)
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // Simular File object do browser
    formData.append('file', audioData, {
      filename: 'gravacao_1751299999999.webm',
      contentType: 'audio/webm;codecs=opus'
    });
    
    console.log('📤 Enviando para:', `${API_BASE}/api/conversations/${CONVERSATION_ID}/upload-voice`);
    console.log('📦 Arquivo:', 'gravacao_1751299999999.webm');
    console.log('📏 Tamanho:', audioData.length, 'bytes');
    console.log('🔧 Content-Type:', 'audio/webm;codecs=opus');
    
    const response = await fetch(`${API_BASE}/api/conversations/${CONVERSATION_ID}/upload-voice`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders() // Importante para node-fetch
    });
    
    console.log('\n📊 RESPOSTA DA API:');
    console.log('  Status:', response.status);
    console.log('  Status Text:', response.statusText);
    console.log('  Headers:', Object.fromEntries(response.headers.entries()));
    
    let result;
    try {
      result = await response.json();
      console.log('  Body:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('\n✅ UPLOAD FUNCIONOU!');
        console.log('  Message ID:', result.data?.message?.id);
        console.log('  Attachment ID:', result.data?.attachment?.id);
        console.log('  WhatsApp enviado:', result.data?.whatsapp?.sent);
        console.log('  Evolution messageId:', result.data?.whatsapp?.messageId);
        
        if (result.data?.whatsapp?.sent) {
          console.log('\n🎯 SUCESSO COMPLETO: Áudio enviado para WhatsApp!');
        } else {
          console.log('\n⚠️ UPLOAD OK, mas falha no WhatsApp:', result.data?.whatsapp?.error);
        }
      } else {
        console.log('\n❌ UPLOAD FALHOU:', result.error);
      }
      
    } catch (parseError) {
      const text = await response.text();
      console.log('  Body (text):', text);
      console.log('  Parse Error:', parseError.message);
    }
    
  } catch (error) {
    console.log('\n❌ ERRO NO TESTE:', error.message);
    console.log('Stack:', error.stack);
  }
}

testAudioVoiceRoute();