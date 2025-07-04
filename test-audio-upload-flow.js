/**
 * Teste do Fluxo Completo de Upload de Áudio
 * Verifica se está salvando no Supabase Storage e enviando para Evolution API
 */

import { readFileSync } from 'fs';

async function testAudioUploadFlow() {
  console.log('🎤 TESTE FLUXO COMPLETO: Supabase Storage + Evolution API');
  console.log('=' .repeat(70));

  const baseUrl = 'http://localhost:5000';
  
  try {
    // Step 1: Login para obter cookies de autenticação
    console.log('\n🔐 Step 1: Autenticação...');
    
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'cr@caiorodrigo.com.br',
        password: 'Digibrands123#'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login realizado com sucesso');

    // Step 2: Criar um arquivo de áudio de teste (simulando gravação)
    console.log('\n🎵 Step 2: Criando arquivo de áudio de teste...');
    
    // Simular um arquivo de áudio WebM (formato típico de gravação web)
    const audioContent = Buffer.from('WEBM_AUDIO_SIMULATION_DATA_' + Date.now());
    
    const formData = new FormData();
    const audioFile = new File([audioContent], 'voice_recording.webm', {
      type: 'audio/webm'
    });
    
    formData.append('file', audioFile);
    formData.append('sendToWhatsApp', 'true');
    formData.append('caption', 'Mensagem de voz de teste');

    console.log('✅ Arquivo de áudio simulado criado');

    // Step 3: Upload para conversa específica (Caio Rodrigo)
    console.log('\n📤 Step 3: Upload para Supabase Storage + Evolution API...');
    
    const conversationId = '5511965860124551150391104'; // Caio Rodrigo
    
    const uploadResponse = await fetch(`${baseUrl}/api/conversations/${conversationId}/upload`, {
      method: 'POST',
      headers: {
        'Cookie': cookies
      },
      body: formData
    });

    console.log('📊 Upload Response Status:', uploadResponse.status);
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Upload Error:', errorText);
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload Result:', {
      messageId: uploadResult.message?.id,
      attachmentId: uploadResult.attachment?.id,
      supabaseUrl: uploadResult.signedUrl ? 'Generated' : 'Missing',
      whatsappSent: uploadResult.whatsapp?.sent,
      whatsappMessageId: uploadResult.whatsapp?.messageId,
      whatsappError: uploadResult.whatsapp?.error
    });

    // Step 4: Verificar se foi salvo no Supabase Storage
    console.log('\n💾 Step 4: Verificando Supabase Storage...');
    
    if (uploadResult.attachment?.storage_path) {
      console.log('✅ Arquivo salvo no Supabase Storage:', uploadResult.attachment.storage_path);
      console.log('🔗 URL assinada gerada:', !!uploadResult.signedUrl);
      console.log('⏰ Expira em:', uploadResult.expiresAt);
    } else {
      console.error('❌ Arquivo não foi salvo no Supabase Storage');
    }

    // Step 5: Verificar se foi enviado para Evolution API
    console.log('\n📱 Step 5: Verificando Evolution API...');
    
    if (uploadResult.whatsapp?.sent) {
      console.log('✅ Enviado para Evolution API com sucesso');
      console.log('📨 WhatsApp Message ID:', uploadResult.whatsapp.messageId);
      
      if (uploadResult.whatsapp.messageId) {
        console.log('🎯 Teste COMPLETO: Supabase Storage ✅ + Evolution API ✅');
      }
    } else {
      console.log('❌ Não foi enviado para Evolution API');
      console.log('🔍 Erro WhatsApp:', uploadResult.whatsapp?.error);
      
      // Verificar se ao menos foi salvo no Supabase
      if (uploadResult.attachment?.storage_path) {
        console.log('🎯 Teste PARCIAL: Supabase Storage ✅ + Evolution API ❌');
      } else {
        console.log('🎯 Teste FALHOU: Supabase Storage ❌ + Evolution API ❌');
      }
    }

    // Step 6: Verificar estrutura da mensagem criada
    console.log('\n📝 Step 6: Verificando mensagem criada...');
    
    if (uploadResult.message) {
      console.log('✅ Mensagem criada no banco:', {
        id: uploadResult.message.id,
        type: uploadResult.message.message_type,
        content: uploadResult.message.content,
        evolutionStatus: uploadResult.message.evolution_status,
        timestamp: uploadResult.message.timestamp
      });
    }

    // Step 7: Verificar anexo criado
    console.log('\n📎 Step 7: Verificando anexo criado...');
    
    if (uploadResult.attachment) {
      console.log('✅ Anexo criado:', {
        id: uploadResult.attachment.id,
        fileName: uploadResult.attachment.file_name,
        mimeType: uploadResult.attachment.mime_type,
        fileSize: uploadResult.attachment.file_size,
        storageBucket: uploadResult.attachment.storage_bucket,
        storagePath: uploadResult.attachment.storage_path
      });
    }

    return {
      supabaseStorage: !!uploadResult.attachment?.storage_path,
      evolutionAPI: !!uploadResult.whatsapp?.sent,
      messageCreated: !!uploadResult.message?.id,
      attachmentCreated: !!uploadResult.attachment?.id
    };

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return {
      supabaseStorage: false,
      evolutionAPI: false,
      messageCreated: false,
      attachmentCreated: false,
      error: error.message
    };
  }
}

// Executar teste
testAudioUploadFlow()
  .then(result => {
    console.log('\n🎯 RESULTADO FINAL:');
    console.log('├─ Supabase Storage:', result.supabaseStorage ? '✅' : '❌');
    console.log('├─ Evolution API:', result.evolutionAPI ? '✅' : '❌');
    console.log('├─ Mensagem criada:', result.messageCreated ? '✅' : '❌');
    console.log('└─ Anexo criado:', result.attachmentCreated ? '✅' : '❌');
    
    if (result.error) {
      console.log('⚠️  Erro:', result.error);
    }
  })
  .catch(error => {
    console.error('💥 Falha total no teste:', error);
  });