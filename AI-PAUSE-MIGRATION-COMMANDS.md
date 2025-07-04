# ETAPA 2: Comandos de Migração - Sistema de Pausa Automática da IA

## Status do Sistema
- ✅ **Schema TypeScript**: Atualizado com campos de pausa automática
- ✅ **Lógica de Backend**: Implementada no AiPauseService 
- ✅ **Integração**: Conectada ao endpoint de envio de mensagens
- ❌ **Banco de Dados**: Necessária migração manual (colunas não existem)

## Comandos SQL para Executar no Supabase

### 1. Adicionar Colunas de Pausa Automática

Execute estes comandos no **SQL Editor** do painel do Supabase:

```sql
-- Adicionar coluna ai_paused_until (controla até quando IA fica pausada)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_until TIMESTAMPTZ NULL;

-- Adicionar coluna ai_paused_by_user_id (rastreia quem causou a pausa)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_paused_by_user_id INTEGER NULL;

-- Adicionar coluna ai_pause_reason (motivo da pausa)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_pause_reason VARCHAR(50) NULL;
```

### 2. Adicionar Comentários Explicativos

```sql
-- Documentar as colunas
COMMENT ON COLUMN conversations.ai_paused_until IS 'Data/hora até quando a IA deve ficar pausada automaticamente. NULL = não pausada';
COMMENT ON COLUMN conversations.ai_paused_by_user_id IS 'ID do usuário que causou a pausa automática da IA';
COMMENT ON COLUMN conversations.ai_pause_reason IS 'Motivo da pausa automática: manual_message, user_request, etc.';
```

### 3. Criar Índices de Performance

```sql
-- Índice para buscar conversas pausadas por clínica
CREATE INDEX IF NOT EXISTS idx_conversations_ai_paused_clinic 
ON conversations(clinic_id, ai_paused_until) 
WHERE ai_paused_until IS NOT NULL;

-- Índice para buscar conversas por usuário que pausou
CREATE INDEX IF NOT EXISTS idx_conversations_paused_by_user 
ON conversations(ai_paused_by_user_id) 
WHERE ai_paused_by_user_id IS NOT NULL;
```

## Lógica do Sistema

### Como Funciona

1. **ai_active** (campo existente):
   - Controle manual via botão IA na interface
   - `false` = IA desativada até reativação manual
   - `true` = IA ativa (mas ainda sujeita à pausa automática)

2. **ai_paused_until** (campo novo):
   - Pausa automática temporária
   - Ativada quando profissional envia mensagem manual
   - Usa tempo configurado na Lívia (ex: 60 minutos)
   - `null` = não pausada, `data futura` = pausada até essa data

3. **Lógica Integrada**:
   ```
   IA responde APENAS quando:
   ai_active = true E (ai_paused_until é null OU já expirou)
   ```

### Cenários de Uso

| ai_active | ai_paused_until | IA Responde? | Situação |
|-----------|-----------------|--------------|----------|
| `true` | `null` | ✅ Sim | Normal - IA ativa |
| `true` | `futuro` | ❌ Não | Pausada por mensagem manual |
| `true` | `passado` | ✅ Sim | Pausa expirou |
| `false` | `null` | ❌ Não | Desativada manualmente |
| `false` | `futuro` | ❌ Não | Desativada + pausada |

### Fluxo de Pausa Automática

1. **Usuário envia mensagem manual**:
   - Sistema detecta: `sender_type = 'professional'` E `device_type = 'manual'`
   - Busca configuração da Lívia (duração da pausa)
   - Calcula `ai_paused_until = agora + duração_configurada`
   - Atualiza conversa com campos de pausa

2. **IA tenta responder**:
   - Verifica `ai_active = true`
   - Verifica `ai_paused_until` (null ou expirado)
   - Só responde se ambas condições satisfeitas

3. **Pausa expira automaticamente**:
   - Sistema limpa campos de pausa
   - IA volta a responder normalmente

## Após Executar a Migração

Execute o teste para validar:
```bash
tsx test-ai-pause-system-complete.ts
```

## Próximos Passos

Após a migração:
- ✅ ETAPA 3: Testar sistema completo
- ✅ ETAPA 4: Validar integração com configuração da Lívia  
- ✅ ETAPA 5: Implementar controles visuais no frontend
- ✅ ETAPA 6: Documentar sistema completo