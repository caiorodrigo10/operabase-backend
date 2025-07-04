const { db } = await import('./server/db.ts');
const { sql } = await import('drizzle-orm');

async function checkZoutiDocs() {
  console.log('Checking Zouti documents...');
  
  const result = await db.execute(sql`
    SELECT id, title, content_type, processing_status, error_message, 
           LENGTH(extracted_content) as content_length,
           SUBSTRING(extracted_content, 1, 200) as content_preview
    FROM rag_documents 
    WHERE title LIKE '%zouti%'
    ORDER BY id
  `);
  
  console.log(`Found ${result.rows.length} Zouti documents:`);
  result.rows.forEach(doc => {
    console.log(`\nDoc ${doc.id}: ${doc.title}`);
    console.log(`  Status: ${doc.processing_status}`);
    console.log(`  Content Length: ${doc.content_length}`);
    console.log(`  Error: ${doc.error_message || 'None'}`);
    console.log(`  Preview: ${doc.content_preview?.replace(/[^\x20-\x7E]/g, '?') || 'No content'}`);
  });
  
  // Delete corrupted documents
  console.log('\nDeleting corrupted Zouti documents...');
  await db.execute(sql`
    DELETE FROM rag_documents 
    WHERE title LIKE '%zouti%' 
    AND (extracted_content IS NULL OR LENGTH(TRIM(extracted_content)) < 100)
  `);
  
  console.log('Corrupted documents deleted. Reprocess the URLs through the RAG interface.');
}

checkZoutiDocs().then(() => process.exit(0)).catch(console.error);