# RAG-Livia Integration: livia_configuration_id Implementation

## Visão Geral

Implementação completa da integração entre o sistema RAG (Retrieval-Augmented Generation) e as configurações da assistente virtual Livia através do campo `livia_configuration_id` na metadata da tabela `documents` e na view `v_n8n_clinic_config`.

## Arquitetura da Solução

### 1. Tabela Documents - Metadata Enhancement

A tabela `documents` já possuía os campos:
- `clinic_id` (INTEGER) - Isolamento multi-tenant
- `knowledge_base_id` (INTEGER) - Organização por base de conhecimento
- `metadata` (JSONB) - Metadados flexíveis

**Nova adição:**
- `livia_configuration_id` (STRING) na metadata - Referência direta à configuração da Livia

### 2. Estrutura da Metadata Atualizada

```json
{
  "title": "Documento Exemplo",
  "source": "pdf_chunk",
  "clinic_id": "1",
  "knowledge_base_id": "11",
  "livia_configuration_id": "1",  // ← NOVO CAMPO
  "file_name": "documento.pdf",
  "created_at": "2025-07-01T13:44:37.055Z",
  "created_by": "cr@caiorodrigo.com.br",
  "processing_status": "completed"
}
```

### 3. View v_n8n_clinic_config Atualizada

A view agora inclui o campo `livia_configuration_id` para consultas diretas no N8N:

```sql
CREATE VIEW v_n8n_clinic_config AS
SELECT 
  wn.clinic_id,
  wn.phone_number,
  wn.instance_name,
  lc.id as livia_configuration_id,  -- ← NOVO CAMPO
  lc.general_prompt AS prompt_personalizado,
  lc.is_active AS livia_ativa,
  lc.created_at AS livia_configurada_em,
  lc.updated_at AS livia_atualizada_em,
  lc.connected_knowledge_base_ids,
  -- ... outros campos
FROM whatsapp_numbers wn
LEFT JOIN livia_configurations lc ON lc.clinic_id = wn.clinic_id
WHERE wn.status IN ('connected', 'open')
  AND wn.is_deleted = false
ORDER BY wn.clinic_id;
```

## Implementação Técnica

### Migração de Dados

1. **Identificação**: Localizar todos os documents sem `livia_configuration_id`
2. **Relacionamento**: Conectar via `clinic_id` com `livia_configurations`
3. **Atualização**: Adicionar o ID da configuração na metadata
4. **Validação**: Verificar integridade referencial

### Script de Migração

```typescript
// Consulta para identificar documents sem livia_configuration_id
const documentsNeedingUpdate = await db.execute(sql`
  SELECT d.id, d.metadata, lc.id as livia_config_id
  FROM documents d
  LEFT JOIN livia_configurations lc ON lc.clinic_id = (d.metadata->>'clinic_id')::integer
  WHERE d.metadata IS NOT NULL 
    AND d.metadata->>'livia_configuration_id' IS NULL
    AND lc.id IS NOT NULL;
`);

// Atualização da metadata
const updatedMetadata = {
  ...currentMetadata,
  livia_configuration_id: doc.livia_config_id.toString()
};

await db.execute(sql`
  UPDATE documents 
  SET metadata = ${JSON.stringify(updatedMetadata)}
  WHERE id = ${doc.id};
`);
```

## Uso no N8N

### 1. Obter Configuração da Livia

```sql
SELECT livia_configuration_id, prompt_personalizado, connected_knowledge_base_ids
FROM v_n8n_clinic_config 
WHERE phone_number = '{{ $json.from }}';
```

### 2. Filtrar Documents por Livia Config

```sql
SELECT id, content, metadata 
FROM documents 
WHERE metadata->>'livia_configuration_id' = '[config_id_obtido]'
  AND metadata->>'clinic_id' = '[clinic_id]';
```

### 3. Busca Semântica com Livia Filter

```sql
SELECT id, content, metadata,
       1 - (embedding <=> '[query_embedding]') as similarity
FROM documents 
WHERE metadata->>'livia_configuration_id' = '[config_id]'
  AND 1 - (embedding <=> '[query_embedding]') > 0.8
ORDER BY similarity DESC
LIMIT 5;
```

## Benefícios da Implementação

### 1. Isolamento Refinado
- Documents agora podem ser filtrados por configuração específica da Livia
- Cada clínica pode ter múltiplas configurações da Livia com knowledge bases distintos

### 2. Performance Otimizada
- Consultas diretas via metadata->>'livia_configuration_id' 
- Índices JSONB do Supabase otimizam consultas por metadata

### 3. Flexibilidade N8N
- Workflows podem escolher configuração específica baseada no contexto
- Suporte a múltiplos assistentes por clínica no futuro

### 4. Integridade Referencial
- Relacionamento claro entre documents e configurações da Livia
- Facilita manutenção e debugging

## Estatísticas de Implementação

### Migração Realizada
- **Documents Migrados**: 2 de 2 (100% de cobertura)
- **Configurações Livia**: 1 ativa (Clínica 1)
- **Knowledge Bases Conectadas**: [11, 2]
- **Primary Knowledge Base**: 11

### Estrutura Resultante
```
documents (2)
├── Doc 9: "Amorafone - Parte 1" → Livia Config 1
└── Doc 10: "Amorafone - Parte 2" → Livia Config 1

v_n8n_clinic_config
└── Clínica 1: Phone 551150391104 → Livia Config 1
```

## Schema TypeScript Atualizado

```typescript
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
}).extend({
  content: z.string().min(1, "Content é obrigatório"),
  metadata: z.object({
    clinic_id: z.number().min(1, "clinic_id é obrigatório"),
    knowledge_base_id: z.number().optional(),
    livia_configuration_id: z.number().optional(), // ← NOVO CAMPO
    document_title: z.string().optional(),
    source: z.string().optional(),
    // ... outros campos
  }),
});
```

## Casos de Uso

### 1. Personalização por Contexto
- Clínica odontológica pode ter configuração específica para emergências
- Configuração diferente para agendamentos de rotina

### 2. A/B Testing
- Testar diferentes prompts da Livia com subconjuntos de knowledge bases
- Medir eficácia por configuração específica

### 3. Especialização por Profissional
- Cada profissional pode ter configuração personalizada da Livia
- Knowledge bases específicos por especialidade

## Próximos Passos

1. **Automação**: Criar trigger para adicionar `livia_configuration_id` automaticamente em novos documents
2. **Interface**: Implementar seleção de configuração da Livia na interface de upload de documents
3. **Métricas**: Adicionar tracking de uso por configuração da Livia
4. **Backup**: Sistema de backup/restore específico por configuração

## Conclusão

A implementação da integração RAG-Livia através do `livia_configuration_id` estabelece uma base sólida para personalização avançada da assistente virtual, mantendo isolamento multi-tenant e permitindo configurações flexíveis por contexto, profissional ou especialidade médica.

**Status**: ✅ PRODUÇÃO - Sistema completamente funcional e validado