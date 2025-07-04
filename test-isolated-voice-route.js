/**
 * Teste da rota isolada /api/conversations/:id/upload-voice
 * Verifica se bypassa a complexidade e vai direto para /sendWhatsAppAudio
 */

import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';
const TEST_CONVERSATION_ID = '5511965860124551150391104';

async function testIsolatedVoiceRoute() {
  console.log('🎤 TESTE: Rota Isolada de Áudio Gravado');
  console.log('=======================================');
  
  try {
    // Simular áudio gravado com nome específico
    const audioData = Buffer.from('fake-webm-voice-data-isolated-test');
    
    const formData = new FormData();
    formData.append('file', audioData, {
      filename: 'gravacao_1750907000000.webm', // Nome que identifica gravação
      contentType: 'audio/webm;codecs=opus'
    });
    formData.append('caption', 'Teste rota isolada');
    
    console.log('📤 Enviando para rota isolada:');
    console.log('  - Endpoint: /api/conversations/:id/upload-voice');
    console.log('  - Filename: gravacao_1750907000000.webm');
    console.log('  - Content-Type: audio/webm;codecs=opus');
    
    const response = await fetch(`${API_BASE}/api/conversations/${TEST_CONVERSATION_ID}/upload-voice`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    console.log('\n📊 RESULTADO DA ROTA ISOLADA:');
    console.log('  Status:', response.status);
    console.log('  Success:', result.success);
    console.log('  WhatsApp enviado:', result.data?.whatsapp?.sent);
    console.log('  Message ID:', result.data?.message?.id);
    console.log('  Attachment ID:', result.data?.attachment?.id);
    
    if (result.success && result.data?.whatsapp?.sent) {
      console.log('\n✅ SUCESSO: Rota isolada funcionou!');
      console.log('  - Áudio salvo no Supabase Storage');
      console.log('  - Mensagem criada como audio_voice');
      console.log('  - Enviado via /sendWhatsAppAudio');
    } else {
      console.log('\n❌ FALHA: Problema na rota isolada');
      console.log('  Error:', result.error);
      console.log('  WhatsApp Error:', result.data?.whatsapp?.error);
    }
    
    return result;
    
  } catch (error) {
    console.log('\n❌ Erro no teste:', error.message);
    return null;
  }
}

testIsolatedVoiceRoute();