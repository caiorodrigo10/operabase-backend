# Plano de Sistema RAG Isolado com Supabase

## 1. Arquitetura do Sistema RAG

### 1.1 Visão Geral da Arquitetura

O sistema RAG será implementado como um módulo completamente isolado que opera independentemente das funcionalidades existentes da aplicação. A arquitetura seguirá o padrão de microserviços internos, garantindo que não haja interferência com workflows atuais.

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA RAG ISOLADO                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend RAG        │  API RAG           │  Processing     │
│  ┌─────────────┐    │  ┌──────────┐     │  ┌────────────┐ │
│  │ Upload UI   │────┼─▶│ REST API │────▶│  │ Doc Proc.  │ │
│  │ Search UI   │    │  │ Endpoints│     │  │ Embedding  │ │
│  │ Results UI  │◀───┼──│ Query    │◀────┤  │ Chunking   │ │
│  └─────────────┘    │  └──────────┘     │  └────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              SUPABASE VECTOR DATABASE                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Documents   │  │ Chunks      │  │ Vector Embeddings   │ │
│  │ Table       │  │ Table       │  │ (pgvector)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Princípios de Isolamento

**Separação Completa de Dados:**
- Todas as tabelas RAG terão prefixo `rag_` para evitar conflitos
- Nenhuma foreign key para tabelas existentes do sistema
- Armazenamento independente de documentos e metadados

**API Isolada:**
- Endpoints RAG com prefixo `/api/rag/`
- Middleware específico sem afetar rotas existentes
- Sistema de autenticação próprio baseado em tokens

**Frontend Modular:**
- Componentes RAG em diretório isolado `/rag/`
- Rotas RAG com prefixo `/rag/`
- Estilos e assets independentes

### 1.3 Fluxo de Dados

```
Input (PDF/URL/Text) → Processing Queue → Text Extraction → 
Chunking → Embedding Generation → Vector Storage → 
Search Interface → Query Processing → Results Ranking
```

---

## 2. Schema do Banco de Dados

### 2.1 Estrutura de Tabelas Isoladas

