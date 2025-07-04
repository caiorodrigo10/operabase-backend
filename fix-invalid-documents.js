import { db } from './server/db';
import { rag_documents, rag_chunks, rag_embeddings } from './shared/schema';
import { eq, like, or } from 'drizzle-orm';
import fs from 'fs';

async function cleanupInvalidDocuments() {
  try {
    console.log('🔍 Searching for invalid documents...');
    
    // Find documents with invalid file paths
    const invalidDocs = await db
      .select()
      .from(rag_documents)
      .where(
        or(
          like(rag_documents.file_path, '%test%'),
          like(rag_documents.file_path, '%05-versions-space%'),
          eq(rag_documents.processing_status, 'pending')
        )
      );

    console.log(`Found ${invalidDocs.length} documents to check`);

    for (const doc of invalidDocs) {
      console.log(`\nChecking document ${doc.id}: ${doc.title}`);
      console.log(`File path: ${doc.file_path}`);
      console.log(`Status: ${doc.processing_status}`);
      
      // Check if file exists for PDF documents
      if (doc.content_type === 'pdf' && doc.file_path) {
        if (!fs.existsSync(doc.file_path)) {
          console.log(`❌ File does not exist: ${doc.file_path}`);
          
          // Delete related embeddings first
          const chunks = await db
            .select({ id: rag_chunks.id })
            .from(rag_chunks)
            .where(eq(rag_chunks.document_id, doc.id));
          
          if (chunks.length > 0) {
            console.log(`Deleting ${chunks.length} chunks and embeddings...`);
            
            for (const chunk of chunks) {
              await db
                .delete(rag_embeddings)
                .where(eq(rag_embeddings.chunk_id, chunk.id));
            }
            
            await db
              .delete(rag_chunks)
              .where(eq(rag_chunks.document_id, doc.id));
          }
          
          // Delete the document
          await db
            .delete(rag_documents)
            .where(eq(rag_documents.id, doc.id));
          
          console.log(`✅ Deleted invalid document ${doc.id}`);
        } else {
          console.log(`✅ File exists, updating status to failed to prevent processing`);
          await db
            .update(rag_documents)
            .set({
              processing_status: 'failed',
              error_message: 'File path validation failed - marked as failed to prevent processing loop'
            })
            .where(eq(rag_documents.id, doc.id));
        }
      } else if (doc.processing_status === 'pending' && !doc.file_path && doc.content_type === 'pdf') {
        console.log(`❌ PDF document without file path`);
        await db
          .update(rag_documents)
          .set({
            processing_status: 'failed',
            error_message: 'PDF document missing file path'
          })
          .where(eq(rag_documents.id, doc.id));
        console.log(`✅ Updated document ${doc.id} status to failed`);
      }
    }
    
    console.log('\n✅ Cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run cleanup
cleanupInvalidDocuments()
  .then(() => {
    console.log('Database cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });