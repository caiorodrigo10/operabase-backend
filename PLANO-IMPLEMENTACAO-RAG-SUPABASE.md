# Plano de Implementação RAG com Supabase Vector

## Análise do Sistema Atual

### Estrutura Existente da Base de Conhecimento
O sistema atual possui:
- Interface frontend organizada em coleções temáticas (ex: "Protocolos de Atendimento", "Informações da Clínica", "Cardiologia")
- Suporte para 3 tipos de conteúdo: texto, PDFs e URLs
- Navegação por sidebar com seções específicas
- Sistema de busca e filtragem básico
- Integração com assistentes de IA (Lívia, Iago, Mara)

### Gaps Identificados
- Ausência de tabelas de base de conhecimento no schema atual
- Falta de armazenamento vetorial para busca semântica
- Não há processamento de embeddings para conteúdo
- Sistema de recuperação limitado a busca textual

---

## 1. SCHEMA DE BANCO DE DADOS

### 1.1 Tabelas Principais para RAG

```sql
-- Tabela para coleções de conhecimento
CREATE TABLE knowledge_collections (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Tabela para documentos individuais
CREATE TABLE knowledge_documents (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER REFERENCES knowledge_collections(id) ON DELETE CASCADE,
  clinic_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'text', 'pdf', 'url'
  original_content TEXT, -- Conteúdo original ou URL
  processed_content TEXT, -- Texto extraído/processado
  file_path TEXT, -- Para PDFs armazenados
  metadata JSONB DEFAULT '{}', -- Metadados específicos por tipo
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para chunks de documentos
CREATE TABLE knowledge_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  clinic_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX idx_knowledge_collections_clinic ON knowledge_collections(clinic_id);
CREATE INDEX idx_knowledge_documents_collection ON knowledge_documents(collection_id);
CREATE INDEX idx_knowledge_documents_clinic ON knowledge_documents(clinic_id);
CREATE INDEX idx_knowledge_chunks_document ON knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_clinic ON knowledge_chunks(clinic_id);

-- Índice vetorial para busca semântica
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks 
USING hnsw (embedding vector_cosine_ops);
```

### 1.2 Relacionamentos e Integridade

```sql
-- Foreign keys para garantir integridade
ALTER TABLE knowledge_collections 
ADD CONSTRAINT fk_knowledge_collections_clinic 
FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE knowledge_documents 
ADD CONSTRAINT fk_knowledge_documents_clinic 
FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE knowledge_chunks 
ADD CONSTRAINT fk_knowledge_chunks_clinic 
FOREIGN KEY (clinic_id) REFERENCES clinics(id);
```

---

## 2. PIPELINE DE PROCESSAMENTO DE DOCUMENTOS

### 2.1 Arquitetura de Processamento

```typescript
interface DocumentProcessor {
  processDocument(documentId: number): Promise<void>;
  extractText(document: KnowledgeDocument): Promise<string>;
  chunkContent(content: string): Promise<ContentChunk[]>;
  generateEmbeddings(chunks: ContentChunk[]): Promise<EmbeddingChunk[]>;
  storeChunks(documentId: number, chunks: EmbeddingChunk[]): Promise<void>;
}

interface ContentChunk {
  content: string;
  index: number;
  tokenCount: number;
  metadata: Record<string, any>;
}

interface EmbeddingChunk extends ContentChunk {
  embedding: number[];
}
```

### 2.2 Estratégias por Tipo de Conteúdo

#### Processamento de PDFs
```typescript
class PDFProcessor {
  async extractText(filePath: string): Promise<string> {
    // Usar pdf-parse ou pdf2pic + OCR para PDFs escaneados
    // Preservar estrutura (títulos, parágrafos, listas)
    // Extrair metadados (autor, data, título)
  }
  
  async chunkByStructure(content: string): Promise<ContentChunk[]> {
    // Dividir por seções/capítulos primeiro
    // Chunks de 500-1000 tokens com overlap de 100 tokens
    // Preservar contexto semântico
  }
}
```

