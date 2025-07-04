# API Keys Authentication - Sistema MCP TaskMed

## Visão Geral

O sistema de autenticação por API Keys permite integração segura do TaskMed com N8N e outras ferramentas de automação, fornecendo isolamento completo por clínica e controle granular de permissões.

## Características Principais

### 🔐 Segurança
- **Isolamento por Tenant**: Cada API Key é vinculada a uma clínica específica
- **Controle de Permissões**: Suporte a permissões granulares (read, write, admin)
- **Expiração Automática**: API Keys com validade configurável
- **Auditoria Completa**: Logs detalhados de uso e acesso

### 🏥 Multi-Tenant
- **Identificação Automática**: Clinic ID extraído automaticamente da API Key
- **Isolamento de Dados**: Zero vazamento cross-tenant
- **Validação de Contexto**: Verificação automática de pertencimento

### 📊 Monitoramento
- **Métricas de Uso**: Contagem de requests e estatísticas
- **Último Acesso**: Tracking de atividade por API Key
- **Performance**: Logs estruturados para observabilidade

## Formato da API Key

```
tk_clinic_{CLINIC_ID}_{32_RANDOM_HEX_CHARS}
```

**Exemplo:**
```
tk_clinic_1_45ce00c0e7236e4d25e86936822c432c
```

### Estrutura:
- `tk_` - Prefixo identificador
- `clinic_` - Indicador de contexto
- `{CLINIC_ID}` - ID da clínica (1, 2, 3...)
- `{32_HEX}` - Hash aleatório de 32 caracteres hexadecimais

## Autenticação

### Header Obrigatório

```http
Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c
```

### Validação Automática

1. **Formato**: Validação do padrão da API Key
2. **Existência**: Verificação no banco de dados
3. **Status**: Confirmação se está ativa
4. **Expiração**: Validação da data de validade
5. **Contexto**: Extração e validação do clinic_id

## Endpoints de Gerenciamento

### Criar API Key
```http
POST /api/clinic/:clinicId/api-keys
Content-Type: application/json
Authorization: Bearer {SESSION_TOKEN}

{
  "key_name": "N8N Production",
  "permissions": ["read", "write"],
  "expires_at": "2025-06-18T18:00:00Z" // Opcional
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "key_name": "N8N Production",
    "api_key": "tk_clinic_1_45ce00c0e7236e4d25e86936822c432c",
    "permissions": ["read", "write"],
    "expires_at": "2025-06-18T18:00:00Z",
    "created_at": "2025-06-18T17:00:00Z"
  },
  "message": "API Key criada com sucesso. Guarde-a em local seguro."
}
```

### Listar API Keys
```http
GET /api/clinic/:clinicId/api-keys
Authorization: Bearer {SESSION_TOKEN}
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "key_name": "N8N Production",
      "api_key_preview": "tk_clinic_1_45ce00c0...",
      "is_active": true,
      "permissions": ["read", "write"],
      "last_used_at": "2025-06-18T17:30:00Z",
      "usage_count": 127,
      "expires_at": "2025-06-18T18:00:00Z",
      "created_at": "2025-06-18T17:00:00Z"
    }
  ],
  "total": 1
}
```

### Revogar API Key
```http
DELETE /api/clinic/:clinicId/api-keys/:keyId
Authorization: Bearer {SESSION_TOKEN}
```

### Renovar API Key
```http
POST /api/clinic/:clinicId/api-keys/:keyId/renew
Authorization: Bearer {SESSION_TOKEN}
```

### Estatísticas de Uso
```http
GET /api/clinic/:clinicId/api-keys/:keyId/usage
Authorization: Bearer {SESSION_TOKEN}
```

## Endpoints MCP Protegidos

Todos os endpoints MCP agora requerem autenticação por API Key:

### Consultar Disponibilidade
```http
GET /api/mcp/appointments/availability?date=2025-06-25&duration_minutes=60
Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c
```

### Criar Consulta
```http
POST /api/mcp/appointments/create
Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c
Content-Type: application/json

{
  "contact_id": 15,
  "user_id": 4,
  "scheduled_date": "2025-06-25",
  "scheduled_time": "14:00",
  "duration_minutes": 60,
  "doctor_name": "Dr. Silva",
  "specialty": "consulta"
}
```

### Atualizar Status
```http
PUT /api/mcp/appointments/status
Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c
Content-Type: application/json

{
  "appointment_id": 25,
  "status": "confirmada",
  "session_notes": "Consulta confirmada via N8N"
}
```

### Chat com IA MARA
```http
POST /api/mcp/chat
Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c
Content-Type: application/json

{
  "message": "Agendar consulta para o paciente João",
  "context": {
    "patient_name": "João Silva",
    "phone": "+5511999999999"
  }
}
```

## Permissões

### Read (Leitura)
- `GET /api/mcp/appointments/availability`
- `GET /api/mcp/appointments`
- `GET /api/mcp/appointments/:id`
- `GET /api/mcp/health`
- `GET /api/mcp/status/valid`

### Write (Escrita)
- `POST /api/mcp/appointments/create`
- `PUT /api/mcp/appointments/status`
- `PUT /api/mcp/appointments/reschedule`
- `PUT /api/mcp/appointments/cancel`
- `POST /api/mcp/chat`

