# Sistema de Logs - Documentação Técnica Completa

## Visão Geral

O TaskMed implementa um sistema de logs centralizado e abrangente para auditoria, compliance e monitoramento de todas as ações realizadas na plataforma. O sistema é projetado para ambientes multi-tenant com isolamento de dados por clínica e suporte a alta performance.

### Arquitetura do Sistema de Logs

O sistema possui **duas camadas principais** de logging:

1. **System Logs (Database)** - Logs estruturados persistidos no PostgreSQL
2. **Structured Logger (File System)** - Logs categorizados salvos em arquivos JSONL

---

## 1. System Logs (Database) - Camada Principal

### 1.1 Tabela `system_logs`

**Localização**: `shared/schema.ts` (linhas 665-711)
**Inicialização**: `server/init-system-logs.ts`
**Serviço**: `server/services/system-logs.service.ts`

#### Estrutura da Tabela

```sql
CREATE TABLE system_logs (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL,
  
  -- Identificação da ação
  entity_type VARCHAR(50) NOT NULL,    -- 'contact', 'appointment', 'message', etc.
  entity_id INTEGER,                   -- ID da entidade afetada
  action_type VARCHAR(100) NOT NULL,   -- 'created', 'updated', 'deleted', etc.
  
  -- Identificação do ator
  actor_id UUID,                       -- ID do usuário que executou a ação
  actor_type VARCHAR(50),              -- 'professional', 'patient', 'system', 'ai'
  actor_name VARCHAR(255),             -- Nome do ator para consultas rápidas
  
  -- Contexto médico
  professional_id INTEGER,            -- Para isolamento por profissional
  related_entity_id INTEGER,          -- Relacionamentos (ex: contact_id em appointments)
  
  -- Dados da mudança
  previous_data JSONB,                 -- Estado anterior da entidade
  new_data JSONB,                      -- Estado novo da entidade
  changes JSONB,                       -- Diff específico das alterações
  
  -- Contexto da requisição
  source VARCHAR(50),                  -- 'web', 'whatsapp', 'api', 'mobile'
  ip_address VARCHAR(45),              -- IPv4/IPv6 do client
  user_agent TEXT,                     -- User agent do browser/app
  session_id VARCHAR(255),             -- ID da sessão
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Índices Otimizados

```sql
-- Consultas por clínica e entidade
CREATE INDEX idx_logs_clinic_entity ON system_logs (clinic_id, entity_type, entity_id, created_at);

-- Timeline de atividades
CREATE INDEX idx_logs_timeline ON system_logs (clinic_id, created_at DESC);

-- Atividades por profissional
CREATE INDEX idx_logs_professional ON system_logs (clinic_id, professional_id, created_at);

-- Consultas por ator
CREATE INDEX idx_logs_actor ON system_logs (clinic_id, actor_id, created_at);

-- Consultas por tipo de entidade/ação
CREATE INDEX idx_logs_entity_type ON system_logs (entity_type, action_type);
```

### 1.2 Tipos de Entidades Suportadas

| Entity Type | Descrição | Ações Principais |
|-------------|-----------|------------------|
| `contact` | Pacientes/Contatos | created, updated, deleted, status_changed |
| `appointment` | Consultas/Agendamentos | created, updated, deleted, rescheduled, completed, cancelled, no_show |
| `message` | Mensagens WhatsApp/Chat | sent, received, ai_response |
| `medical_record` | Prontuários Médicos | created, updated, deleted, signed, reviewed |
| `anamnesis` | Anamneses | created, updated, deleted, filled, reviewed, shared |
| `whatsapp_number` | Conexões WhatsApp | connected, disconnected, connecting, created, updated, deleted |
| `conversation` | Conversas | created, updated, archived, closed |

### 1.3 Métodos do SystemLogsService

#### Métodos Principais

```typescript
// Log genérico
async logAction(logData: Partial<InsertSystemLog>): Promise<SystemLog | null>

// Logs específicos por entidade
async logContactAction(action, contactId, clinicId, actorId?, ...context)
async logAppointmentAction(action, appointmentId, clinicId, actorId?, ...context)
async logMessageAction(action, messageId, clinicId, conversationId, actorId?, ...context)
async logMedicalRecordAction(action, recordId, clinicId, actorId?, ...context)
async logAnamnesisAction(action, anamnesisId, clinicId, actorId?, ...context)
async logWhatsAppAction(action, whatsappId, clinicId, actorId?, ...context)
```

#### Métodos de Consulta

```typescript
// Timeline do paciente (todas as ações relacionadas)
async getPatientTimeline(contactId: number, clinicId: number, limit?: number): Promise<SystemLog[]>

