# Sistema de Logs Centralizada - Fase 1 MVP

## Visão Geral
Sistema de auditoria centralizado para rastrear todas as ações críticas da plataforma médica. Implementa compliance LGPD/CFM e visibilidade total das operações.

## ✅ Implementado na Fase 1

### 1. Estrutura de Banco de Dados
- **Tabela**: `system_logs`
- **Localização**: `shared/schema.ts`
- **Inicialização**: Automática no startup do servidor

```sql
CREATE TABLE system_logs (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  action_type VARCHAR(100) NOT NULL,
  actor_id UUID,
  actor_type VARCHAR(50),
  actor_name VARCHAR(255),
  professional_id INTEGER,
  related_entity_id INTEGER,
  previous_data JSONB,
  new_data JSONB,
  changes JSONB,
  source VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Serviços Implementados

#### SystemLogsService (`server/services/system-logs.service.ts`)
- `logContactAction()` - Logs de contatos
- `logAppointmentAction()` - Logs de agendamentos  
- `logMessageAction()` - Logs de mensagens
- `getPatientTimeline()` - Timeline do paciente
- `getRecentActivity()` - Atividade recente da clínica
- `getProfessionalActivity()` - Atividade por profissional
- `getActivityStats()` - Estatísticas de atividade

### 3. Middlewares Automáticos

#### System Logs Middleware (`server/middleware/system-logs.middleware.ts`)
- `contactLogsMiddleware` - Aplicado às rotas de contatos
- `appointmentLogsMiddleware` - Aplicado às rotas de agendamentos
- `messageLogsMiddleware` - Para futuras rotas de mensagens
- `conversationLogsMiddleware` - Para futuras rotas de conversas

### 4. Rotas API Disponíveis

#### Base: `/api/system-logs/`

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/patient/:contactId` | GET | Timeline completa do paciente |
| `/recent` | GET | Atividade recente da clínica |
| `/professional/:professionalId` | GET | Atividade do profissional |
| `/stats` | GET | Estatísticas de atividade |
| `/filter` | GET | Logs filtrados por tipo |
| `/test` | POST | Teste do sistema de logs |

### 5. Integração Atual

#### Rotas com Logs Automáticos
- **Contatos**: POST, PUT, PATCH em `/api/contacts`
- **Agendamentos**: POST, PUT, PATCH, DELETE em `/api/appointments`

#### Tipos de Ação Suportados
```typescript
'created' | 'updated' | 'deleted' | 'status_changed' | 
'sent' | 'received' | 'ai_response' | 'filled' | 'reviewed' |
'rescheduled' | 'no_show' | 'completed' | 'cancelled' |
'connected' | 'disconnected' | 'archived'
```

#### Tipos de Entidade
```typescript
'contact' | 'appointment' | 'message' | 'conversation' | 
'medical_record' | 'anamnesis' | 'whatsapp_number'
```

#### Tipos de Ator
```typescript
'professional' | 'patient' | 'system' | 'ai'
```

## 🔄 Como Funciona

### 1. Captura Automática
Os middlewares interceptam operações de CUD (Create, Update, Delete) e capturam:
- Estado anterior dos dados (para updates/deletes)
- Estado novo dos dados
- Contexto da requisição (IP, user-agent, sessão)
- Identificação do usuário

### 2. Log Estruturado
Cada log contém:
- **Identificação**: Que entidade, qual ação
- **Autoria**: Quem fez, quando fez
- **Dados**: Estado antes/depois, mudanças específicas
- **Contexto**: Origem, sessão, IP

### 3. Consulta Otimizada
Índices criados para performance:
- `idx_logs_clinic_entity` - Busca por entidade
- `idx_logs_actor` - Busca por ator
- `idx_logs_timeline` - Timeline cronológica
- `idx_logs_professional` - Atividade por profissional

## 🧪 Testando o Sistema

### 1. Teste Básico
```bash
curl -X POST http://localhost:5000/api/system-logs/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Criar um Contato (Teste Real)
```bash
curl -X POST http://localhost:5000/api/contacts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Teste Log", "phone": "+5511999999999"}'
```

### 3. Ver Timeline do Paciente
```bash
curl http://localhost:5000/api/system-logs/patient/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Ver Atividade Recente
```bash
curl http://localhost:5000/api/system-logs/recent \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Exemplos de Resposta

### Timeline do Paciente
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "clinic_id": 1,
      "entity_type": "contact",
      "entity_id": 1,
      "action_type": "created",
      "actor_id": "uuid-here",
      "actor_type": "professional",
      "actor_name": "Dr. João",
      "new_data": {"name": "Maria Silva", "phone": "+5511999999999"},
      "source": "web",
      "created_at": "2025-06-23T21:30:00Z"
    }
  ],
  "total": 1,
  "contactId": 1,
  "clinicId": 1
}
```

### Estatísticas de Atividade
```json
{
  "success": true,
  "data": {
    "total_actions": 45,
    "by_entity_type": {
      "contact": 15,
      "appointment": 25,
      "message": 5
    },
    "by_action_type": {
      "created": 20,
      "updated": 15,
      "deleted": 5,
      "status_changed": 5
    },
    "by_actor_type": {
      "professional": 40,
      "system": 5
    }
  },
  "period": "30 days",
  "clinicId": 1
}
```

## 🔐 Segurança e Compliance

### Isolamento Multi-Tenant
- Todos os logs são isolados por `clinic_id`
- Middleware de tenant context aplicado automaticamente
- Consultas sempre filtradas pela clínica do usuário

### Auditoria LGPD/CFM
- Rastreabilidade completa: quem, quando, o quê
- Histórico de mudanças preservado
- Identificação de acesso e origem

### Performance
- Índices otimizados para consultas frequentes
- Cache-friendly para consultas repetitivas
- Assíncrono - não bloqueia operações principais

## 🚀 Próximas Fases

### Fase 2 - Logs Detalhados (1 semana)
- Logs de prontuários médicos
- Logs de anamneses
- Logs de integrações de calendário
- Logs de configurações

### Fase 3 - Interface de Consulta (2 semanas)
- Dashboard de auditoria
- Relatórios de compliance
- Exportação de logs
- Interface de timeline do paciente

## 🛡️ Garantias da Implementação

1. **Sistema atual não afetado** - Logs são adicionais, falhas não quebram operações
2. **Performance mantida** - Operações de log são assíncronas
3. **Multi-tenant seguro** - Isolamento por clínica garantido
4. **Extensível** - Facilmente expandível para novos tipos de entidade
5. **Compliance ready** - Estrutura preparada para auditoria médica

---

> Sistema implementado com sucesso e testado. Pronto para integração futura com frontend.