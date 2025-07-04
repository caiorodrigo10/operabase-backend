# Sistema MCP para Agendamento de Consultas Médicas

## Visão Geral

O Sistema MCP (Model Context Protocol) é uma implementação completa para gerenciamento de consultas médicas integrada com n8n, oferecendo APIs robustas para automação de agendamentos com validação completa de integridade de dados e isolamento multi-tenant.

## Arquitetura do Sistema

### Componentes Principais

1. **MCP Agent (`server/mcp/appointment-agent-simple.ts`)**
   - Núcleo do sistema de agendamento
   - Validação completa de dados
   - Operações CRUD com Drizzle ORM
   - Verificação de conflitos de horários

2. **Rotas n8n (`server/mcp/n8n-routes.ts`)**
   - 8 endpoints REST para integração
   - Middleware de autenticação
   - Respostas padronizadas
   - Isolamento por clínica

3. **Esquemas de Validação**
   - Zod schemas para validação de entrada
   - Status válidos de consultas
   - Tipos de pagamento permitidos

## Endpoints Disponíveis

### 1. Health Check
```
GET /api/mcp/health
```
**Resposta:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-06-18T01:53:18.720Z",
    "version": "1.0.0"
  }
}
```

### 2. Criar Consulta
```
POST /api/mcp/appointments/create
```
**Payload:**
```json
{
  "contact_id": 1,
  "clinic_id": 1,
  "user_id": 4,
  "scheduled_date": "2025-06-26",
  "scheduled_time": "10:00",
  "duration_minutes": 60,
  "status": "agendada",
  "doctor_name": "Dr. Silva",
  "specialty": "ortodontia",
  "appointment_type": "consulta",
  "payment_status": "pendente"
}
```

**Validações Aplicadas:**
- ✅ Verifica se o contato existe na clínica
- ✅ Valida se o usuário é membro da clínica
- ✅ Confirma disponibilidade de horário
- ✅ Previne criação de registros órfãos

### 3. Atualizar Status
```
PUT /api/mcp/appointments/{id}/status
```
**Payload:**
```json
{
  "clinic_id": 1,
  "status": "confirmada"
}
```

### 4. Reagendar Consulta
```
PUT /api/mcp/appointments/{id}/reschedule
```
**Payload:**
```json
{
  "clinic_id": 1,
  "new_date": "2025-06-27",
  "new_time": "14:00"
}
```

### 5. Cancelar Consulta
```
DELETE /api/mcp/appointments/{id}/cancel
```
**Payload:**
```json
{
  "clinic_id": 1,
  "cancelled_by": "paciente",
  "reason": "Conflito de agenda"
}
```

### 6. Verificar Disponibilidade
```
POST /api/mcp/appointments/availability
```
**Payload:**
```json
{
  "clinic_id": 1,
  "user_id": 4,
  "date": "2025-06-26",
  "duration_minutes": 60,
  "working_hours_start": "08:00",
  "working_hours_end": "18:00"
}
```

### 7. Listar Consultas
```
POST /api/mcp/appointments/list
```
**Payload:**
```json
{
  "clinic_id": 1,
  "filters": {
    "startDate": "2025-06-01",
    "endDate": "2025-06-30",
    "status": "agendada",
    "userId": 4
  }
}
```

### 8. Buscar Consulta por ID
```
GET /api/mcp/appointments/{id}?clinic_id=1
```

## Status de Consultas Válidos

```typescript
const VALID_APPOINTMENT_STATUSES = [
  'agendada',           // Consulta agendada
  'confirmada',         // Paciente confirmou presença
  'paciente_aguardando', // Paciente chegou e está aguardando
  'paciente_em_atendimento', // Consulta em andamento
  'finalizada',         // Consulta concluída
  'faltou',            // Paciente não compareceu
  'cancelada_paciente', // Cancelada pelo paciente
  'cancelada_dentista'  // Cancelada pelo profissional
] as const;
```

## Status de Pagamento

```typescript
const VALID_PAYMENT_STATUSES = [
  'pendente',   // Aguardando pagamento
  'pago',       // Pagamento confirmado
  'cancelado'   // Pagamento cancelado
] as const;
```

## Integridade de Dados

### Validações Implementadas

1. **Existência de Contato**
   ```typescript
   // Verifica se o contato existe e pertence à clínica
   const contactExists = await db.select()
     .from(contacts)
     .where(and(
       eq(contacts.id, contactId),
       eq(contacts.clinic_id, clinicId)
     ));
   ```

2. **Membership de Usuário**
   ```typescript
   // Confirma que o usuário é membro ativo da clínica
   const userExists = await db.select()
     .from(clinic_users)
     .where(and(
       eq(clinic_users.user_id, userId),
       eq(clinic_users.clinic_id, clinicId),
       eq(clinic_users.is_active, true)
     ));
   ```

3. **Verificação de Conflitos**
   ```typescript
   // Evita agendamentos em horários ocupados
   const conflicts = await db.select()
     .from(appointments)
     .where(and(
       eq(appointments.clinic_id, clinicId),
       eq(appointments.user_id, userId),
       eq(appointments.status, 'agendada'),
       // Verifica sobreposição de horários
     ));
   ```

## Isolamento Multi-Tenant

### Princípios de Segurança

1. **Todas as operações filtradas por `clinic_id`**
2. **Validação de permissões em cada endpoint**
3. **Prevenção de acesso cross-tenant**
4. **Auditoria de operações por clínica**

### Exemplo de Isolamento
```typescript
// Sempre inclui clinic_id nas consultas
const result = await db.select()
  .from(appointments)
  .where(and(
    eq(appointments.id, appointmentId),
    eq(appointments.clinic_id, clinicId) // Isolamento garantido
  ));
