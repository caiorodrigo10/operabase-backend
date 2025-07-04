# MCP API Reference - TaskMed

## Visão Geral

A API MCP (Model Context Protocol) do TaskMed oferece endpoints REST completos para integração com N8N e ferramentas de automação. Cada clínica possui isolamento completo de dados através de API Keys únicas.

### Características Principais
- **Autenticação por API Key**: Cada clínica tem suas próprias chaves de acesso
- **Isolamento Multi-Tenant**: Dados completamente separados por clínica
- **Endpoints RESTful**: Seguem padrões REST com métodos HTTP apropriados
- **Validação Robusta**: Todos os parâmetros são validados antes do processamento
- **Respostas Padronizadas**: Formato consistente para todas as respostas

## Base URL

```
https://your-domain.replit.app/api/mcp
```

## Autenticação

Todos os endpoints MCP requerem autenticação via API Key no header Authorization. A API Key determina automaticamente a clínica e as permissões do usuário.

```http
Authorization: Bearer tk_clinic_{clinic_id}_{hash}
```

**Exemplo:**
```http
Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c
```

### Permissões Disponíveis
- **read**: Consultar dados (GET)
- **write**: Criar e atualizar dados (POST, PUT)
- **delete**: Remover dados (DELETE)

## Endpoints Disponíveis

### 1. Health Check

```http
GET /api/mcp/health
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-06-18T18:00:00Z",
    "clinic_id": 1
  },
  "error": null
}
```

### 2. Validar API Key

```http
GET /api/mcp/status/valid
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "api_key_valid": true,
    "clinic_id": 1,
    "permissions": ["read", "write"],
    "key_name": "N8N Production"
  },
  "error": null
}
```

### 3. Consultar Disponibilidade

```http
POST /api/mcp/appointments/availability
Content-Type: application/json

{
  "user_id": 4,
  "date": "2025-06-25",
  "duration_minutes": 60
}
```

**Parâmetros obrigatórios:**
- `user_id`: ID do profissional
- `date`: Data no formato YYYY-MM-DD

**Parâmetros opcionais:**
- `duration_minutes`: Duração em minutos (padrão: 60)
- `working_hours_start`: Horário de início (padrão: "08:00")
- `working_hours_end`: Horário de fim (padrão: "18:00")

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "date": "2025-06-25",
    "available_slots": [
      {
        "time": "09:00",
        "available": true,
        "user_id": 4,
        "user_name": "Dr. Silva"
      },
      {
        "time": "10:00",
        "available": true,
        "user_id": 4,
        "user_name": "Dr. Silva"
      }
    ],
    "total_slots": 16,
    "available_count": 12
  },
  "error": null
}
```

### 4. Listar Consultas

```http
GET /api/mcp/appointments?date=2025-06-25&status=agendada
```

**Parâmetros de Query:**
- `date` (opcional): Filtrar por data específica
- `status` (opcional): Filtrar por status (agendada, confirmada, realizada, cancelada)
- `user_id` (opcional): Filtrar por profissional
- `contact_id` (opcional): Filtrar por paciente

**Resposta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 25,
      "contact_id": 15,
      "contact_name": "João Silva",
      "user_id": 4,
      "doctor_name": "Dr. Silva",
      "specialty": "consulta",
      "scheduled_date": "2025-06-25T14:00:00Z",
      "duration_minutes": 60,
      "status": "agendada",
      "created_at": "2025-06-18T17:00:00Z"
    }
  ],
  "total": 1,
  "error": null
}
```

### 5. Obter Consulta Específica

```http
GET /api/mcp/appointments/:id
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "contact_id": 15,
    "contact_name": "João Silva",
    "contact_phone": "+5511999999999",
    "user_id": 4,
    "doctor_name": "Dr. Silva",
    "specialty": "consulta",
    "appointment_type": "consulta",
    "scheduled_date": "2025-06-25T14:00:00Z",
    "duration_minutes": 60,
    "status": "agendada",
    "session_notes": null,
    "payment_status": "pendente",
    "payment_amount": 15000,
    "created_at": "2025-06-18T17:00:00Z",
    "updated_at": "2025-06-18T17:00:00Z"
  },
  "error": null
}
```

