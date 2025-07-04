/**
 * Teste Final de Validação: Sistema RAG com PDFs Reais
 * Confirma que a correção funciona com diferentes tipos de PDF
 */

async function testRAGPDFValidation() {
  try {
    console.log('🔧 Teste final: Validação completa do sistema RAG corrigido...');
    
    // 1. Login
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cr@caiorodrigo.com.br',
        password: 'Digibrands123#'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Authenticated successfully');
    
    // 2. Check existing documents and their content lengths
    const documentsResponse = await fetch('http://localhost:5000/api/rag/documents?full_content=true', {
      headers: { 'Cookie': cookies }
    });
    
    if (!documentsResponse.ok) {
      console.log('❌ Error listing documents');
      return;
    }
    
    const documentsResult = await documentsResponse.json();
    const documents = documentsResult.data || [];
    
    console.log('📋 Current RAG Documents Analysis:');
    console.log('=======================================');
    
    documents.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Title: ${doc.title}`);
      console.log(`  Source: ${doc.source}`);
      console.log(`  Content Length: ${doc.content_full_length} characters`);
      console.log(`  Has Embedding: ${doc.embedding ? 'Yes' : 'No'}`);
      console.log(`  Status: ${doc.processing_status}`);
      
      // Analysis
      if (doc.content_full_length > 1000) {
        console.log(`  ✅ GOOD: Rich content detected`);
      } else if (doc.content_full_length > 100) {
        console.log(`  ⚠️  MODERATE: Short content`);
      } else {
        console.log(`  ❌ POOR: Very short content - possible extraction issue`);
      }
      
      console.log(`  Content Preview: ${doc.content ? doc.content.substring(0, 80) + '...' : 'NO CONTENT'}`);
      console.log('');
    });
    
    // 3. Summary analysis
    const totalDocs = documents.length;
    const richContent = documents.filter(d => d.content_full_length > 1000).length;
    const withEmbeddings = documents.filter(d => d.embedding).length;
    const completed = documents.filter(d => d.processing_status === 'completed').length;
    
    console.log('📊 RAG System Health Summary:');
    console.log('=======================================');
    console.log(`Total Documents: ${totalDocs}`);
    console.log(`Rich Content (>1000 chars): ${richContent}/${totalDocs} (${((richContent/totalDocs)*100).toFixed(1)}%)`);
    console.log(`With Embeddings: ${withEmbeddings}/${totalDocs} (${((withEmbeddings/totalDocs)*100).toFixed(1)}%)`);
    console.log(`Processing Completed: ${completed}/${totalDocs} (${((completed/totalDocs)*100).toFixed(1)}%)`);
    
    // 4. Test text search functionality
    console.log('\n🔍 Testing semantic search functionality...');
    const searchResponse = await fetch('http://localhost:5000/api/rag/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        query: 'cardiologia',
        match_count: 3
      })
    });
    
    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      const results = searchResult.data || [];
      console.log(`✅ Search successful: ${results.length} results found`);
      
      results.forEach((result, index) => {
        console.log(`  Result ${index + 1}: ${result.title} (${result.content.length} chars)`);
      });
    } else {
      console.log('⚠️ Search functionality not tested due to API error');
    }
    
    // 5. Final assessment
    console.log('\n🎯 FINAL ASSESSMENT:');
    console.log('=======================================');
    
    if (richContent >= totalDocs * 0.8) {
      console.log('✅ EXCELLENT: RAG content extraction working optimally');
    } else if (richContent >= totalDocs * 0.5) {
      console.log('⚠️ GOOD: RAG content extraction mostly working');
    } else {
      console.log('❌ NEEDS IMPROVEMENT: RAG content extraction has issues');
    }
    
    if (withEmbeddings >= totalDocs * 0.8) {
      console.log('✅ EXCELLENT: Embedding generation working well');
    } else {
      console.log('⚠️ MODERATE: Some documents missing embeddings');
    }
    
    if (completed >= totalDocs * 0.8) {
      console.log('✅ EXCELLENT: Document processing pipeline healthy');
    } else {
      console.log('⚠️ MODERATE: Some documents not fully processed');
    }
    
    console.log('\n🔧 RAG System Validation Complete');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Execute validation
testRAGPDFValidation();