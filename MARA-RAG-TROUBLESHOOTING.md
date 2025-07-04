# Mara AI + RAG - Guia de Troubleshooting

## Problemas Críticos Resolvidos (PRESERVAR SOLUÇÕES)

### 1. RAG Não Retorna Contexto Relevante

**Sintomas:**
- Mara AI responde "não é um termo médico reconhecido"
- Logs mostram "Contexto RAG obtido: Não" 
- Busca semântica encontra resultados mas não usa

**Causa Raiz:**
Threshold de similaridade muito alto bloqueando resultados válidos.

**Solução Aplicada:**
```typescript
// Em server/mara-ai-service.ts - formatRAGContext()
.filter(result => result.similarity > 0.2) // ANTES: 0.7 (muito restritivo)
.slice(0, 5) // ANTES: 3 (poucos chunks)
```

**Por que funciona:**
- Similaridade 0.2-0.6 contém informações relevantes
- Threshold 0.7+ exclui 90% dos resultados úteis
- 5 chunks oferecem melhor cobertura de contexto

### 2. URLs Extraem Dados Binários Corrompidos

**Sintomas:**
- Conteúdo extraído aparece como: `|$�}���'y/C�ԧ������x�`
- Busca semântica falha completamente
- Documentos URL não produzem resultados úteis

**Causa Raiz:**
Header `Accept-Encoding: gzip, deflate` causa compressão não decodificada.

**Solução Aplicada:**
```typescript
// Em server/rag-processors/url-processor.ts - fetchHTML()
headers: {
  'Accept-Encoding': 'identity', // ANTES: 'gzip, deflate'
  // outros headers...
}
```

**Por que funciona:**
- `identity` força resposta não comprimida
- Evita corrupção de dados durante extração
- Garante texto legível para embeddings

### 3. Configurações Mara Não Carregam

**Sintomas:**
- Interface mostra "Nenhuma configuração encontrada"
- Erro: `Property 'professional_id' does not exist on type 'never'`
- RAG não é consultado mesmo com base conectada

**Causa Raiz:**
Consultas SQL usando sintaxe bruta em vez de Drizzle ORM.

**Solução Aplicada:**
```typescript
// Conversão de db.execute(sql`...`) para Drizzle ORM adequado
const result = await db.select({
  professionalId: maraProfessionalConfigs.professionalId,
  knowledgeBaseId: maraProfessionalConfigs.knowledgeBaseId,
  // ...
}).from(maraProfessionalConfigs)
 .where(eq(maraProfessionalConfigs.professionalId, professionalId));
```

### 4. Embeddings Não São Gerados

**Sintomas:**
- Documentos processados mas sem embeddings
- Busca semântica retorna 0 resultados
- Erro "embedding dimension mismatch"

**Verificações Necessárias:**
1. Chave OpenAI configurada: `OPENAI_API_KEY`
2. Modelo correto: `text-embedding-ada-002`
3. Dimensões: 1536 (não 512 ou outros)
4. Extensão pgvector ativa no PostgreSQL

## Monitoramento de Sistema Saudável

### Logs Esperados (Funcionamento Normal)

```bash
# Busca RAG bem-sucedida
🔍 RAG Debug: Searching knowledge base 4 for query: "O que é Zouti?"
📊 RAG Debug: Knowledge base 4 has 6 documents
📊 RAG Debug: Knowledge base 4 has 23 chunks  
📊 RAG Debug: Knowledge base 4 has 23 embeddings
🔍 RAG Debug: Generated query embedding with 1536 dimensions
🎯 RAG Debug: Query returned 5 results
📋 RAG Debug: Top result similarity: 0.561833605329131
📚 Contexto RAG obtido: Sim (6849 chars)
📝 RAG Context Preview: Com a Zouti você toma as decisões estratégicas...
```

### Métricas de Performance

**Tempos Aceitáveis:**
- Geração de embedding: < 2s
- Busca semântica: < 500ms
- Resposta total Mara: < 10s