## Endpoints de Consultas (Appointments)

### 1. Criar Consulta

**Endpoint:** `POST /api/mcp/appointments/create`

**Descrição:** Cria uma nova consulta com validação completa de conflitos e disponibilidade.

**Body da Requisição:**
```json
{
  "contact_id": 15,
  "user_id": 4,
  "scheduled_date": "2025-06-25",
  "scheduled_time": "14:00",
  "duration_minutes": 60,
  "doctor_name": "Dr. Silva",
  "specialty": "consulta",
  "appointment_type": "consulta",
  "payment_amount": 15000
}
```

**Parâmetros Obrigatórios:**
- `contact_id`: ID do paciente
- `user_id`: ID do profissional
- `scheduled_date`: Data no formato YYYY-MM-DD
- `scheduled_time`: Horário no formato HH:MM

**Parâmetros Opcionais:**
- `duration_minutes`: Duração em minutos (padrão: 60)
- `doctor_name`: Nome do profissional
- `specialty`: Especialidade
- `appointment_type`: Tipo de consulta
- `payment_amount`: Valor em centavos (ex: 15000 = R$ 150,00)

**Resposta (201):**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "contact_id": 15,
    "user_id": 4,
    "scheduled_date": "2025-06-25T14:00:00.000Z",
    "duration_minutes": 60,
    "status": "agendada",
    "doctor_name": "Dr. Silva",
    "specialty": "consulta",
    "payment_amount": 15000,
    "created_at": "2025-06-18T20:00:00.000Z"
  },
  "error": null,
  "appointment_id": 25,
  "conflicts": null,
  "next_available_slots": null
}
```

### 2. Atualizar Consulta (Unificado)

**Endpoint:** `PUT /api/mcp/appointments?id={appointment_id}`

**Descrição:** Endpoint unificado para atualizar qualquer campo da consulta: status, reagendamento, notas, pagamento, etc.

**Parâmetros:**
- `id` (query parameter): ID da consulta

**Exemplos de Uso:**

#### Atualizar Status:
```json
{
  "status": "realizada",
  "session_notes": "Consulta finalizada com sucesso"
}
```

#### Reagendar:
```json
{
  "scheduled_date": "2025-06-26",
  "scheduled_time": "15:30",
  "duration_minutes": 45
}
```

#### Atualizar Pagamento:
```json
{
  "payment_status": "pago",
  "payment_amount": 18000
}
```

#### Cancelar com Motivo:
```json
{
  "status": "cancelada",
  "cancellation_reason": "Paciente não compareceu"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "id": 12,
    "contact_id": 21,
    "clinic_id": 1,
    "user_id": 6,
    "doctor_name": "Dr. Silva",
    "specialty": "consulta",
    "scheduled_date": "2025-06-26T15:30:00.000Z",
    "duration_minutes": 45,
    "status": "confirmada",
    "session_notes": "Consulta reagendada",
    "payment_status": "pago",
    "payment_amount": 18000,
    "updated_at": "2025-06-18T20:47:36.049Z"
  },
  "error": null,
  "appointment_id": 12,
  "conflicts": null,
  "next_available_slots": null
}
```

### 3. Listar Consultas

**Endpoint:** `GET /api/mcp/appointments`

**Descrição:** Lista consultas com filtros opcionais via query parameters.

**Query Parameters:**
- `date`: Data específica (YYYY-MM-DD)
- `date_from`: Data inicial para período
- `date_to`: Data final para período
- `status`: Status da consulta
- `user_id`: ID do profissional
- `contact_id`: ID do paciente
- `limit`: Limite de resultados (padrão: 50)
- `offset`: Offset para paginação (padrão: 0)

**Exemplo:** `GET /api/mcp/appointments?date=2025-06-25&status=agendada&limit=10`

### 4. Obter Consulta Específica

**Endpoint:** `GET /api/mcp/appointments/{id}`

**Descrição:** Retorna detalhes completos de uma consulta específica.

### 5. Consultar Disponibilidade

**Endpoint:** `POST /api/mcp/appointments/availability`

**Descrição:** Consulta horários disponíveis para agendamento.

**Body da Requisição:**
```json
{
  "user_id": 4,
  "date": "2025-06-25",
  "duration_minutes": 60,
  "working_hours_start": "08:00",
  "working_hours_end": "18:00"
}
```

## Endpoints de Contatos (Contacts)

### 1. Criar Contato

**Endpoint:** `POST /api/mcp/contacts/create`

**Descrição:** Cria um novo contato/paciente no sistema.

**Body da Requisição:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "+5511999999999",
  "birth_date": "1985-03-15",
  "cpf": "12345678901",
  "address": "Rua das Flores, 123",
  "city": "São Paulo",
  "state": "SP",
  "zip_code": "01234-567"
}
```