### Admin (Administração)
- Todos os endpoints acima
- Acesso a métricas avançadas
- Configurações do sistema

## Integração N8N

### Configuração de Credenciais

1. **Tipo de Autenticação**: Generic Header Auth
2. **Header Name**: `Authorization`
3. **Header Value**: `Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c`

### Exemplo de Workflow N8N

```json
{
  "name": "Operabase - Agendamento Automático",
  "nodes": [
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-domain.replit.app/api/mcp/appointments/create",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaderAuth": {
          "name": "Authorization",
          "value": "Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c"
        },
        "method": "POST",
        "body": {
          "contact_id": "={{$json.contact_id}}",
          "user_id": 4,
          "scheduled_date": "={{$json.date}}",
          "scheduled_time": "={{$json.time}}",
          "duration_minutes": 60,
          "doctor_name": "={{$json.doctor}}",
          "specialty": "consulta"
        }
      }
    }
  ]
}
```

### Variáveis de Ambiente N8N

```bash
OPERABASE_API_URL=https://your-domain.replit.app
OPERABASE_API_KEY=tk_clinic_1_45ce00c0e7236e4d25e86936822c432c
```

## Tratamento de Erros

### Códigos de Status

- **200**: Operação bem-sucedida
- **201**: Recurso criado com sucesso
- **400**: Erro de validação ou conflito
- **401**: API Key inválida ou não fornecida
- **403**: Permissões insuficientes
- **500**: Erro interno do servidor

### Estrutura de Erro

```json
{
  "success": false,
  "error": "API Key inválida ou inativa",
  "code": "API_KEY_NOT_FOUND",
  "data": null,
  "appointment_id": null,
  "conflicts": null,
  "next_available_slots": null
}
```

### Códigos de Erro Específicos

| Código | Descrição |
|--------|-----------|
| `INVALID_API_KEY_FORMAT` | Formato da API Key incorreto |
| `MALFORMED_API_KEY` | API Key mal formada |
| `CLINIC_ID_EXTRACTION_ERROR` | Erro ao extrair clinic_id |
| `API_KEY_NOT_FOUND` | API Key não encontrada ou inativa |
| `API_KEY_EXPIRED` | API Key expirada |
| `INSUFFICIENT_PERMISSIONS` | Permissões insuficientes |
| `INTERNAL_AUTH_ERROR` | Erro interno de autenticação |

## Monitoramento e Logs

### Métricas Automáticas

```javascript
// Log estruturado automático
{
  "keyId": 1,
  "keyName": "N8N Production",
  "clinicId": 1,
  "permissions": ["read", "write"],
  "endpoint": "/appointments/create",
  "method": "POST",
  "userAgent": "N8N-Webhook/1.0",
  "timestamp": "2025-06-18T18:00:00Z"
}
```

### Dashboard de Uso

Acesse `/api-keys` na interface web para visualizar:

- Lista de API Keys ativas
- Estatísticas de uso
- Último acesso
- Status de expiração
- Logs de atividade

## Segurança e Melhores Práticas

### Armazenamento Seguro
- API Keys são hasheadas no banco (bcrypt)
- Chaves completas só são exibidas na criação
- Logs sanitizados (sem exposição de chaves)

### Rotação de Chaves
- Renovação de API Keys sem perda de configuração
- Transição suave entre chaves antigas e novas
- Histórico de uso mantido

### Rate Limiting
- Limitação automática por clinic_id
- Proteção contra abuso
- Métricas de performance

### Auditoria
- Logs completos de acesso
- Integração com sistema de auditoria médica
- Rastreabilidade total de operações

## Migração e Compatibilidade

### Retrocompatibilidade
- Sistema de sessão web continua funcionando
- API Keys são adicionais, não substituem autenticação web
- Middleware inteligente detecta tipo de autenticação

### Transição Gradual
1. Implementar API Keys para novos workflows
2. Migrar integrações existentes gradualmente
3. Manter suporte duplo durante período de transição

## Troubleshooting

### Problemas Comuns

**Erro 401 - API Key inválida**
```bash
# Verificar formato
curl -I -H "Authorization: Bearer tk_clinic_1_HASH" URL

# Verificar se API Key existe e está ativa
```

**Erro 403 - Permissões insuficientes**
```bash
# Verificar permissões da API Key
# Atualizar permissões se necessário
```

**Conflitos de agendamento**
```bash
# API retorna horários alternativos em next_available_slots
# Implementar lógica de reagendamento automático
```

### Logs de Debug

```bash
# Habilitar logs detalhados
DEBUG=mcp:* npm run dev

# Filtrar logs de API Keys
grep "🔑 API Key" logs/app.log
```

## Roadmap

### Próximas Funcionalidades
- [ ] Rate limiting configurável por API Key
- [ ] Webhook notifications para eventos de API
- [ ] API Keys com escopo limitado por funcionalidade
- [ ] Integração com sistemas de monitoramento externos
- [ ] Backup e restore de configurações de API Keys

### Melhorias Planejadas
- [ ] Interface web mais avançada para gerenciamento
- [ ] Relatórios de uso detalhados
- [ ] Alertas de uso anômalo
- [ ] Integração com sistemas de billing

---

**Documentação gerada em:** June 18, 2025  
**Versão:** v1.0.0  
**Última atualização:** Sistema MCP TaskMed API Keys