// Atividade recente da clínica
async getRecentActivity(clinicId: number, limit?: number): Promise<SystemLog[]>

// Atividade por profissional
async getProfessionalActivity(clinicId: number, professionalId: number, limit?: number): Promise<SystemLog[]>

// Estatísticas de atividade
async getActivityStats(clinicId: number, days?: number): Promise<ActivityStats>
```

#### Utilitários

```typescript
// Calcula diferenças entre estados anterior e novo
private calculateChanges(previousData: any, newData: any): any

// Extrai contexto da requisição HTTP
extractRequestContext(req: any): RequestContext
```

---

## 2. Structured Logger (File System) - Camada Observabilidade

### 2.1 Características

**Localização**: `server/shared/structured-logger.service.ts`
**Arquivos**: `/logs/{category}/{category}-{date}.jsonl`

#### Categorias de Logs

```typescript
enum LogCategory {
  AUTH = 'auth',           // Autenticação e autorização
  MEDICAL = 'medical',     // Acesso a dados médicos
  ADMIN = 'admin',         // Ações administrativas
  API = 'api',             // Chamadas de API
  SECURITY = 'security',   // Eventos de segurança
  PERFORMANCE = 'performance', // Métricas de performance
  CACHE = 'cache',         // Cache hits/misses
  AUDIT = 'audit'          // Auditoria geral
}
```

#### Níveis de Log

- **ERROR**: Erros que precisam atenção imediata
- **WARN**: Situações que podem indicar problemas
- **INFO**: Informações operacionais normais
- **DEBUG**: Detalhes técnicos (apenas desenvolvimento)

### 2.2 Estrutura dos Logs

```typescript
interface LogEntry {
  timestamp: string;           // ISO 8601
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  category: string;            // Categoria do log
  clinic_id?: number;          // Isolamento multi-tenant
  user_id?: string;            // Usuário relacionado
  action: string;              // Ação executada
  resource?: string;           // Resource afetado
  details: Record<string, any>; // Detalhes específicos
  request_id: string;          // ID único da requisição
  response_time?: number;      // Tempo de resposta em ms
  ip_address?: string;         // IP do cliente
  user_agent?: string;         // User agent
}
```

### 2.3 Recursos de Segurança

#### Sanitização Automática

Remove automaticamente informações sensíveis:
- Senhas, tokens, chaves de API
- CPF, RG, cartões de crédito
- Telefones, emails em contextos sensíveis

#### Flushing Inteligente

- **Queue**: Até 200 logs em memória
- **Flush automático**: A cada 3 segundos
- **Flush forçado**: Quando queue atinge limite
- **Flush no shutdown**: Garante persistência

### 2.4 Métodos Principais

```typescript
// Logs por nível
error(category: LogCategory, action: string, details?: object, resource?: string)
warn(category: LogCategory, action: string, details?: object, resource?: string)
info(category: LogCategory, action: string, details?: object, resource?: string)
debug(category: LogCategory, action: string, details?: object, resource?: string)

// Logs especializados
logApiCall(method: string, path: string, statusCode: number, responseTime: number, details?: object)
logAuth(action: string, success: boolean, details?: object)
logMedical(action: string, patientId?: number, details?: object)

// Consultas (Fase 3 - Implementação futura)
async queryLogs(filters: LogFilters): Promise<LogEntry[]>
getMetrics(): LoggerMetrics
```

---

## 3. Multi-Tenancy e Isolamento

### 3.1 Isolamento por Clínica

Todos os logs incluem `clinic_id` para garantir:
- **Isolamento de dados**: Clínicas não veem logs de outras
- **Consultas otimizadas**: Índices incluem clinic_id
- **Compliance**: Segregação total de informações

### 3.2 Contexto Automático

O sistema utiliza `tenantContext` para automaticamente:
- Injetar `clinic_id` nos logs
- Associar `user_id` atual
- Capturar contexto da requisição

---

## 4. Performance e Escalabilidade

### 4.1 Otimizações Database

- **Índices compostos**: Consultas sub-5ms para timeline
- **JSONB**: Busca eficiente em metadados
- **Particionamento**: Preparado para grandes volumes
- **Retenção**: Políticas de limpeza de logs antigos

### 4.2 Otimizações File System

- **Batching**: Escreve em lotes para reduzir I/O
- **Async**: Não bloqueia thread principal
- **Queue**: Buffer em memória para alta performance
- **Categorização**: Arquivos separados por categoria

### 4.3 Métricas de Performance

```typescript
interface LoggerMetrics {
  totalLogs: number;        // Total de logs processados
  errorLogs: number;        // Logs de erro
  lastFlushTime: number;    // Último flush timestamp
  flushCount: number;       // Número de flushes
  queueSize: number;        // Tamanho atual da queue
  logsPerSecond: number;    // Taxa de logs/segundo
}
```

---

## 5. Casos de Uso Práticos

### 5.1 Timeline do Paciente

```typescript
// Obter histórico completo de um paciente
const timeline = await systemLogsService.getPatientTimeline(contactId, clinicId, 50);

