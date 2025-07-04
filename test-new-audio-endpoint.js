/**
 * Teste do NOVO endpoint de áudio limpo
 * Testa: /api/audio/voice-message/:conversationId
 */

import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';
const CONVERSATION_ID = '5511965860124551150391104'; // Caio Rodrigo (com WhatsApp ativo)

async function testNewAudioEndpoint() {
  console.log('\n🎤 =================================');
  console.log('🎤 TESTE: Novo endpoint de áudio limpo');
  console.log('🎤 URL:', `${API_BASE}/api/audio/voice-message/${CONVERSATION_ID}`);
  console.log('🎤 =================================\n');
  
  try {
    // Criar arquivo de áudio simulado
    const audioBuffer = Buffer.from('fake-audio-webm-data-test-recording', 'utf8');
    
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'test_voice_recording.webm',
      contentType: 'audio/webm;codecs=opus'
    });
    
    console.log('📤 Enviando arquivo de áudio...');
    console.log('📂 Arquivo: test_voice_recording.webm');
    console.log('📊 Tamanho:', audioBuffer.length, 'bytes');
    console.log('🎯 Conversa ID:', CONVERSATION_ID);
    
    const response = await fetch(`${API_BASE}/api/audio/voice-message/${CONVERSATION_ID}`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    console.log('\n📊 RESPOSTA DO ENDPOINT:');
    console.log('  Status:', response.status);
    console.log('  Status Text:', response.statusText);
    console.log('  Headers Content-Type:', response.headers.get('content-type'));
    
    if (response.ok) {
      console.log('✅ Endpoint respondeu com sucesso!');
      
      try {
        const result = await response.json();
        console.log('\n📋 DADOS DA RESPOSTA:');
        console.log('  Success:', result.success);
        console.log('  Message:', result.message);
        
        if (result.data) {
          console.log('\n📄 DADOS DETALHADOS:');
          if (result.data.message) {
            console.log('  Message ID:', result.data.message.id);
            console.log('  Message Type:', result.data.message.message_type);
            console.log('  Evolution Status:', result.data.message.evolution_status);
          }
          
          if (result.data.attachment) {
            console.log('  Attachment ID:', result.data.attachment.id);
            console.log('  File Name:', result.data.attachment.file_name);
            console.log('  File Type:', result.data.attachment.file_type);
            console.log('  File Size:', result.data.attachment.file_size);
          }
          
          if (result.data.whatsapp) {
            console.log('  WhatsApp Sent:', result.data.whatsapp.sent);
            if (result.data.whatsapp.sent) {
              console.log('  WhatsApp MessageId:', result.data.whatsapp.messageId);
              console.log('\n🎯 SUCESSO TOTAL: Áudio enviado para WhatsApp!');
            } else {
              console.log('  WhatsApp Error:', result.data.whatsapp.error);
              console.log('\n⚠️ Upload OK, mas falha no WhatsApp');
            }
          }
        }
        
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse da resposta JSON:', parseError.message);
        const text = await response.text();
        console.log('📄 Resposta como texto:', text);
      }
      
    } else {
      console.error('❌ Endpoint retornou erro');
      
      try {
        const errorData = await response.json();
        console.log('📄 Erro JSON:', errorData);
      } catch {
        const errorText = await response.text();
        console.log('📄 Erro texto:', errorText);
      }
    }
    
    console.log('\n🏁 TESTE DO NOVO ENDPOINT CONCLUÍDO');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

// Executar teste
testNewAudioEndpoint();