**Parâmetros Obrigatórios:**
- `name`: Nome completo do contato

**Parâmetros Opcionais:**
- `email`: Email do contato
- `phone`: Telefone com código do país
- `birth_date`: Data de nascimento (YYYY-MM-DD)
- `cpf`: Documento CPF
- `address`, `city`, `state`, `zip_code`: Dados de endereço

**Resposta (201):**
```json
{
  "success": true,
  "data": {
    "id": 45,
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "+5511999999999",
    "birth_date": "1985-03-15",
    "cpf": "12345678901",
    "clinic_id": 1,
    "created_at": "2025-06-18T20:00:00.000Z"
  },
  "error": null
}
```

## Status de Consultas Válidos

O sistema suporta 5 status padronizados para consultas:

- **`agendada`**: Consulta marcada, aguardando confirmação
- **`confirmada`**: Consulta confirmada pelo paciente
- **`realizada`**: Consulta foi realizada com sucesso
- **`faltou`**: Paciente não compareceu na consulta
- **`cancelada`**: Consulta foi cancelada

### Endpoint para Listar Status Válidos

**Endpoint:** `GET /api/mcp/status/valid`

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "valid_statuses": [
      "agendada",
      "confirmada", 
      "realizada",
      "faltou",
      "cancelada"
    ],
    "default_status": "agendada"
  },
  "error": null
}
```

## Chat AI - Análise de Pacientes

### Conversar com IA sobre Paciente

**Endpoint:** `POST /api/mcp/chat`

**Descrição:** Permite fazer perguntas sobre um paciente usando IA que analisa o histórico completo.

**Body da Requisição:**
```json
{
  "contact_id": 15,
  "message": "Como está o progresso deste paciente?"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "response": "Baseado no histórico, João Silva tem mostrado boa evolução. Teve 3 consultas nos últimos 2 meses, com boa aderência ao tratamento...",
    "contact_id": 15,
    "timestamp": "2025-06-18T20:00:00.000Z"
  },
  "error": null
}
```

## Endpoints Utilitários

### Health Check

**Endpoint:** `GET /api/mcp/health`

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-06-18T20:00:00.000Z",
    "version": "1.0.0"
  },
  "error": null
}
```

## Formato Padrão de Respostas

Todas as respostas da API seguem o formato padronizado:

```json
{
  "success": boolean,
  "data": object | array | null,
  "error": string | null,
  "appointment_id": number | null,
  "conflicts": array | null,
  "next_available_slots": array | null
}
```

### Campos de Resposta:
- **`success`**: Indica se a operação foi bem-sucedida
- **`data`**: Dados retornados pela operação
- **`error`**: Mensagem de erro (se houver)
- **`appointment_id`**: ID da consulta (específico para endpoints de consultas)
- **`conflicts`**: Lista de conflitos encontrados (agendamentos)
- **`next_available_slots`**: Próximos horários disponíveis (agendamentos)

## Códigos de Status HTTP

- **200**: Operação bem-sucedida
- **201**: Recurso criado com sucesso
- **400**: Erro de validação ou parâmetros inválidos
- **401**: Não autorizado (API Key inválida)
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