// Timeline inclui:
// - Criação/atualização do contato
// - Agendamentos e alterações
// - Mensagens WhatsApp
// - Prontuários médicos
// - Anamneses preenchidas
```

### 5.2 Auditoria de Consultas

```typescript
// Logs de uma consulta específica
const appointmentLogs = await db.select()
  .from(system_logs)
  .where(and(
    eq(system_logs.entity_type, 'appointment'),
    eq(system_logs.entity_id, appointmentId),
    eq(system_logs.clinic_id, clinicId)
  ))
  .orderBy(desc(system_logs.created_at));
```

### 5.3 Atividade por Profissional

```typescript
// Atividade de um profissional
const activity = await systemLogsService.getProfessionalActivity(clinicId, professionalId, 100);

// Inclui todas as ações do profissional:
// - Consultas realizadas
// - Prontuários criados
// - Mensagens enviadas
// - Alterações em pacientes
```

### 5.4 Estatísticas da Clínica

```typescript
// Estatísticas dos últimos 30 dias
const stats = await systemLogsService.getActivityStats(clinicId, 30);

// Retorna:
// {
//   total_actions: 1250,
//   by_entity_type: { contact: 300, appointment: 450, message: 500 },
//   by_action_type: { created: 200, updated: 800, sent: 250 },
//   by_actor_type: { professional: 1000, system: 200, ai: 50 }
// }
```

---

## 6. Compliance e Regulamentações

### 6.1 LGPD/GDPR

- **Pseudonimização**: IDs em vez de dados pessoais nos logs
- **Minimização**: Apenas dados necessários são logados
- **Retenção**: Políticas de exclusão após período determinado
- **Controle de acesso**: Logs isolados por clínica

### 6.2 Regulamentações Médicas

- **Rastreabilidade**: Todos os acessos a dados médicos são logados
- **Integridade**: Histórico completo de alterações
- **Não-repúdio**: Assinatura digital dos logs críticos
- **Auditoria**: Trilha completa para inspeções

### 6.3 Segurança

- **Sanitização**: Dados sensíveis são automaticamente removidos
- **Criptografia**: Logs podem ser criptografados em repouso
- **Integridade**: Hash dos logs para detectar alterações
- **Backup**: Logs são incluídos em backups seguros

---

## 7. Monitoramento e Alertas

### 7.1 Métricas Importantes

- **Taxa de logs/segundo**: Indica carga do sistema
- **Logs de erro**: Problemas que precisam atenção
- **Tempo de flush**: Performance do sistema de logs
- **Tamanho da queue**: Possível gargalo

### 7.2 Alertas Configuráveis

- **Alto volume de erros**: > 10 erros/minuto
- **Queue cheia**: Queue > 180 itens
- **Flush lento**: Tempo de flush > 5 segundos
- **Atividade suspeita**: Padrões anômalos

---

## 8. APIs e Endpoints

### 8.1 Endpoints de Consulta

```typescript
// Logs recentes da clínica
GET /api/system-logs?limit=100&entity_type=appointment

// Timeline de um paciente
GET /api/system-logs/patient/{contactId}?limit=50

// Atividade de um profissional
GET /api/system-logs/professional/{professionalId}?limit=50

// Estatísticas da clínica
GET /api/system-logs/stats?days=30
```

### 8.2 Filtros Disponíveis

- `entity_type`: Tipo de entidade
- `action_type`: Tipo de ação
- `actor_type`: Tipo de ator
- `professional_id`: ID do profissional
- `start_date` / `end_date`: Período
- `limit`: Quantidade de resultados

---

## 9. Desenvolvimento e Debug

### 9.1 Logs de Desenvolvimento

Em ambiente de desenvolvimento (`NODE_ENV=development`):
- Logs DEBUG são habilitados
- Mais detalhes são incluídos
- Console logging adicional

### 9.2 Testes e Validação

Scripts de teste disponíveis:
- `validate-complete-logging-system.js`: Validação completa
- `test-system-logs-phase2.js`: Testes específicos da Fase 2

### 9.3 Utilitários de Debug

```typescript
// Verificar métricas do logger
const metrics = structuredLogger.getMetrics();