#### Processamento de URLs
```typescript
class URLProcessor {
  async extractContent(url: string): Promise<string> {
    // Usar Puppeteer/Playwright para SPA
    // Extrair apenas conteúdo principal (remover nav, footer)
    // Tratar diferentes tipos de site (artigos, documentação)
  }
  
  async scheduleReprocessing(documentId: number): Promise<void> {
    // Agendar atualização periódica do conteúdo
    // Detectar mudanças no conteúdo original
  }
}
```

#### Processamento de Texto
```typescript
class TextProcessor {
  async processPlainText(content: string): Promise<ContentChunk[]> {
    // Dividir por parágrafos ou seções lógicas
    // Manter contexto semântico
    // Chunks menores para texto livre
  }
}
```

---

## 3. ESTRATÉGIA DE ARMAZENAMENTO VETORIAL

### 3.1 Configuração do Supabase Vector

```sql
-- Habilitar extensão vector
CREATE EXTENSION IF NOT EXISTS vector;

-- Configurar índice HNSW para performance otimizada
CREATE INDEX CONCURRENTLY idx_knowledge_chunks_embedding_hnsw 
ON knowledge_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
```

### 3.2 Estratégia de Embeddings

```typescript
class EmbeddingService {
  private openai: OpenAI;
  
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small', // 1536 dimensões
      input: text.substring(0, 8000), // Limite de tokens
    });
    return response.data[0].embedding;
  }
  
  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    // Processar em lotes para otimizar custos
    // Implementar retry com backoff exponencial
    // Cache para evitar reprocessamento
  }
}
```

### 3.3 Gerenciamento de Metadados

```typescript
interface ChunkMetadata {
  documentTitle: string;
  collectionName: string;
  contentType: 'text' | 'pdf' | 'url';
  pageNumber?: number; // Para PDFs
  section?: string; // Para conteúdo estruturado
  sourceUrl?: string; // Para URLs
  lastUpdated: string;
  clinicId: number;
}
```

---

## 4. SISTEMA DE RECUPERAÇÃO (RETRIEVAL)

### 4.1 Busca Semântica

```typescript
class SemanticSearchService {
  async searchSimilarContent(
    query: string, 
    clinicId: number, 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    // 1. Gerar embedding da query
    const queryEmbedding = await this.generateEmbedding(query);
    
    // 2. Busca vetorial com filtros
    const results = await this.supabase
      .from('knowledge_chunks')
      .select(`
        id, content, metadata, document_id,
        knowledge_documents!inner(title, content_type, collection_id),
        knowledge_collections!inner(name)
      `)
      .eq('clinic_id', clinicId)
      .rpc('match_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: options.threshold || 0.7,
        match_count: options.limit || 10
      });
    
    return this.rankAndFilterResults(results, query, options);
  }
  
  private async rankAndFilterResults(
    results: any[], 
    query: string, 
    options: SearchOptions
  ): Promise<SearchResult[]> {
    // Implementar re-ranking com base em:
    // - Relevância semântica
    // - Freshness do conteúdo
    // - Tipo de conteúdo preferido
    // - Coleção de origem
  }
}
```

### 4.2 Busca Híbrida

```sql
-- Função para busca híbrida (semântica + lexical)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1536),
  clinic_id_param INTEGER,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  chunk_id INTEGER,
  content TEXT,
  similarity FLOAT,
  document_title TEXT,
  collection_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH semantic_search AS (
    SELECT 
      kc.id,
      kc.content,
      1 - (kc.embedding <=> query_embedding) AS semantic_score,
      kd.title,
      kcol.name as collection_name
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kc.document_id = kd.id
    JOIN knowledge_collections kcol ON kd.collection_id = kcol.id
    WHERE kc.clinic_id = clinic_id_param
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  lexical_search AS (
    SELECT 
      kc.id,
      kc.content,
      ts_rank(to_tsvector('portuguese', kc.content), plainto_tsquery('portuguese', query_text)) AS lexical_score,
      kd.title,
      kcol.name as collection_name
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kc.document_id = kd.id  
    JOIN knowledge_collections kcol ON kd.collection_id = kcol.id
    WHERE kc.clinic_id = clinic_id_param
    AND to_tsvector('portuguese', kc.content) @@ plainto_tsquery('portuguese', query_text)
    ORDER BY lexical_score DESC
    LIMIT match_count * 2
  )
  SELECT 
    COALESCE(s.id, l.id) as chunk_id,
    COALESCE(s.content, l.content) as content,
    COALESCE(s.semantic_score, 0) * 0.7 + COALESCE(l.lexical_score, 0) * 0.3 as similarity,
    COALESCE(s.title, l.title) as document_title,
    COALESCE(s.collection_name, l.collection_name) as collection_name
  FROM semantic_search s
  FULL OUTER JOIN lexical_search l ON s.id = l.id
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. PONTOS DE INTEGRAÇÃO

### 5.1 Frontend - Base de Conhecimento

```typescript
// Atualizar BasesConhecimento.tsx
interface KnowledgeCollection {
  id: number;
  name: string;
  description: string;
  itemCount: number;
  lastUpdated: string;
  processingStatus: 'idle' | 'processing' | 'error';
}

