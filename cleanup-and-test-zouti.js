const { db } = await import('./server/db.ts');
const { sql } = await import('drizzle-orm');
const { URLProcessor } = await import('./server/rag-processors/url-processor.ts');

async function cleanupAndTest() {
  console.log('🧹 Cleaning up corrupted Zouti documents...');
  
  // Delete all Zouti-related documents and their chunks/embeddings
  await db.execute(sql`
    DELETE FROM rag_embeddings 
    WHERE chunk_id IN (
      SELECT rc.id FROM rag_chunks rc
      JOIN rag_documents rd ON rc.document_id = rd.id
      WHERE rd.external_user_id = 'cr@caiorodrigo.com.br'
      AND rd.title LIKE '%zouti%'
    )
  `);
  
  await db.execute(sql`
    DELETE FROM rag_chunks 
    WHERE document_id IN (
      SELECT id FROM rag_documents 
      WHERE external_user_id = 'cr@caiorodrigo.com.br'
      AND title LIKE '%zouti%'
    )
  `);
  
  await db.execute(sql`
    DELETE FROM rag_documents 
    WHERE external_user_id = 'cr@caiorodrigo.com.br'
    AND title LIKE '%zouti%'
  `);
  
  console.log('✅ Corrupted documents cleaned up');
  
  // Test URL processing with fixed processor
  console.log('\n🧪 Testing URL processor with zouti.com.br...');
  
  try {
    const urlProcessor = new URLProcessor();
    const content = await urlProcessor.extractContent('https://zouti.com.br');
    
    console.log(`📄 Extracted content length: ${content.length} characters`);
    console.log(`📝 Content preview: ${content.substring(0, 300)}...`);
    
    // Check if content contains readable text about Zouti
    const hasZoutiInfo = content.toLowerCase().includes('zouti');
    console.log(`🔍 Contains Zouti information: ${hasZoutiInfo ? 'YES' : 'NO'}`);
    
    if (hasZoutiInfo) {
      console.log('✅ URL processor is now working correctly!');
    } else {
      console.log('⚠️ Content extracted but may not contain Zouti information');
    }
    
  } catch (error) {
    console.error('❌ URL processor test failed:', error.message);
  }
}

cleanupAndTest().then(() => {
  console.log('\n🎯 You can now re-upload the Zouti URLs through the knowledge base interface');
  process.exit(0);
}).catch(console.error);