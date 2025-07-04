/**
 * Debug completo do fluxo audio_voice
 * Rastreia exatamente onde o messageType está sendo perdido
 */

import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';
const TEST_CONVERSATION_ID = '5511965860124551150391104';

async function debugAudioVoiceFlow() {
  console.log('🔍 DEBUG: Fluxo Completo Audio Voice');
  console.log('====================================');
  
  try {
    // Simular áudio gravado exatamente como o frontend
    const audioData = Buffer.from('fake-webm-voice-data');
    
    const formData = new FormData();
    formData.append('file', audioData, {
      filename: 'gravacao_1750906999999.webm',
      contentType: 'audio/webm;codecs=opus'
    });
    formData.append('caption', 'Teste áudio gravado');
    formData.append('messageType', 'audio_voice'); // CRÍTICO
    formData.append('sendToWhatsApp', 'true');
    
    console.log('📤 Enviando requisição com:');
    console.log('  - filename: gravacao_1750906999999.webm');
    console.log('  - messageType: audio_voice');
    console.log('  - mimeType: audio/webm;codecs=opus');
    
    // Interceptar logs do servidor via fetch
    console.log('\n🔄 Fazendo requisição...');
    
    const response = await fetch(`${API_BASE}/api/conversations/${TEST_CONVERSATION_ID}/upload`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    console.log('\n📊 RESULTADO:');
    console.log('  Status:', response.status);
    console.log('  Success:', result.success);
    console.log('  Message Type salvo:', result.data?.message?.message_type);
    console.log('  WhatsApp enviado:', result.data?.whatsapp?.sent);
    
    // Análise crítica
    if (result.data?.message?.message_type === 'audio_voice') {
      console.log('\n✅ CORRETO: Message type salvo como audio_voice');
    } else {
      console.log('\n❌ PROBLEMA: Message type salvo como:', result.data?.message?.message_type);
      console.log('   Esperado: audio_voice');
    }
    
    return result;
    
  } catch (error) {
    console.log('\n❌ Erro:', error.message);
    return null;
  }
}

debugAudioVoiceFlow();