## Exemplos de Uso com cURL

### Criar uma consulta:
```bash
curl -X POST "https://your-domain.replit.app/api/mcp/appointments/create" \
  -H "Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": 15,
    "user_id": 4,
    "scheduled_date": "2025-06-25",
    "scheduled_time": "14:00",
    "duration_minutes": 60
  }'
```

### Atualizar status de uma consulta:
```bash
curl -X PUT "https://your-domain.replit.app/api/mcp/appointments?appointment_id=12" \
  -H "Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "realizada",
    "session_notes": "Consulta finalizada com sucesso"
  }'
```

### Reagendar uma consulta:
```bash
curl -X PUT "https://your-domain.replit.app/api/mcp/appointments?id=12" \
  -H "Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduled_date": "2025-06-26",
    "scheduled_time": "15:30",
    "duration_minutes": 45
  }'
```

### Listar consultas de um dia específico:
```bash
curl -X GET "https://your-domain.replit.app/api/mcp/appointments?date=2025-06-25" \
  -H "Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c"
```

### Criar um contato:
```bash
curl -X POST "https://your-domain.replit.app/api/mcp/contacts/create" \
  -H "Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "+5511999999999"
  }'
```

### Verificar disponibilidade:
```bash
curl -X POST "https://your-domain.replit.app/api/mcp/appointments/availability" \
  -H "Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 4,
    "date": "2025-06-25",
    "duration_minutes": 60
  }'
```

## Integração com N8N

Esta API foi projetada para integração perfeita com N8N workflows. Principais características para automação:

### 1. **Webhooks Compatíveis**: Todos os endpoints retornam JSON estruturado
### 2. **Validação Robusta**: Parâmetros são validados antes do processamento
### 3. **Respostas Consistentes**: Formato padronizado para facilitar parsing
### 4. **Isolamento por Clínica**: Cada API Key acessa apenas dados da própria clínica
### 5. **Operações Unificadas**: Endpoint PUT único para todas as atualizações de consulta

### Fluxo Típico de Integração:
1. **Criar Contato** (`POST /contacts/create`)
2. **Verificar Disponibilidade** (`POST /appointments/availability`)
3. **Criar Consulta** (`POST /appointments/create`)
4. **Atualizar Status** (`PUT /appointments?id=X`)
5. **Análise com IA** (`POST /chat`)

### Configuração no N8N:

#### Nó HTTP Request - Configuração Base:
- **Authentication**: None (usar header personalizado)
- **Headers**: 
  ```
  Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c
  Content-Type: application/json
  ```

#### Exemplo de Workflow N8N:
```json
{
  "name": "Agendamento Automático",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "novo-agendamento"
      }
    },
    {
      "name": "Criar Contato",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-domain.replit.app/api/mcp/contacts/create",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c"
        },
        "body": {
          "name": "={{ $json.nome }}",
          "email": "={{ $json.email }}",
          "phone": "={{ $json.telefone }}"
        }
      }
    },
    {
      "name": "Verificar Disponibilidade",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-domain.replit.app/api/mcp/appointments/availability",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c"
        },
        "body": {
          "user_id": "={{ $json.profissional_id }}",
          "date": "={{ $json.data }}",
          "duration_minutes": 60
        }
      }
    },
    {
      "name": "Criar Consulta",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-domain.replit.app/api/mcp/appointments/create",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c"
        },
        "body": {
          "contact_id": "={{ $('Criar Contato').first().json.data.id }}",
          "user_id": "={{ $json.profissional_id }}",
          "scheduled_date": "={{ $json.data }}",
          "scheduled_time": "={{ $json.horario }}",
          "duration_minutes": 60
        }
      }
    }
  ]
}
```

### Tratamento de Erros:
- Use o campo `success` para verificar se a operação foi bem-sucedida
- Campo `error` contém mensagem detalhada em caso de falha
- Códigos HTTP seguem padrões REST para facilitar tratamento