// Testar log específico
await systemLogsService.logContactAction('updated', contactId, clinicId, userId);
```

---

## 10. Roadmap e Melhorias Futuras

### 10.1 Fase 3 - Observabilidade Avançada

- **Dashboard de logs**: Interface visual para análise
- **Alertas automáticos**: Notificações de eventos críticos
- **Relatórios**: Exportação de relatórios de auditoria
- **Machine Learning**: Detecção de anomalias

### 10.2 Integrações Externas

- **SIEM**: Integração com sistemas de monitoramento
- **Webhooks**: Notificações para sistemas externos
- **APIs**: Endpoints para ferramentas de BI
- **Exportação**: Formatos padronizados (CSV, JSON, XML)

### 10.3 Performance

- **Sharding**: Distribuição de logs por data/volume
- **Compressão**: Redução do espaço utilizado
- **Archiving**: Arquivamento automático de logs antigos
- **Cache**: Cache inteligente para consultas frequentes

---

## 11. Configuração e Deployment

### 11.1 Variáveis de Ambiente

```bash
# Logs estruturados
LOG_LEVEL=INFO                    # Nível mínimo de log
LOG_RETENTION_DAYS=90            # Retenção em dias
LOG_MAX_QUEUE_SIZE=200           # Tamanho máximo da queue
LOG_FLUSH_INTERVAL_MS=3000       # Intervalo de flush

# System logs
SYSTEM_LOGS_RETENTION_DAYS=365   # Retenção de system logs
SYSTEM_LOGS_ENABLE_PARTITIONING=true  # Particionamento por data
```

### 11.2 Inicialização

O sistema é inicializado automaticamente no `server/index.ts`:

```typescript
// Initialize System Logs
await initSystemLogsTable();
console.log('✅ System Logs initialized');

// Structured logger é inicializado automaticamente
```

### 11.3 Manutenção

Scripts de manutenção:
- Limpeza de logs antigos
- Compactação de arquivos
- Verificação de integridade
- Otimização de índices

---

## 12. Troubleshooting

### 12.1 Problemas Comuns

**Queue cheia**:
- Verificar performance do disco
- Aumentar `LOG_MAX_QUEUE_SIZE`
- Reduzir `LOG_FLUSH_INTERVAL_MS`

**Logs não aparecem**:
- Verificar permissões de escrita em `/logs`
- Confirmar inicialização da tabela `system_logs`
- Validar contexto multi-tenant

**Performance lenta**:
- Verificar índices da tabela `system_logs`
- Analisar volume de logs gerados
- Considerar particionamento

### 12.2 Comandos de Debug

```sql
-- Verificar volume de logs por clínica
SELECT clinic_id, COUNT(*) as log_count 
FROM system_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY clinic_id;

-- Logs mais frequentes
SELECT entity_type, action_type, COUNT(*) as frequency
FROM system_logs 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY entity_type, action_type
ORDER BY frequency DESC;

-- Performance dos índices
EXPLAIN ANALYZE 
SELECT * FROM system_logs 
WHERE clinic_id = 1 AND created_at > NOW() - INTERVAL '1 day';
```

---

## 13. Conclusão

O sistema de logs do TaskMed fornece uma solução robusta e escalável para auditoria, compliance e monitoramento. Com duas camadas complementares (database e file system), o sistema atende tanto necessidades operacionais quanto regulatórias, mantendo alta performance mesmo com grandes volumes de dados.

### Status Atual
- ✅ **Sistema Database**: Totalmente implementado e funcional
- ✅ **Sistema File**: Implementado com recursos avançados
- ✅ **Multi-tenancy**: Isolamento completo por clínica
- ✅ **Performance**: Otimizado para alta concorrência
- ✅ **Compliance**: Atende regulamentações médicas

### Próximos Passos
- Dashboard visual para análise de logs
- Alertas automáticos configuráveis
- Integração com ferramentas de monitoramento
- Machine learning para detecção de anomalias

O sistema está pronto para produção e pode ser estendido conforme necessário para atender requisitos específicos de cada clínica.