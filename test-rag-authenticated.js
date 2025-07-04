import fetch from 'node-fetch';

// Test RAG Phase 2 with real authentication
const testRAGWithAuth = async () => {
  try {
    console.log('🚀 Testing RAG Phase 2 with authentication...');
    
    // First, login to get a valid session
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'cr@caiorodrigo.com.br',
        password: 'Digibrands123#'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', await loginResponse.text());
      return;
    }
    
    // Extract session cookie
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login successful, got session cookie');
    console.log('🔍 Cookie details:', cookies);
    
    // Test 1: Create text document
    console.log('📝 Creating text document...');
    const textResponse = await fetch('http://localhost:5000/api/rag/documents/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        title: 'Protocolo Cardiologia - Teste RAG',
        content: `Protocolo para Consulta de Cardiologia

1. Anamnese Inicial
- Histórico familiar de doenças cardiovasculares
- Sintomas como dor torácica, dispneia, palpitações
- Fatores de risco: tabagismo, diabetes, hipertensão

2. Exame Físico
- Verificação de pressão arterial
- Ausculta cardíaca e pulmonar
- Palpação de pulsos periféricos
- Avaliação de edema

3. Exames Complementares
- Eletrocardiograma (ECG) de repouso
- Ecocardiograma quando indicado
- Teste ergométrico para avaliação de capacidade funcional

4. Orientações ao Paciente
- Mudanças no estilo de vida
- Dieta cardioprotetora
- Atividade física regular
- Controle de fatores de risco

Este protocolo deve ser seguido em todas as consultas de cardiologia para garantir um atendimento padronizado e de qualidade.`
      })
    });
    
    if (textResponse.ok) {
      const result = await textResponse.json();
      console.log(`✅ Document created: ID ${result.documentId}`);
      
      // Wait for processing
      console.log('⏳ Waiting for processing (10 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check processing status
      const statusResponse = await fetch(`http://localhost:5000/api/rag/processing/${result.documentId}`, {
        headers: {
          'Cookie': cookies
        }
      });
      
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('📊 Processing status:', status);
      }
      
    } else {
      console.log('❌ Text upload failed:', await textResponse.text());
    }
    
    // Test 2: List documents
    console.log('📋 Listing documents...');
    const listResponse = await fetch('http://localhost:5000/api/rag/documents', {
      headers: {
        'Cookie': cookies
      }
    });
    
    if (listResponse.ok) {
      const documents = await listResponse.json();
      console.log(`✅ Found ${documents.length} documents:`);
      documents.forEach(doc => {
        console.log(`- ${doc.title}: ${doc.processing_status} (${doc.content_type})`);
      });
    } else {
      console.log('❌ List failed:', await listResponse.text());
    }
    
    // Test 3: Create URL document
    console.log('🌐 Creating URL document...');
    const urlResponse = await fetch('http://localhost:5000/api/rag/documents/url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        title: 'Diretrizes Cardiologia - SBC',
        url: 'https://www.portal.cardiol.br/'
      })
    });
    
    if (urlResponse.ok) {
      const result = await urlResponse.json();
      console.log(`✅ URL document created: ID ${result.documentId}`);
    } else {
      console.log('❌ URL upload failed:', await urlResponse.text());
    }
    
    console.log('🎯 RAG Phase 2 test completed');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

// Run test
testRAGWithAuth();