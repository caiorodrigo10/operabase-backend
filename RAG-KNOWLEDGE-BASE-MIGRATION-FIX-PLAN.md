# Plano de Correção: Sistema de Base de Conhecimento após Migração RAG

## Situação Atual

**Status**: ❌ QUEBRADO - Sistema de knowledge bases não funciona após migração RAG  
**Data**: 30 de junho de 2025  
**Impacto**: Criação de bases, upload PDF, crawler URL, listagem - tudo offline  

## Análise do Problema

### 1. **Raiz do Problema**
A migração RAG removeu **completamente** as 4 tabelas do sistema antigo:
- ❌ `rag_knowledge_bases` (REMOVIDA)
- ❌ `rag_documents` (REMOVIDA) 
- ❌ `rag_chunks` (REMOVIDA)
- ❌ `rag_embeddings` (REMOVIDA)

Mas o sistema de **knowledge bases** ainda depende dessas tabelas antigas.

### 2. **Nova Estrutura RAG (Funcionando)**
✅ Tabela `documents` oficial LangChain:
```sql
CREATE TABLE documents (
  id bigint PRIMARY KEY,
  content text,                    -- Document.pageContent
  metadata jsonb,                  -- Document.metadata (multi-tenant)
  embedding vector(1536)           -- OpenAI embeddings
);
```

### 3. **Sistema Quebrado (Frontend + Backend)**
- ❌ **Frontend**: `/base-conhecimento` - tenta listar `rag_knowledge_bases`
- ❌ **Backend**: `/api/rag/knowledge-bases` - consulta tabelas inexistentes
- ❌ **Upload PDF**: Processo completo quebrado
- ❌ **Crawler URL**: Sistema de processamento offline
- ❌ **Configuração Lívia**: Não encontra knowledge bases

## Plano de Correção Completa

### **FASE 1: Redesenhar Sistema Knowledge Bases (Meta-Structure)**

#### 1.1 Nova Tabela Knowledge Bases Compatível
```sql
-- Nova tabela compatível com documents oficial
CREATE TABLE knowledge_bases (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT
);

-- Índices para performance
CREATE INDEX idx_knowledge_bases_clinic ON knowledge_bases(clinic_id);
```

#### 1.2 Schema Drizzle Atualizado
```typescript
// shared/schema.ts - ADICIONAR
export const knowledge_bases = pgTable("knowledge_bases", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  created_by: text("created_by"),
}, (table) => [
  index("idx_knowledge_bases_clinic").on(table.clinic_id),
]);
```

### **FASE 2: Integração Documents + Knowledge Bases**

#### 2.1 Estratégia de Metadados
A tabela `documents` usa JSONB metadata para conectar com knowledge bases:
```json
{
  "clinic_id": 1,
  "knowledge_base_id": 4,
  "document_title": "Manual Procedimentos",
  "source": "pdf_upload",
  "uploaded_at": "2025-06-30T19:56:04.237Z"
}
```

#### 2.2 Funções de Busca Otimizadas
```sql
-- Buscar documentos por knowledge base
SELECT * FROM match_documents_clinic(
  embedding_vector,
  clinic_id,
  knowledge_base_id,  -- Filtro específico
  match_count,
  threshold
);
```

### **FASE 3: Reescrever APIs RAG Completas**

#### 3.1 Endpoints Knowledge Bases
- `GET /api/rag/knowledge-bases` - Listar bases da clínica
- `POST /api/rag/knowledge-bases` - Criar nova base
- `PUT /api/rag/knowledge-bases/:id` - Editar base
- `DELETE /api/rag/knowledge-bases/:id` - Deletar base + documentos

#### 3.2 Endpoints Documentos
- `POST /api/rag/documents` - Adicionar documento com embedding
- `POST /api/rag/documents/upload` - Upload PDF → processamento
- `POST /api/rag/documents/url` - Crawler URL → processamento
- `GET /api/rag/documents` - Listar por knowledge_base_id
- `DELETE /api/rag/documents/:id` - Remover documento