// Adicionar indicadores de status de processamento
const CollectionCard = ({ collection }: { collection: KnowledgeCollection }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{collection.name}</CardTitle>
        <CardDescription>{collection.description}</CardDescription>
        {collection.processingStatus === 'processing' && (
          <Badge variant="secondary">Processando embeddings...</Badge>
        )}
      </CardHeader>
    </Card>
  );
};
```

### 5.2 API Endpoints Necessários

```typescript
// server/knowledge-routes.ts
export function setupKnowledgeRoutes(app: any, storage: IStorage) {
  // CRUD para coleções
  app.post('/api/knowledge/collections', isAuthenticated, createCollection);
  app.get('/api/knowledge/collections', isAuthenticated, getCollections);
  app.put('/api/knowledge/collections/:id', isAuthenticated, updateCollection);
  app.delete('/api/knowledge/collections/:id', isAuthenticated, deleteCollection);
  
  // CRUD para documentos
  app.post('/api/knowledge/documents', isAuthenticated, upload.single('file'), createDocument);
  app.get('/api/knowledge/collections/:id/documents', isAuthenticated, getDocuments);
  app.delete('/api/knowledge/documents/:id', isAuthenticated, deleteDocument);
  
  // Busca semântica
  app.post('/api/knowledge/search', isAuthenticated, semanticSearch);
  
  // Status de processamento
  app.get('/api/knowledge/processing-status', isAuthenticated, getProcessingStatus);
  
  // Reprocessar documento
  app.post('/api/knowledge/documents/:id/reprocess', isAuthenticated, reprocessDocument);
}
```

### 5.3 Integração com Assistentes de IA

```typescript
// server/mara-ai-service.ts - Atualizar para usar RAG
class MaraAIService {
  private knowledgeService: KnowledgeRetrievalService;
  
  async analyzeContact(contactId: number, question: string, userId?: number): Promise<MaraResponse> {
    // 1. Buscar contexto do contato (existente)
    const contactContext = await this.getContactContext(contactId);
    
    // 2. Buscar conhecimento relevante via RAG
    const relevantKnowledge = await this.knowledgeService.searchRelevantContent(
      question, 
      contactContext.clinicInfo?.id || 0,
      { limit: 5, threshold: 0.7 }
    );
    
    // 3. Construir prompt enriquecido
    const enrichedPrompt = this.buildRAGPrompt(contactContext, relevantKnowledge, question);
    
    // 4. Gerar resposta com contexto ampliado
    return await this.generateResponse(enrichedPrompt);
  }
  
