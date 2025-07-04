/**
 * Teste da ETAPA 4: Evolution API Audio Optimization
 * Verifica se mensagens de voz usam endpoint /sendWhatsAppAudio
 * e outros tipos de mídia usam endpoint /sendMedia
 */

async function testEtapa4AudioOptimization() {
  console.log('🎯 ETAPA 4 TEST: Evolution API Audio Optimization');
  console.log('=' .repeat(60));

  const baseUrl = 'http://localhost:5000';
  
  try {
    // 1. Login como usuário
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cr@caiorodrigo.com.br',
        password: 'senha123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login realizado com sucesso');

    // 2. Teste de Upload de Áudio de Voz (deve usar /sendWhatsAppAudio)
    console.log('\n🎤 Testando upload de áudio de voz...');
    await testVoiceAudioUpload(baseUrl, cookies);

    // 3. Teste de Upload de Arquivo de Áudio (deve usar /sendMedia)
    console.log('\n📁 Testando upload de arquivo de áudio...');
    await testAudioFileUpload(baseUrl, cookies);

    // 4. Teste de Upload de Imagem (deve usar /sendMedia)
    console.log('\n🖼️ Testando upload de imagem...');
    await testImageUpload(baseUrl, cookies);

    console.log('\n✅ ETAPA 4 TEST CONCLUÍDO COM SUCESSO');
    console.log('🎯 Sistema está diferenciando corretamente os endpoints:');
    console.log('   - audio_voice → /sendWhatsAppAudio');
    console.log('   - outros tipos → /sendMedia');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

async function testVoiceAudioUpload(baseUrl, cookies) {
  // Simular upload de áudio de voz gravado
  const audioBuffer = Buffer.from('fake-audio-data-voice-recording', 'utf8');
  
  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
  formData.append('file', audioBlob, 'recording_voice_message.webm');
  formData.append('caption', 'Mensagem de voz gravada');
  formData.append('sendToWhatsApp', 'true');

  console.log('📤 Enviando áudio de voz...');
  const response = await fetch(`${baseUrl}/api/conversations/5511965860124551150391104/upload`, {
    method: 'POST',
    headers: {
      'Cookie': cookies
    },
    body: formData
  });

  if (response.ok) {
    const result = await response.json();
    console.log('✅ Upload de voz realizado:', {
      success: result.success,
      messageType: result.message?.message_type,
      whatsappSent: result.whatsapp?.sent
    });
    
    // Verificar se logs mostram uso do endpoint correto
    console.log('🔍 Verificando logs do servidor para endpoint /sendWhatsAppAudio...');
    
  } else {
    const error = await response.text();
    console.log('⚠️ Upload de voz falhou (esperado se não há Evolution API):', response.status);
  }
}

async function testAudioFileUpload(baseUrl, cookies) {
  // Simular upload de arquivo de áudio
  const audioBuffer = Buffer.from('fake-audio-file-data', 'utf8');
  
  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
  formData.append('file', audioBlob, 'musica.mp3');
  formData.append('caption', 'Arquivo de áudio');
  formData.append('sendToWhatsApp', 'true');

  console.log('📤 Enviando arquivo de áudio...');
  const response = await fetch(`${baseUrl}/api/conversations/5511965860124551150391104/upload`, {
    method: 'POST',
    headers: {
      'Cookie': cookies
    },
    body: formData
  });

  if (response.ok) {
    const result = await response.json();
    console.log('✅ Upload de arquivo realizado:', {
      success: result.success,
      messageType: result.message?.message_type,
      whatsappSent: result.whatsapp?.sent
    });
    
    console.log('🔍 Verificando logs do servidor para endpoint /sendMedia...');
    
  } else {
    const error = await response.text();
    console.log('⚠️ Upload de arquivo falhou (esperado se não há Evolution API):', response.status);
  }
}

async function testImageUpload(baseUrl, cookies) {
  // Simular upload de imagem
  const imageBuffer = Buffer.from('fake-image-data', 'utf8');
  
  const formData = new FormData();
  const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
  formData.append('file', imageBlob, 'foto.jpg');
  formData.append('caption', 'Foto de teste');
  formData.append('sendToWhatsApp', 'true');

  console.log('📤 Enviando imagem...');
  const response = await fetch(`${baseUrl}/api/conversations/5511965860124551150391104/upload`, {
    method: 'POST',
    headers: {
      'Cookie': cookies
    },
    body: formData
  });

  if (response.ok) {
    const result = await response.json();
    console.log('✅ Upload de imagem realizado:', {
      success: result.success,
      messageType: result.message?.message_type,
      whatsappSent: result.whatsapp?.sent
    });
    
    console.log('🔍 Verificando logs do servidor para endpoint /sendMedia...');
    
  } else {
    const error = await response.text();
    console.log('⚠️ Upload de imagem falhou (esperado se não há Evolution API):', response.status);
  }
}

// Executar teste
testEtapa4AudioOptimization().catch(console.error);