### **FASE 4: Sistema de Processamento**

#### 4.1 Pipeline PDF
```
1. Upload PDF → Supabase Storage
2. Extração texto → PDF-parse
3. Chunking → LangChain TextSplitter
4. Embedding → OpenAI API
5. Storage → documents table
```

#### 4.2 Pipeline URL Crawler
```
1. URL Input → Validation
2. Crawling → Puppeteer/Cheerio
3. Text extraction → Clean HTML
4. Chunking → TextSplitter  
5. Embedding → OpenAI
6. Storage → documents table
```

### **FASE 5: Frontend Atualizado**

#### 5.1 Base Conhecimento Page
- ✅ Listar knowledge bases da clínica
- ✅ Criar/editar/deletar bases
- ✅ Upload PDF funcional
- ✅ Add URL crawler funcional
- ✅ Contador de documentos por base

#### 5.2 Configuração Lívia
- ✅ Seleção de knowledge bases funcionando
- ✅ Contadores corretos de documentos
- ✅ Integração com sistema RAG

## Cronograma de Implementação

### **DIA 1 (Hoje)** - Fundação
- [x] ✅ Análise completa do problema
- [ ] 🔄 FASE 1: Schema knowledge_bases
- [ ] 🔄 FASE 2: Integração metadata
- [ ] 🔄 FASE 3: APIs básicas (CRUD knowledge bases)

### **DIA 2** - Processamento
- [ ] 📋 FASE 4: Pipeline PDF completo
- [ ] 📋 FASE 4: Pipeline URL crawler
- [ ] 📋 Teste de upload e processamento

### **DIA 3** - Frontend
- [ ] 📋 FASE 5: Base conhecimento page
- [ ] 📋 FASE 5: Configuração Lívia fix
- [ ] 📋 Validação completa end-to-end

## Arquivos que Precisam de Alteração

### **Backend**
- `shared/schema.ts` - Adicionar knowledge_bases table
- `server/rag-routes-clean.ts` - Reescrever APIs completas  
- `server/db.ts` - Export knowledge_bases
- `server/storage.ts` - Suporte às novas tabelas

### **Frontend**
- `client/src/pages/base-conhecimento/BasesConhecimento.tsx` - Atualizar queries
- `client/src/pages/livia-config.tsx` - Corrigir knowledge bases loading
- APIs calls - Atualizar endpoints para nova estrutura

### **Migração**
- Script de migração para criar knowledge_bases
- Script para migrar dados existentes (se houver)
- Validação da nova estrutura

## Benefícios da Nova Arquitetura

### ✅ **Compatibilidade Total**
- Sistema RAG oficial LangChain preservado
- Knowledge bases como meta-estrutura organizacional
- Zero conflito entre sistemas

### ✅ **Performance Otimizada**  
- Busca semântica via match_documents_clinic
- Filtros por clinic_id + knowledge_base_id
- Índices otimizados para consultas rápidas

### ✅ **Funcionalidade Completa**
- Upload PDF com chunking automático
- URL crawler com extração inteligente
- Busca semântica multi-tenant
- Organização por bases de conhecimento

### ✅ **Escalabilidade**
- Arquitetura preparada para múltiplas clínicas
- Sistema de metadados flexível
- Compatibilidade com futuras atualizações LangChain

## Próximos Passos Imediatos

1. **Criar tabela knowledge_bases no schema**
2. **Implementar APIs CRUD básicas**
3. **Testar criação de base de conhecimento**
4. **Implementar processamento de documentos**
5. **Validar frontend funcionando**

---

**Status**: 📋 PLANO CRIADO - Pronto para implementação  
**Duração Estimada**: 2-3 dias para sistema completo  
**Prioridade**: ALTA - Sistema crítico para funcionalidade IA  