  private buildRAGPrompt(
    context: ContactContext, 
    knowledge: SearchResult[], 
    question: string
  ): string {
    return `
Contexto do Paciente:
${JSON.stringify(context, null, 2)}

Base de Conhecimento Relevante:
${knowledge.map(k => `- ${k.content.substring(0, 500)}...`).join('\n')}

Pergunta: ${question}

Instrução: Use o contexto do paciente e a base de conhecimento para fornecer uma resposta precisa e profissional.
`;
  }
}
```

---

## 6. IMPLEMENTAÇÃO TÉCNICA

### 6.1 Dependências Necessárias

```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1",
    "puppeteer": "^21.0.0",
    "openai": "^4.20.0",
    "@supabase/supabase-js": "^2.38.0",
    "tiktoken": "^1.0.10",
    "cheerio": "^1.0.0-rc.12",
    "mammoth": "^1.6.0"
  }
}
```

### 6.2 Workflow de Processamento

```typescript
class DocumentProcessingWorkflow {
  async processNewDocument(documentId: number): Promise<void> {
    try {
      // 1. Atualizar status
      await this.updateProcessingStatus(documentId, 'processing');
      
      // 2. Extrair conteúdo
      const content = await this.extractContent(documentId);
      
      // 3. Dividir em chunks
      const chunks = await this.chunkContent(content);
      
      // 4. Gerar embeddings
      const embeddedChunks = await this.generateEmbeddings(chunks);
      
      // 5. Armazenar no banco
      await this.storeChunks(documentId, embeddedChunks);
      
      // 6. Atualizar status
      await this.updateProcessingStatus(documentId, 'completed');
      
    } catch (error) {
      await this.updateProcessingStatus(documentId, 'failed');
      throw error;
    }
  }
}
```

### 6.3 Tratamento de Erros e Retry

```typescript
class RobustProcessingService {
  private readonly maxRetries = 3;
  private readonly backoffMs = 1000;
  
  async processWithRetry<T>(
    operation: () => Promise<T>, 
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount < this.maxRetries) {
        await this.delay(this.backoffMs * Math.pow(2, retryCount));
        return this.processWithRetry(operation, retryCount + 1);
      }
      throw error;
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 7. ARQUITETURA DO SISTEMA

### 7.1 Fluxo de Dados

```
Frontend → API → Document Processor → Embedding Service → Vector DB
                ↓
           Knowledge Retrieval ← AI Assistants ← Query Processing
```

### 7.2 Componentes Principais

1. **Document Ingestion Layer**
   - Upload handling
   - Content extraction
   - Format validation

2. **Processing Engine**
   - Text extraction
   - Chunking algorithms  
   - Embedding generation

3. **Vector Storage Layer**
   - Supabase Vector database
   - Indexing strategies
   - Metadata management

4. **Retrieval Engine**
   - Semantic search
   - Hybrid search
   - Result ranking

5. **Integration Layer**
   - API endpoints
   - Frontend components
   - AI assistant integration

### 7.3 Considerações de Performance

- **Processamento assíncrono** para uploads grandes
- **Cache de embeddings** para evitar reprocessamento
- **Índices otimizados** para consultas frequentes
- **Paginação** para resultados de busca
- **Rate limiting** para APIs externas
- **Monitoramento** de performance e custos

---

## 8. CRONOGRAMA DE IMPLEMENTAÇÃO

### Fase 1: Fundação (Semana 1-2)
- [ ] Criar tabelas de banco de dados
- [ ] Implementar modelos Drizzle
- [ ] Setup básico de processamento de documentos
- [ ] API endpoints fundamentais

### Fase 2: Processamento (Semana 3-4)
- [ ] Implementar extração de PDF
- [ ] Processamento de URLs
- [ ] Sistema de chunking
- [ ] Integração com OpenAI embeddings

### Fase 3: Busca (Semana 5-6)
- [ ] Implementar busca semântica
- [ ] Sistema de ranking
- [ ] Busca híbrida (semântica + lexical)
- [ ] Otimização de performance

### Fase 4: Integração (Semana 7-8)
- [ ] Atualizar interface frontend
- [ ] Integração com assistentes de IA
- [ ] Testes de ponta a ponta
- [ ] Otimizações finais

### Fase 5: Produção (Semana 9-10)
- [ ] Deploy e monitoramento
- [ ] Documentação de usuário
- [ ] Treinamento da equipe
- [ ] Refinamentos baseados em feedback

---

## CONCLUSÃO

Este plano fornece uma roadmap completa para implementar um sistema RAG profissional utilizando Supabase Vector. A arquitetura proposta aproveita as forças do PostgreSQL como base sólida, enquanto adiciona capacidades modernas de IA para transformar a Base de Conhecimento em um sistema inteligente de recuperação de informações.

O sistema resultante permitirá que os assistentes de IA (Lívia, Iago, Mara) acessem conhecimento contextual relevante, melhorando significativamente a qualidade de suas respostas e recomendações.