**Alertas de Performance:**
- > 15s: Verificar conectividade OpenAI
- > 8s: Otimizar índices de busca vetorial
- Timeout: Revisar configurações de rede

## Comandos de Diagnóstico

### 1. Testar Busca Semântica
```bash
npx tsx test-rag-zouti.js
```

**Resultado Esperado:**
- 10+ chunks encontrados com "zouti"
- Similaridade top > 0.3
- Conteúdo legível (não binário)

### 2. Verificar Configuração Mara
```sql
SELECT 
  mpc.professional_id,
  mpc.knowledge_base_id,
  mpc.is_active,
  kb.name as knowledge_base_name,
  COUNT(rd.id) as total_documents
FROM mara_professional_configs mpc
LEFT JOIN rag_knowledge_bases kb ON mpc.knowledge_base_id = kb.id
LEFT JOIN rag_documents rd ON kb.external_user_id = rd.external_user_id
WHERE mpc.professional_id = 4
GROUP BY mpc.professional_id, mpc.knowledge_base_id, mpc.is_active, kb.name;
```

### 3. Testar Extração de URL
```bash
# Teste direto do processador
node -e "
const { URLProcessor } = require('./server/rag-processors/url-processor.ts');
const processor = new URLProcessor();
processor.extractContent('https://zouti.com.br').then(content => {
  console.log('Length:', content.length);
  console.log('Preview:', content.substring(0, 200));
  console.log('Contains target:', content.toLowerCase().includes('zouti'));
});
"
```

## Configurações de Produção

### Variáveis de Ambiente Críticas
```env
OPENAI_API_KEY=sk-...           # API OpenAI para embeddings
DATABASE_URL=postgresql://...   # PostgreSQL com pgvector
NODE_ENV=production            # Otimizações de performance
```

### Índices de Performance
```sql
-- Índice vetorial otimizado (já criado pelo sistema)
CREATE INDEX IF NOT EXISTS rag_embeddings_embedding_idx 
ON rag_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Índices de busca rápida
CREATE INDEX IF NOT EXISTS idx_rag_documents_external_user 
ON rag_documents(external_user_id);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_document 
ON rag_chunks(document_id);
```

### Limites de Sistema
- **Max chunks por documento**: 100
- **Max caracteres por chunk**: 400
- **Overlap entre chunks**: 50 caracteres
- **Max documentos por base**: 1000
- **Timeout busca semântica**: 30s

## Procedimentos de Recuperação

### 1. Reset Completo de Base RAG
```bash
# Limpeza segura (preserva outras bases)
npx tsx cleanup-and-test-zouti.js
```

### 2. Reprocessar Documentos Corrompidos
```sql
-- Identificar documentos sem embeddings
SELECT rd.id, rd.title, rd.document_type, rd.status
FROM rag_documents rd
LEFT JOIN rag_chunks rc ON rd.id = rc.document_id
LEFT JOIN rag_embeddings re ON rc.id = re.chunk_id
WHERE rd.external_user_id = 'user@example.com'
AND re.id IS NULL;

-- Marcar para reprocessamento
UPDATE rag_documents 
SET status = 'pending' 
WHERE id IN (SELECT document_id FROM above_query);
```

### 3. Verificar Integridade do Sistema
```bash
# Checklist completo
echo "1. Verificando extensão pgvector..."
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

echo "2. Testando OpenAI API..."
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

echo "3. Contando embeddings..."
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rag_embeddings;"

echo "4. Testando busca semântica..."
npx tsx test-rag-zouti.js
```

## Contacts de Emergência

**Para problemas críticos de produção:**
1. Verificar logs em tempo real: `tail -f logs/server.log`
2. Monitorar performance: APIs > 10s indicam problemas
3. Backup de emergência: Configurações Mara são críticas
4. Rollback seguro: Reverter apenas threshold de similaridade

**Indicadores de saúde do sistema:**
- ✅ Embeddings gerados: > 95% documentos
- ✅ Tempo busca semântica: < 2s média
- ✅ Taxa acerto RAG: > 80% perguntas relevantes
- ✅ Disponibilidade OpenAI: > 99.5%