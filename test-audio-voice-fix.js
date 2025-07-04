/**
 * Teste para validar correção do sistema de áudio gravado
 * Verifica se rota específica está funcionando e usando endpoint correto
 */

async function testAudioVoiceFix() {
  const API_BASE = 'http://localhost:5000';
  const CONVERSATION_ID = '5511965860124551150391104';
  
  console.log('🎤 TESTE CORREÇÃO: Sistema de Áudio Gravado');
  console.log('=============================================');
  
  try {
    // 1. Verificar se a rota está ativa
    console.log('\n🔍 STEP 1: Verificando se rota está registrada...');
    
    const { spawn } = await import('child_process');
    const curlTest = spawn('curl', [
      '-X', 'POST',
      `${API_BASE}/api/conversations/${CONVERSATION_ID}/upload-voice`,
      '--data-raw', '',
      '--max-time', '3'
    ]);
    
    let curlOutput = '';
    curlTest.stdout.on('data', (data) => {
      curlOutput += data.toString();
    });
    
    curlTest.stderr.on('data', (data) => {
      curlOutput += data.toString();
    });
    
    await new Promise((resolve) => {
      curlTest.on('close', (code) => {
        console.log('📊 Curl Response:', curlOutput);
        if (curlOutput.includes('Nenhum arquivo enviado') || curlOutput.includes('400')) {
          console.log('✅ Rota está ATIVA - retornou erro de arquivo esperado');
        } else if (curlOutput.includes('500') || curlOutput.includes('Internal Server Error')) {
          console.log('⚠️ Rota está ativa mas com erro interno');
        } else {
          console.log('❌ Rota pode não estar registrada ou servidor com problema');
        }
        resolve();
      });
    });
    
    // 2. Testar com arquivo de verdade via FormData
    console.log('\n🔍 STEP 2: Testando com arquivo real...');
    
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // Criar dados de áudio WebM simulados
    const audioData = Buffer.from([
      // WebM header simplificado
      0x1A, 0x45, 0xDF, 0xA3,
      ...Array(100).fill(0).map(() => Math.floor(Math.random() * 256))
    ]);
    
    formData.append('file', audioData, {
      filename: 'teste_fix.webm',
      contentType: 'audio/webm;codecs=opus'
    });
    
    console.log('📤 Enviando arquivo de teste...');
    
    const response = await fetch(`${API_BASE}/api/conversations/${CONVERSATION_ID}/upload-voice`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    console.log('📊 Response Status:', response.status);
    
    try {
      const result = await response.json();
      console.log('📋 Response Body:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('\n✅ SUCESSO TOTAL!');
        console.log('  💾 Mensagem salva:', result.data?.message?.id);
        console.log('  📎 Anexo criado:', result.data?.attachment?.id);
        console.log('  📱 WhatsApp enviado:', result.data?.whatsapp?.sent);
        
        if (result.data?.whatsapp?.sent) {
          console.log('  🎯 Evolution messageId:', result.data?.whatsapp?.messageId);
          console.log('\n🎉 ÁUDIO FUNCIONOU COMPLETAMENTE!');
        } else {
          console.log('  ⚠️ WhatsApp Error:', result.data?.whatsapp?.error);
          console.log('\n⚠️ Upload OK, WhatsApp com problema');
        }
      } else {
        console.log('\n❌ FALHOU:', result.error);
      }
      
    } catch (parseError) {
      const text = await response.text();
      console.log('📋 Response Text:', text);
    }
    
  } catch (error) {
    console.log('\n❌ ERRO GERAL:', error.message);
  }
}

testAudioVoiceFix();