### Dicas para N8N:
1. **Sempre validar `success: true`** antes de processar dados
2. **Usar `$('Nó Anterior').first().json.data.id`** para referenciar IDs criados
3. **Implementar retry logic** para requests que podem falhar temporariamente
4. **Logs detalhados** estão disponíveis nos headers de resposta

Essa estrutura permite automações completas de agendamento, acompanhamento e análise de pacientes através do N8N, mantendo total isolamento entre clínicas e segurança através das API Keys.

**Exemplo - Reagendamento:**
```json
{
  "scheduled_date": "2025-06-30",
  "scheduled_time": "15:30",
  "duration_minutes": 90,
  "status": "confirmada"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "updated_fields": ["status", "session_notes"],
    "appointment": {
      "id": 25,
      "contact_id": 15,
      "clinic_id": 1,
      "user_id": 4,
      "scheduled_date": "2025-06-25T14:00:00Z",
      "duration_minutes": 60,
      "status": "confirmada",
      "session_notes": "Consulta realizada com sucesso",
      "updated_at": "2025-06-18T20:19:35Z"
    }
  },
  "error": null,
  "appointment_id": 25
}
```

### 8. Atualizar Status da Consulta (DEPRECATED)

```http
PUT /api/mcp/appointments/status
Content-Type: application/json

{
  "appointment_id": 25,
  "status": "confirmada",
  "session_notes": "Consulta confirmada via automação N8N"
}
```

**Status válidos:**
- `agendada` - Consulta agendada
- `confirmada` - Consulta confirmada pelo paciente
- `realizada` - Consulta realizada
- `cancelada` - Consulta cancelada
- `reagendada` - Consulta reagendada

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "status": "confirmada",
    "session_notes": "Consulta confirmada via automação N8N",
    "updated_at": "2025-06-18T18:00:00Z"
  },
  "appointment_id": 25,
  "error": null
}
```

### 8. Reagendar Consulta

```http
PUT /api/mcp/appointments/reschedule
Content-Type: application/json

{
  "appointment_id": 25,
  "new_date": "2025-06-26",
  "new_time": "15:00",
  "reason": "Solicitação do paciente via WhatsApp"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "old_date": "2025-06-25T14:00:00Z",
    "new_date": "2025-06-26T15:00:00Z",
    "status": "reagendada",
    "reason": "Solicitação do paciente via WhatsApp"
  },
  "appointment_id": 25,
  "error": null
}
```

### 9. Cancelar Consulta

```http
PUT /api/mcp/appointments/cancel
Content-Type: application/json

{
  "appointment_id": 25,
  "cancellation_reason": "Paciente não pode comparecer"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "status": "cancelada",
    "cancellation_reason": "Paciente não pode comparecer",
    "updated_at": "2025-06-18T18:00:00Z"
  },
  "appointment_id": 25,
  "error": null
}
```

### 10. Chat Conversacional MARA

```http
POST /api/mcp/chat
Content-Type: application/json

