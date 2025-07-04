/**
 * Teste específico para detectar se áudio gravado está sendo roteado corretamente
 * para /sendWhatsAppAudio vs /sendMedia
 */

import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';
const TEST_CONVERSATION_ID = '5511965860124551150391104'; // Caio Rodrigo

async function testAudioVoiceDetection() {
  console.log('🎤 Teste de Detecção de Áudio Gravado');
  console.log('=====================================');
  
  try {
    // Simular arquivo de áudio gravado
    const audioData = Buffer.from('fake-webm-audio-data');
    
    const formData = new FormData();
    formData.append('file', audioData, {
      filename: 'gravacao_1750906999999.webm',
      contentType: 'audio/webm;codecs=opus'
    });
    formData.append('caption', 'Teste de áudio gravado');
    formData.append('messageType', 'audio_voice'); // Crucial!
    formData.append('sendToWhatsApp', 'true');
    
    console.log('📤 Enviando áudio com messageType: audio_voice');
    console.log('📋 Dados do teste:');
    console.log('  - Nome: gravacao_1750906999999.webm');
    console.log('  - Tipo: audio/webm;codecs=opus');
    console.log('  - messageType: audio_voice');
    
    const response = await fetch(`${API_BASE}/api/conversations/${TEST_CONVERSATION_ID}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': 'connect.sid=your-session-cookie-here'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Upload realizado com sucesso');
      console.log('📨 Message Type salvo:', result.data?.message?.message_type);
      console.log('🔍 WhatsApp Status:', result.data?.whatsapp?.sent ? 'Enviado' : 'Falhou');
      
      if (result.data?.message?.message_type === 'audio_voice') {
        console.log('🎯 SUCESSO: Detectado como audio_voice!');
      } else {
        console.log('❌ FALHA: Não detectado como audio_voice');
      }
    } else {
      console.log('❌ Upload falhou:', result);
    }
    
  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testAudioVoiceDetection();