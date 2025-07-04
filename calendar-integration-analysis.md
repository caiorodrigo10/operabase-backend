# Análise da Integração Google Calendar - Pós Limpeza

## Problemas Identificados

### 1. Incompatibilidade de Tipos de User ID
- **Schema**: `user_id: integer("user_id").references(() => users.id).notNull()`
- **Supabase Auth**: Usa UUIDs como `3cd96e6d-81f2-4c8a-a54d-3abac77b37a4`
- **Conflito**: Campo obrigatório INTEGER não aceita UUIDs

### 2. Lógica de Callback Problemática
```typescript
// No callback atual:
user_id: typeof userId === 'string' ? null : userId, // Para UUIDs usa null
```
- Viola constraint NOT NULL da tabela
- Cria registros órfãos sem referência de usuário

### 3. Busca por Email Sem Vínculo
- Sistema busca integrações apenas por email
- Não valida se o email pertence ao usuário autenticado
- Potencial vazamento de dados entre usuários

## Soluções Necessárias

### Opção 1: Alterar Schema (Recomendado)
```sql
ALTER TABLE calendar_integrations 
ALTER COLUMN user_id TYPE TEXT,
ADD CONSTRAINT fk_user_uuid FOREIGN KEY (user_id) REFERENCES auth.users(id);
```

### Opção 2: Tabela de Mapeamento
- Manter user_id INTEGER
- Adicionar campo user_uuid TEXT
- Mapear ambos os sistemas

### Opção 3: Usar Email como Chave
- Remover user_id como obrigatório
- Validar email contra usuário autenticado
- Adicionar constraint de unicidade por email

## Status Atual
- ✅ Integrações antigas removidas
- ❌ Schema incompatível com Supabase Auth
- ❌ Callback falhará na criação de novos registros
- ❌ Sistema não consegue vincular integrações aos usuários UUID

## Recomendação
Implementar Opção 1 - alterar schema para aceitar UUIDs do Supabase Auth