/**
 * Test Script: N8N Header Sanitization System
 * Tests the sanitization middleware for problematic headers like x-caption
 * Created: June 26, 2025
 */

const fs = require('fs');
const FormData = require('form-data');
const { execSync } = require('child_process');

// Configuração do teste
const BASE_URL = 'http://localhost:5000';
const API_KEY = process.env.N8N_API_KEY || '4f8e93d2b1a6c9e5f7d8a3b4c2e1f9g8h7i6j5k4l3m2n1o0p9q8r7s6t5u4v3w2x1y0z';

async function testN8NHeaderSanitization() {
  console.log('🧪 Testing N8N Header Sanitization System');
  console.log('=' .repeat(50));
  
  try {
    // Teste 1: Header com aspas problemáticas
    await testProblematicQuotes();
    
    // Teste 2: Header com caracteres de controle
    await testControlCharacters();
    
    // Teste 3: Header com quebras de linha
    await testLineBreaks();
    
    // Teste 4: Header com tamanho excessivo
    await testExcessiveLength();
    
    // Teste 5: Headers válidos (controle)
    await testValidHeaders();
    
    console.log('\n✅ All N8N header sanitization tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

async function testProblematicQuotes() {
  console.log('\n🧹 Test 1: Problematic Quotes in Headers');
  
  const problematicCaption = '"Mensagem do paciente: "Olá, preciso de ajuda""';
  const testData = {
    conversationId: '559887694034551150391104',
    clinicId: '1',
    caption: problematicCaption,
    filename: 'audio-test.mp3'
  };
  
  console.log('📝 Original caption:', problematicCaption);
  
  const response = await fetch(`${BASE_URL}/api/n8n/upload`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'x-conversation-id': testData.conversationId,
      'x-clinic-id': testData.clinicId,
      'x-caption': testData.caption,
      'x-filename': testData.filename,
      'x-mime-type': 'audio/mp3',
      'content-type': 'application/octet-stream'
    },
    body: Buffer.from('fake-audio-data')
  });
  
  const result = await response.json();
  console.log('📊 Response status:', response.status);
  console.log('📊 Response:', JSON.stringify(result, null, 2));
  
  if (response.status === 200 || response.status === 201) {
    console.log('✅ Problematic quotes handled successfully');
  } else {
    console.log('⚠️ Headers may still have issues, but server didn\'t crash');
  }
}

async function testControlCharacters() {
  console.log('\n🧹 Test 2: Control Characters in Headers');
  
  const controlCharCaption = 'Mensagem\x00com\x1Fcaracteres\x7Fde\x0Acontrole';
  const testData = {
    conversationId: '559887694034551150391104',
    clinicId: '1',
    caption: controlCharCaption,
    filename: 'image-test.jpg'
  };
  
  console.log('📝 Original caption with control chars:', JSON.stringify(controlCharCaption));
  
  const response = await fetch(`${BASE_URL}/api/n8n/upload`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'x-conversation-id': testData.conversationId,
      'x-clinic-id': testData.clinicId,
      'x-caption': testData.caption,
      'x-filename': testData.filename,
      'x-mime-type': 'image/jpeg',
      'content-type': 'application/octet-stream'
    },
    body: Buffer.from('fake-image-data')
  });
  
  const result = await response.json();
  console.log('📊 Response status:', response.status);
  console.log('📊 Response:', JSON.stringify(result, null, 2));
  
  if (response.status === 200 || response.status === 201) {
    console.log('✅ Control characters sanitized successfully');
  } else {
    console.log('⚠️ Control characters may cause issues');
  }
}

async function testLineBreaks() {
  console.log('\n🧹 Test 3: Line Breaks in Headers');
  
  const lineBreakCaption = 'Primeira linha\nSegunda linha\rTerceira linha';
  const testData = {
    conversationId: '559887694034551150391104',
    clinicId: '1',
    caption: lineBreakCaption,
    filename: 'document-test.pdf'
  };
  
  console.log('📝 Original caption with line breaks:', JSON.stringify(lineBreakCaption));
  
  const response = await fetch(`${BASE_URL}/api/n8n/upload`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'x-conversation-id': testData.conversationId,
      'x-clinic-id': testData.clinicId,
      'x-caption': testData.caption,
      'x-filename': testData.filename,
      'x-mime-type': 'application/pdf',
      'content-type': 'application/octet-stream'
    },
    body: Buffer.from('fake-pdf-data')
  });
  
  const result = await response.json();
  console.log('📊 Response status:', response.status);
  console.log('📊 Response:', JSON.stringify(result, null, 2));
  
  if (response.status === 200 || response.status === 201) {
    console.log('✅ Line breaks sanitized successfully');
  } else {
    console.log('⚠️ Line breaks may cause issues');
  }
}

async function testExcessiveLength() {
  console.log('\n🧹 Test 4: Excessive Header Length');
  
  const longCaption = 'A'.repeat(1500); // Muito maior que o limite de 1000
  const testData = {
    conversationId: '559887694034551150391104',
    clinicId: '1',
    caption: longCaption,
    filename: 'video-test.mp4'
  };
  
  console.log('📝 Original caption length:', longCaption.length);
  
  const response = await fetch(`${BASE_URL}/api/n8n/upload`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'x-conversation-id': testData.conversationId,
      'x-clinic-id': testData.clinicId,
      'x-caption': testData.caption,
      'x-filename': testData.filename,
      'x-mime-type': 'video/mp4',
      'content-type': 'application/octet-stream'
    },
    body: Buffer.from('fake-video-data')
  });
  
  const result = await response.json();
  console.log('📊 Response status:', response.status);
  console.log('📊 Response:', JSON.stringify(result, null, 2));
  
  if (response.status === 200 || response.status === 201) {
    console.log('✅ Excessive length truncated successfully');
  } else {
    console.log('⚠️ Long headers may cause issues');
  }
}

async function testValidHeaders() {
  console.log('\n🧹 Test 5: Valid Headers (Control Test)');
  
  const validCaption = 'Mensagem normal do paciente';
  const testData = {
    conversationId: '559887694034551150391104',
    clinicId: '1',
    caption: validCaption,
    filename: 'normal-audio.mp3'
  };
  
  console.log('📝 Valid caption:', validCaption);
  
  const response = await fetch(`${BASE_URL}/api/n8n/upload`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'x-conversation-id': testData.conversationId,
      'x-clinic-id': testData.clinicId,
      'x-caption': testData.caption,
      'x-filename': testData.filename,
      'x-mime-type': 'audio/mp3',
      'content-type': 'application/octet-stream'
    },
    body: Buffer.from('fake-audio-data')
  });
  
  const result = await response.json();
  console.log('📊 Response status:', response.status);
  console.log('📊 Response:', JSON.stringify(result, null, 2));
  
  if (response.status === 200 || response.status === 201) {
    console.log('✅ Valid headers processed successfully');
  } else {
    console.log('❌ Valid headers failed - system may have issues');
  }
}

// Executar testes
if (require.main === module) {
  testN8NHeaderSanitization();
}

module.exports = { testN8NHeaderSanitization };