{
  "message": "Agendar consulta para João Silva na próxima terça-feira às 14h",
  "context": {
    "patient_name": "João Silva",
    "phone": "+5511999999999",
    "preferred_time": "afternoon"
  }
}
```

**Resposta (200):**
```json
{
  "success": true,
  "data": {
    "mcp_action": "create",
    "response": "Consulta agendada para João Silva no dia 25/06/2025 às 14:00 com Dr. Silva.",
    "appointment_id": 27,
    "details": {
      "patient": "João Silva",
      "date": "2025-06-25",
      "time": "14:00",
      "doctor": "Dr. Silva",
      "duration": 60
    }
  },
  "error": null
}
```

## Estrutura de Resposta Padrão

Todos os endpoints seguem a estrutura MCPResponse:

```typescript
interface MCPResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
  appointment_id?: number | null;
  conflicts?: any[] | null;
  next_available_slots?: any[] | null;
}
```

## Códigos de Status HTTP

- **200** - Operação bem-sucedida
- **201** - Recurso criado com sucesso
- **400** - Erro de validação ou conflito de dados
- **401** - API Key inválida ou não fornecida
- **403** - Permissões insuficientes para a operação
- **404** - Recurso não encontrado
- **500** - Erro interno do servidor

## Tratamento de Erros

### Erro de Autenticação (401)

```json
{
  "success": false,
  "error": "API Key inválida ou inativa",
  "data": null,
  "appointment_id": null
}
```

### Erro de Permissão (403)

```json
{
  "success": false,
  "error": "Permissões insuficientes. Operação requer permissão 'write'",
  "data": null,
  "appointment_id": null
}
```

### Erro de Validação (400)

```json
{
  "success": false,
  "error": "Validation error: scheduled_date: Data deve estar no futuro",
  "data": null,
  "appointment_id": null
}
```

## Limites de Rate

- **100 requests/minuto** por API Key para operações de leitura
- **50 requests/minuto** por API Key para operações de escrita  
- **10 requests/minuto** para criação de consultas

Headers de rate limit incluídos nas respostas:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Exemplos de Uso N8N

### Webhook de Agendamento

```javascript
// Node HTTP Request - N8N
{
  "method": "POST",
  "url": "https://your-domain.replit.app/api/mcp/appointments/create",
  "headers": {
    "Authorization": "Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c",
    "Content-Type": "application/json"
  },
  "body": {
    "contact_id": "{{$json.contact_id}}",
    "user_id": 4,
    "scheduled_date": "{{$json.date}}",
    "scheduled_time": "{{$json.time}}",
    "duration_minutes": 60,
    "doctor_name": "Dr. Silva",
    "specialty": "consulta"
  }
}
```

### Verificação de Disponibilidade

```javascript
// Node HTTP Request - N8N
{
  "method": "GET",
  "url": "https://your-domain.replit.app/api/mcp/appointments/availability",
  "headers": {
    "Authorization": "Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c"
  },
  "qs": {
    "date": "{{$json.requested_date}}",
    "duration_minutes": "{{$json.duration || 60}}"
  }
}
```

### Atualização de Status

```javascript
// Node HTTP Request - N8N
{
  "method": "PUT",
  "url": "https://your-domain.replit.app/api/mcp/appointments/status",
  "headers": {
    "Authorization": "Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c",
    "Content-Type": "application/json"
  },
  "body": {
    "appointment_id": "{{$json.appointment_id}}",
    "status": "confirmada",
    "session_notes": "Confirmação via WhatsApp - {{$json.confirmation_time}}"
  }
}
```

## Integração com WhatsApp (via N8N)

### Fluxo de Agendamento Automático

1. **Receber mensagem WhatsApp** → N8N Webhook
2. **Processar linguagem natural** → Chat MCP endpoint
3. **Verificar disponibilidade** → Availability endpoint  
4. **Criar consulta** → Create appointment endpoint
5. **Enviar confirmação** → WhatsApp response

### Exemplo de Workflow N8N

```json
{
  "name": "TaskMed - Agendamento WhatsApp",
  "nodes": [
    {
      "name": "WhatsApp Webhook",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "name": "Processar Mensagem",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-domain.replit.app/api/mcp/chat",
        "method": "POST",
        "body": {
          "message": "={{$json.message}}",
          "context": {
            "patient_name": "={{$json.contact_name}}",
            "phone": "={{$json.phone}}"
          }
        }
      }
    },
    {
      "name": "Agendar Consulta",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-domain.replit.app/api/mcp/appointments/create"
      }
    }
  ]
}
```

## Monitoramento e Logs

### Métricas Disponíveis

- Número de requests por API Key
- Tempo de resposta médio
- Taxa de erro por endpoint
- Uso por clínica

### Logs Estruturados

```json
{
  "timestamp": "2025-06-18T18:00:00Z",
  "level": "info",
  "service": "mcp-api",
  "api_key_id": "1",
  "clinic_id": "1",
  "endpoint": "/appointments/create",
  "method": "POST",
  "response_time": "245ms",
  "status": 201,
  "user_agent": "N8N-Webhook/1.0"
}
```

---

**Documentação atualizada:** June 18, 2025  
**Versão da API:** v1.0.0  
**Suporte:** Sistema MCP TaskMed