```sql
-- Documentos RAG (isolado do sistema principal)
CREATE TABLE rag_documents (
  id SERIAL PRIMARY KEY,
  external_user_id TEXT NOT NULL, -- ID do usuário (não FK)
  title TEXT NOT NULL,
  content_type VARCHAR(10) CHECK (content_type IN ('pdf', 'url', 'text')),
  source_url TEXT, -- Para URLs
  file_path TEXT, -- Para PDFs
  original_content TEXT, -- Para texto direto
  extracted_content TEXT, -- Texto processado
  metadata JSONB DEFAULT '{}',
  processing_status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chunks de texto para embeddings
CREATE TABLE rag_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Embeddings vetoriais
CREATE TABLE rag_embeddings (
  id SERIAL PRIMARY KEY,
  chunk_id INTEGER REFERENCES rag_chunks(id) ON DELETE CASCADE,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small
  model_used VARCHAR(50) DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Consultas RAG para analytics
CREATE TABLE rag_queries (
  id SERIAL PRIMARY KEY,
  external_user_id TEXT NOT NULL,
  query_text TEXT NOT NULL,
  results_count INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_rag_documents_user ON rag_documents(external_user_id);
CREATE INDEX idx_rag_documents_status ON rag_documents(processing_status);
CREATE INDEX idx_rag_chunks_document ON rag_chunks(document_id);
CREATE INDEX idx_rag_embeddings_chunk ON rag_embeddings(chunk_id);

-- Índice vetorial para busca semântica
CREATE INDEX idx_rag_embeddings_vector ON rag_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 2.2 Configuração Supabase Vector

```sql
-- Habilitar extensão vector (se não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS vector;

-- Função de busca semântica isolada
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
```

---

## 3. Pipeline de Processamento

### 3.1 Arquitetura de Processamento

```typescript
interface RAGProcessor {
  processDocument(documentId: number): Promise<void>;
  extractContent(document: RAGDocument): Promise<string>;
  chunkContent(content: string): Promise<RAGChunk[]>;
  generateEmbeddings(chunks: RAGChunk[]): Promise<void>;
}

interface RAGDocument {
  id: number;
  contentType: 'pdf' | 'url' | 'text';
  sourceUrl?: string;
  filePath?: string;
  originalContent?: string;
}

interface RAGChunk {
  documentId: number;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata: Record<string, any>;
}
```

### 3.2 Processadores Específicos por Tipo

#### 3.2.1 Processador de PDF
```typescript
class RAGPDFProcessor {
  async extractText(filePath: string): Promise<string> {
    // Usar pdf-parse para extrair texto
    // Preservar formatação básica
    // Extrair metadados (páginas, autor, etc.)
  }
  
  async chunkByPages(content: string): Promise<RAGChunk[]> {
    // Dividir por páginas primeiro
    // Chunks de 800-1200 tokens
    // Overlap de 150 tokens entre chunks
    // Manter referência da página nos metadados
  }
}
```

#### 3.2.2 Processador de URL
```typescript
class RAGURLProcessor {
  async extractContent(url: string): Promise<string> {
    // Usar puppeteer para conteúdo dinâmico
    // Extrair apenas texto principal
    // Remover navegação, sidebar, footer
    // Preservar estrutura de headings
  }
  
  async scheduleRefresh(documentId: number): Promise<void> {
    // Sistema de refresh periódico
    // Detectar mudanças no conteúdo
    // Reprocessar apenas se houver alterações
  }
}
```

#### 3.2.3 Processador de Texto
```typescript
class RAGTextProcessor {
  async processPlainText(content: string): Promise<RAGChunk[]> {
    // Dividir por parágrafos
    // Chunks menores (400-600 tokens)
    // Preservar contexto semântico
    // Manter estrutura de markdown se presente
  }
}
```

### 3.3 Sistema de Embeddings

```typescript
class RAGEmbeddingService {
  private openai: OpenAI;
  
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000) // Limite de tokens
    });
    return response.data[0].embedding;
  }
  
  async batchProcess(chunks: RAGChunk[]): Promise<void> {
    // Processar em lotes de 100
    // Rate limiting para API OpenAI
    // Retry com backoff exponencial
    // Progress tracking para UI
  }
}
```

### 3.4 Workflow de Processamento

```typescript
class RAGWorkflow {
  async processNewDocument(documentId: number): Promise<void> {
    const steps = [
      () => this.updateStatus(documentId, 'extracting'),
      () => this.extractContent(documentId),
      () => this.updateStatus(documentId, 'chunking'),
      () => this.chunkContent(documentId),
      () => this.updateStatus(documentId, 'embedding'),
      () => this.generateEmbeddings(documentId),
      () => this.updateStatus(documentId, 'completed')
    ];
    
    for (const step of steps) {
      try {
        await step();
      } catch (error) {
        await this.updateStatus(documentId, 'failed', error.message);
        throw error;
      }
    }
  }
}
```

---

## 4. APIs Principais

### 4.1 Estrutura de Endpoints

```typescript
// Endpoints isolados com prefixo /api/rag/
const ragEndpoints = {
  // Gerenciamento de documentos
  'POST /api/rag/documents': 'uploadDocument',
  'GET /api/rag/documents': 'listDocuments', 
  'GET /api/rag/documents/:id': 'getDocument',
  'DELETE /api/rag/documents/:id': 'deleteDocument',
  
  // Busca semântica
  'POST /api/rag/search': 'semanticSearch',
  'POST /api/rag/search/similar': 'findSimilar',
  
  // Status de processamento
  'GET /api/rag/processing/:id': 'getProcessingStatus',
  'POST /api/rag/reprocess/:id': 'reprocessDocument',
  
  // Analytics
  'GET /api/rag/analytics': 'getAnalytics'
};
```

### 4.2 Implementação de APIs

#### 4.2.1 Upload de Documentos
```typescript
interface UploadDocumentRequest {
  type: 'pdf' | 'url' | 'text';
  title: string;
  content?: string; // Para texto
  url?: string;     // Para URL
  file?: File;      // Para PDF
}

interface UploadDocumentResponse {
  documentId: number;
  status: 'queued';
  estimatedProcessingTime: number;
}
```

#### 4.2.2 Busca Semântica
```typescript
interface SearchRequest {
  query: string;
  maxResults?: number;
  threshold?: number;
  contentTypes?: ('pdf' | 'url' | 'text')[];
}

interface SearchResponse {
  results: SearchResult[];
  totalFound: number;
  queryTime: number;
}