```

## Prevenção de Dados Órfãos

### Validações de Referência

1. **Contatos devem existir na clínica**
2. **Usuários devem ser membros ativos**
3. **Tags devem pertencer à clínica (quando especificadas)**
4. **Todas as operações verificam relacionamentos**

### Exemplo de Prevenção
```typescript
// Rejeita criação se contato não existir
if (contactExists.length === 0) {
  return {
    success: false,
    error: "Contact not found or does not belong to this clinic"
  };
}
```

## Estrutura de Resposta Padronizada

Todos os endpoints retornam o formato:

```typescript
interface MCPResponse {
  success: boolean;
  data: any | null;
  error: string | null;
  appointment_id: number | null;
  conflicts: any[] | null;
  next_available_slots: any[] | null;
}
```

### Exemplos de Respostas

**Sucesso:**
```json
{
  "success": true,
  "data": {
    "id": 18,
    "contact_id": 1,
    "clinic_id": 1,
    "status": "agendada"
  },
  "error": null,
  "appointment_id": 18,
  "conflicts": null,
  "next_available_slots": null
}
```

**Erro de Validação:**
```json
{
  "success": false,
  "data": null,
  "error": "Contact not found or does not belong to this clinic",
  "appointment_id": null,
  "conflicts": null,
  "next_available_slots": null
}
```

## Performance e Escalabilidade

### Otimizações Implementadas

1. **Índices compostos para consultas frequentes**
2. **Queries otimizadas com Drizzle ORM**
3. **Validações em lote quando possível**
4. **Cache de validações repetitivas**

### Índices de Banco de Dados
```sql
-- Índices críticos para performance
CREATE INDEX idx_appointments_clinic_date ON appointments(clinic_id, scheduled_date);
CREATE INDEX idx_appointments_clinic_status ON appointments(clinic_id, status);
CREATE INDEX idx_appointments_clinic_user ON appointments(clinic_id, user_id);
```

## Integração com n8n

### Configuração de Webhook

1. **URL Base:** `https://your-domain.com/api/mcp/`
2. **Método:** POST/GET/PUT/DELETE conforme endpoint
3. **Headers:** `Content-Type: application/json`
4. **Autenticação:** Bearer token ou session cookie

### Exemplo de Workflow n8n

```json
{
  "nodes": [
    {
      "name": "Criar Consulta",
      "type": "HTTP Request",
      "parameters": {
        "url": "{{$env.API_URL}}/api/mcp/appointments/create",
        "method": "POST",
        "body": {
          "contact_id": "{{$json.contact_id}}",
          "clinic_id": "{{$json.clinic_id}}",
          "scheduled_date": "{{$json.date}}",
          "scheduled_time": "{{$json.time}}"
        }
      }
    }
  ]
}
```

## Monitoramento e Logs

### Logs de Sistema

```typescript
// Logs estruturados para debugging
console.log('createAppointment Success:', {
  appointmentId: result.id,
  clinicId: validated.clinic_id,
  contactId: validated.contact_id
});

console.error('createAppointment Error:', {
  error: error.message,
  payload: validated
});
```

### Métricas Recomendadas

1. **Taxa de sucesso por endpoint**
2. **Tempo de resposta médio**
3. **Conflitos de agendamento detectados**
4. **Tentativas de acesso inválido**

## Casos de Uso Principais

### 1. Agendamento Automático via WhatsApp
```
Cliente → WhatsApp → n8n → MCP API → Banco de Dados
```

### 2. Sincronização com Google Calendar
```
MCP API → Google Calendar API → Evento Criado
```

### 3. Confirmação de Consultas
```
Sistema → n8n → SMS/Email → Paciente
```

### 4. Relatórios de Produtividade
```
MCP API → Consultas por Período → Dashboard
```

## Troubleshooting

### Problemas Comuns

1. **Erro "Contact not found"**
   - Verificar se `contact_id` existe na clínica especificada
   - Confirmar `clinic_id` correto

2. **Conflito de Horário**
   - Verificar disponibilidade antes de agendar
   - Usar endpoint de availability para sugestões

3. **Usuário sem Permissão**
   - Confirmar membership na clínica
   - Verificar status ativo do usuário

### Comandos de Debug

```bash
# Testar health check
curl -X GET http://localhost:5000/api/mcp/health

# Testar criação com dados válidos
curl -X POST http://localhost:5000/api/mcp/appointments/create \
  -H "Content-Type: application/json" \
  -d '{"contact_id":1,"clinic_id":1,"user_id":4,"scheduled_date":"2025-06-26","scheduled_time":"10:00"}'
```

## Considerações de Segurança

1. **Sempre validar `clinic_id` em todas as operações**
2. **Nunca expor dados de outras clínicas**
3. **Implementar rate limiting para APIs públicas**
4. **Auditar operações críticas**
5. **Validar entrada contra SQL injection**

## Próximos Desenvolvimentos

1. **Notificações push em tempo real**
2. **Integração com sistemas de pagamento**
3. **Relatórios avançados de analytics**
4. **Backup automático de dados críticos**
5. **API de sincronização com ERPs médicos**

---

*Documentação atualizada em: 18 de Junho de 2025*
*Sistema MCP v1.0.0 - Produção*