// Test script to validate semantic search functionality
const { db } = await import('./server/db.ts');
const { rag_documents, rag_chunks, rag_embeddings } = await import('./shared/schema.ts');
const { eq, sql } = await import('drizzle-orm');
const { EmbeddingService } = await import('./server/rag-processors/embedding-service.ts');
const { TextProcessor } = await import('./server/rag-processors/text-processor.ts');

async function testSemanticSearch() {
  try {
    console.log('🚀 Testando sistema de busca semântica...');
    
    // 1. Criar documento de teste
    console.log('📝 Criando documento de teste...');
    const testContent = `
      O Supabase Vector emerge como uma solução inovadora no crescente mercado de bancos de dados vetoriais.
      Os embeddings são representações numéricas de alta dimensionalidade que capturam o significado semântico.
      A busca vetorial opera no espaço semântico, permitindo encontrar conteúdo relacionado mesmo quando não há sobreposição lexical direta.
      O algoritmo HNSW é particularmente eficaz para datasets grandes, oferecendo excelente performance.
      As Edge Functions do Supabase fornecem uma plataforma serverless otimizada para processamento de AI.
    `;
    
    const [document] = await db
      .insert(rag_documents)
      .values({
        external_user_id: 'cr@caiorodrigo.com.br',
        title: 'Teste Busca Semântica',
        content_type: 'text',
        original_content: testContent.trim(),
        extracted_content: testContent.trim(),
        processing_status: 'pending',
        metadata: { test: true }
      })
      .returning();
    
    console.log(`✅ Documento criado com ID: ${document.id}`);
    
    // 2. Processar texto em chunks
    console.log('🔪 Processando texto em chunks...');
    const textProcessor = new TextProcessor();
    const chunks = await textProcessor.processText(testContent.trim(), document.id);
    
    console.log(`📊 Criados ${chunks.length} chunks`);
    
    // 3. Salvar chunks no banco
    const insertedChunks = await db
      .insert(rag_chunks)
      .values(
        chunks.map(chunk => ({
          document_id: document.id,
          chunk_index: chunk.chunkIndex,
          content: chunk.content,
          token_count: chunk.tokenCount,
          metadata: chunk.metadata
        }))
      )
      .returning();
    
    console.log(`💾 Salvos ${insertedChunks.length} chunks no banco`);
    
    // 4. Gerar embeddings
    console.log('🔮 Gerando embeddings...');
    const embeddingService = new EmbeddingService();
    const embeddingChunks = await embeddingService.generateEmbeddings(chunks);
    
    // 5. Salvar embeddings
    await db
      .insert(rag_embeddings)
      .values(
        embeddingChunks.map((chunk, index) => ({
          chunk_id: insertedChunks[index].id,
          embedding: chunk.embedding,
          model_used: 'text-embedding-3-small'
        }))
      );
    
    console.log(`🎯 Salvos ${embeddingChunks.length} embeddings`);
    
    // 6. Marcar documento como processado
    await db
      .update(rag_documents)
      .set({
        processing_status: 'completed',
        updated_at: new Date()
      })
      .where(eq(rag_documents.id, document.id));
    
    // 7. Testar busca semântica
    console.log('🔍 Testando busca semântica...');
    
    const searchQueries = [
      'bancos de dados vetoriais',
      'algoritmos de busca HNSW',
      'processamento de linguagem natural',
      'inteligência artificial serverless'
    ];
    
    for (const query of searchQueries) {
      console.log(`\n🔎 Buscando por: "${query}"`);
      
      // Gerar embedding da query
      const queryEmbedding = await embeddingService.generateSingleEmbedding(query);
      
      // Buscar chunks similares
      const results = await db.execute(sql`
        SELECT 
          c.content,
          d.title,
          d.metadata,
          1 - (e.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM rag_chunks c
        JOIN rag_documents d ON c.document_id = d.id
        JOIN rag_embeddings e ON c.id = e.chunk_id
        WHERE d.external_user_id = 'cr@caiorodrigo.com.br'
        ORDER BY e.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 3
      `);
      
      if (results.rows.length > 0) {
        console.log('✅ Resultados encontrados:');
        results.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. Similaridade: ${(row.similarity * 100).toFixed(1)}%`);
          console.log(`     Conteúdo: ${row.content.substring(0, 100)}...`);
        });
      } else {
        console.log('❌ Nenhum resultado encontrado');
      }
    }
    
    console.log('\n🎉 Teste de busca semântica concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste de busca semântica:', error);
  }
}

// Executar teste
testSemanticSearch().then(() => {
  console.log('✅ Teste finalizado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Falha no teste:', error);
  process.exit(1);
});