interface SearchResult {
  chunkId: number;
  documentId: number;
  content: string;
  similarity: number;
  documentTitle: string;
  contentType: string;
  metadata: Record<string, any>;
}
```

#### 4.2.3 Status de Processamento
```typescript
interface ProcessingStatus {
  documentId: number;
  status: 'pending' | 'extracting' | 'chunking' | 'embedding' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  errorMessage?: string;
  estimatedTimeRemaining?: number;
}
```

### 4.3 Middleware de Autenticação RAG

```typescript
class RAGAuth {
  static async authenticateUser(req: Request): Promise<string> {
    // Sistema de autenticação isolado
    // Baseado em JWT tokens ou API keys
    // Não depende do sistema de auth principal
    // Retorna external_user_id
  }
  
  static async rateLimitCheck(userId: string): Promise<boolean> {
    // Rate limiting específico para RAG
    // Limites por usuário/hora
    // Independente de outros limites do sistema
  }
}
```

---

## 5. Cronograma de Implementação

### Semana 1-2: Infraestrutura Base
**Objetivos:**
- [ ] Configurar Supabase Vector (extensão pgvector)
- [ ] Criar schema de banco isolado
- [ ] Implementar estrutura básica de APIs
- [ ] Setup de autenticação RAG
- [ ] Configurar ambiente de desenvolvimento

**Entregáveis:**
- Database schema funcional
- Endpoints básicos de CRUD
- Sistema de autenticação isolado
- Documentação inicial da API

### Semana 3-4: Processamento de Documentos
**Objetivos:**
- [ ] Implementar processador de texto
- [ ] Desenvolvedor processador de PDF
- [ ] Criar processador de URL
- [ ] Sistema de chunking inteligente
- [ ] Integração com OpenAI embeddings

**Entregáveis:**
- Pipeline completo de processamento
- Sistema de chunking otimizado
- Integração funcional com OpenAI
- Testes unitários dos processadores

### Semana 5-6: Busca e Retrieval
**Objetivos:**
- [ ] Implementar busca semântica
- [ ] Sistema de ranking de resultados
- [ ] Busca híbrida (semântica + lexical)
- [ ] Otimização de performance
- [ ] Cache de consultas frequentes

**Entregáveis:**
- Sistema de busca funcional
- Algoritmos de ranking
- Performance otimizada (<500ms)
- Métricas de relevância

### Semana 7-8: Interface Frontend
**Objetivos:**
- [ ] Criar interface de upload
- [ ] Desenvolver interface de busca
- [ ] Sistema de visualização de resultados
- [ ] Dashboard de documentos
- [ ] Indicadores de status de processamento

**Entregáveis:**
- Interface completa e funcional
- UX otimizada para RAG
- Componentes reutilizáveis
- Testes de interface

### Semana 9-10: Testes e Otimização
**Objetivos:**
- [ ] Testes de integração completos
- [ ] Otimização de performance
- [ ] Testes de carga
- [ ] Documentação de usuário
- [ ] Deploy em produção

**Entregáveis:**
- Sistema totalmente testado
- Performance otimizada
- Documentação completa
- Sistema em produção

### Semana 11-12: Monitoramento e Refinamento
**Objetivos:**
- [ ] Sistema de monitoramento
- [ ] Analytics de uso
- [ ] Feedback de usuários
- [ ] Refinamentos baseados em uso real
- [ ] Documentação final

**Entregáveis:**
- Sistema monitorado
- Métricas de performance
- Feedback incorporado
- Documentação final

---

## Considerações Técnicas

### Isolamento do Sistema
- **Namespace separado:** Todos os componentes RAG usam prefixos específicos
- **Dados independentes:** Nenhuma dependência de dados existentes
- **APIs isoladas:** Endpoints completamente separados
- **Frontend modular:** Componentes em diretório isolado

### Performance e Escalabilidade
- **Processamento assíncrono:** Documentos processados em background
- **Cache inteligente:** Cache de embeddings e resultados frequentes
- **Índices otimizados:** HNSW para busca vetorial eficiente
- **Rate limiting:** Controle de uso por usuário

### Segurança e Privacidade
- **Autenticação própria:** Sistema de auth específico para RAG
- **Isolamento de dados:** Cada usuário acessa apenas seus documentos
- **Sanitização:** Limpeza de conteúdo extraído
- **Backup isolado:** Backup específico dos dados RAG

### Monitoramento e Analytics
- **Métricas de uso:** Queries por usuário, documentos processados
- **Performance tracking:** Tempo de processamento, qualidade de busca
- **Error monitoring:** Tracking de falhas e recuperação
- **Cost tracking:** Monitoramento de custos de embedding

Este plano garante que o sistema RAG seja implementado como um módulo completamente isolado, sem interferir nas funcionalidades existentes da aplicação, enquanto fornece capacidades avançadas de busca semântica e processamento de documentos.