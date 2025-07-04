import { db } from "./db";

/**
 * Configuração inicial do sistema RAG isolado
 * Cria tabelas e índices necessários para o sistema RAG
 */
export async function initializeRAGSystem() {
  try {
    console.log('🚀 Inicializando sistema RAG...');

    // Habilitar extensão vector
    await db.execute(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('✅ Extensão vector habilitada');

    // Criar tabelas RAG se não existirem
    await createRAGTables();
    
    // Criar índices vetoriais
    await createVectorIndexes();
    
    // Criar função de busca semântica
    await createSearchFunction();

    console.log('✅ Sistema RAG inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema RAG:', error);
    throw error;
  }
}

async function createRAGTables() {
  // Knowledge Bases para organização (compatível com sistema oficial LangChain)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      created_by TEXT
    );
  `);

  // Tabela documents oficial LangChain/Supabase
  await db.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id BIGSERIAL PRIMARY KEY,
      content TEXT,
      metadata JSONB,
      embedding VECTOR(1536)
    );
  `);

  // Documentos RAG
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rag_documents (
      id SERIAL PRIMARY KEY,
      external_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_type VARCHAR(10) NOT NULL CHECK (content_type IN ('pdf', 'url', 'text')),
      source_url TEXT,
      file_path TEXT,
      original_content TEXT,
      extracted_content TEXT,
      metadata JSONB DEFAULT '{}',
      processing_status VARCHAR(20) DEFAULT 'pending',
      error_message TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Chunks de texto
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rag_chunks (
      id SERIAL PRIMARY KEY,
      document_id INTEGER REFERENCES rag_documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Embeddings vetoriais
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rag_embeddings (
      id SERIAL PRIMARY KEY,
      chunk_id INTEGER REFERENCES rag_chunks(id) ON DELETE CASCADE,
      embedding VECTOR(1536),
      model_used VARCHAR(50) DEFAULT 'text-embedding-3-small',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Consultas para analytics
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rag_queries (
      id SERIAL PRIMARY KEY,
      external_user_id TEXT NOT NULL,
      query_text TEXT NOT NULL,
      results_count INTEGER,
      response_time_ms INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('✅ Tabelas RAG criadas');
}

async function createVectorIndexes() {
  // Índices para knowledge_bases
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_knowledge_bases_clinic ON knowledge_bases(clinic_id);`);
  
  // Índices para documents (estrutura oficial LangChain)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin ON documents USING gin (metadata);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_documents_clinic_id ON documents ((metadata->>'clinic_id'));`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_documents_knowledge_base_id ON documents ((metadata->>'knowledge_base_id'));`);

  // Índice vetorial HNSW para busca semântica (estrutura oficial)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_documents_embedding_hnsw 
    ON documents 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  `);

  console.log('✅ Índices RAG criados');
}

async function createSearchFunction() {
  await db.execute(`
    CREATE OR REPLACE FUNCTION rag_similarity_search(
      query_embedding VECTOR(1536),
      user_id_param TEXT,
      match_threshold FLOAT DEFAULT 0.7,
      match_count INTEGER DEFAULT 10
    )
    RETURNS TABLE(
      chunk_id INTEGER,
      document_id INTEGER,
      content TEXT,
      similarity FLOAT,
      document_title TEXT,
      content_type VARCHAR
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        c.id as chunk_id,
        c.document_id,
        c.content,
        1 - (e.embedding <=> query_embedding) as similarity,
        d.title as document_title,
        d.content_type
      FROM rag_embeddings e
      JOIN rag_chunks c ON e.chunk_id = c.id
      JOIN rag_documents d ON c.document_id = d.id
      WHERE d.external_user_id = user_id_param
        AND d.processing_status = 'completed'
        AND (1 - (e.embedding <=> query_embedding)) > match_threshold
      ORDER BY e.embedding <=> query_embedding
      LIMIT match_count;
    END;
    $$ LANGUAGE plpgsql;
  `);

  console.log('✅ Função de busca semântica criada');
}