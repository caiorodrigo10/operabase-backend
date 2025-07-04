#!/usr/bin/env node

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';
import { EmbeddingService } from './server/rag-processors/embedding-service.js';

async function testZoutiSearch() {
  console.log('🔍 Testing RAG search for "Zouti"...');
  
  try {
    const knowledgeBaseId = 4;
    const query = "Zouti";
    
    // Check what documents exist
    console.log('\n📊 Checking knowledge base content...');
    const docsResult = await db.execute(sql`
      SELECT id, title, content_type, processing_status 
      FROM rag_documents 
      WHERE external_user_id = 'cr@caiorodrigo.com.br'
      ORDER BY id
    `);
    
    console.log(`Found ${docsResult.rows.length} documents:`);
    docsResult.rows.forEach(doc => {
      console.log(`- Doc ${doc.id}: ${doc.title} (${doc.content_type}, ${doc.processing_status})`);
    });
    
    // Check chunks containing "zouti"
    console.log('\n🔍 Searching for chunks containing "zouti"...');
    const chunksResult = await db.execute(sql`
      SELECT rc.id, rc.content, rd.title, rc.metadata
      FROM rag_chunks rc
      JOIN rag_documents rd ON rc.document_id = rd.id
      WHERE rd.external_user_id = 'cr@caiorodrigo.com.br'
      AND LOWER(rc.content) LIKE '%zouti%'
      LIMIT 10
    `);
    
    console.log(`Found ${chunksResult.rows.length} chunks containing "zouti":`);
    chunksResult.rows.forEach(chunk => {
      console.log(`\n--- Chunk ${chunk.id} from "${chunk.title}" ---`);
      console.log(chunk.content.substring(0, 200) + '...');
    });
    
    // Test embedding search
    console.log('\n🤖 Testing embedding search...');
    const embeddingService = new EmbeddingService();
    const queryEmbedding = await embeddingService.generateSingleEmbedding(query);
    console.log(`Generated embedding with ${queryEmbedding.length} dimensions`);
    
    const embeddingVector = `[${queryEmbedding.join(',')}]`;
    
    const searchResult = await db.execute(sql`
      SELECT 
        rc.content, 
        rc.metadata, 
        1 - (re.embedding <=> ${embeddingVector}::vector) as similarity,
        rd.title as document_title
      FROM rag_chunks rc
      JOIN rag_documents rd ON rc.document_id = rd.id
      JOIN rag_embeddings re ON re.chunk_id = rc.id
      WHERE rd.external_user_id = 'cr@caiorodrigo.com.br'
      ORDER BY re.embedding <=> ${embeddingVector}::vector
      LIMIT 5
    `);
    
    console.log(`\n🎯 Top ${searchResult.rows.length} semantic search results:`);
    searchResult.rows.forEach((result, index) => {
      console.log(`\n${index + 1}. Similarity: ${parseFloat(result.similarity).toFixed(4)}`);
      console.log(`   Document: ${result.document_title}`);
      console.log(`   Content: ${result.content.substring(0, 150)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error testing RAG search:', error);
  } finally {
    process.exit(0);
  }
}

testZoutiSearch();