# Documentação Técnica - Sistema MCP

## Configuração do Ambiente

### Variáveis de Ambiente Necessárias

```bash
# .env
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=development
PORT=5000
```

### Instalação e Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar banco de dados
npm run db:push

# 3. Iniciar servidor
npm run dev
```

## Estrutura de Arquivos

```
server/
├── mcp/
│   ├── appointment-agent-simple.ts  # Agente principal MCP
│   └── n8n-routes.ts               # Rotas para integração n8n
├── middleware/
│   └── api-key-auth.middleware.ts  # Middleware de autenticação API Keys
├── services/
│   └── api-key.service.ts          # Serviço de gerenciamento API Keys
├── routes/
│   └── api-keys.routes.ts          # Rotas de gerenciamento API Keys
└── db.ts                          # Configuração do banco
```

## Sistema de Autenticação API Keys

### Configuração

O sistema suporta dois tipos de autenticação:

1. **Sessão Web** - Para interface do usuário
2. **API Keys** - Para integrações N8N e automação

### Formato API Key

```
tk_clinic_{CLINIC_ID}_{32_HEX_CHARS}
```

### Middleware de Autenticação

O middleware `api-key-auth.middleware.ts` automaticamente:
- Valida formato da API Key
- Extrai clinic_id da chave
- Verifica permissões
- Injeta contexto da clínica na requisição

## Schema do Banco de Dados

### Tabela: appointments

```sql
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id),
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  doctor_name TEXT,
  specialty TEXT,
  appointment_type TEXT,
  scheduled_date TIMESTAMP,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'agendada',
  cancellation_reason TEXT,
  session_notes TEXT,
  payment_status TEXT DEFAULT 'pendente',
  payment_amount INTEGER,
  google_calendar_event_id TEXT,
  tag_id INTEGER REFERENCES appointment_tags(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_appointments_clinic_date ON appointments(clinic_id, scheduled_date);
CREATE INDEX idx_appointments_clinic_status ON appointments(clinic_id, status);
CREATE INDEX idx_appointments_clinic_user ON appointments(clinic_id, user_id);
```

### Relacionamentos de Dados

```mermaid
erDiagram
    CLINICS ||--o{ APPOINTMENTS : contains
    CONTACTS ||--o{ APPOINTMENTS : has
    USERS ||--o{ APPOINTMENTS : creates
    APPOINTMENT_TAGS ||--o{ APPOINTMENTS : categorizes
    
    APPOINTMENTS {
        int id PK
        int contact_id FK
        int clinic_id FK
        int user_id FK
        timestamp scheduled_date
        text status
        text payment_status
    }
```

## Validações de Dados

### Fluxo de Validação Completo

```typescript
class AppointmentMCPAgent {
  async createAppointment(params) {
    // 1. Validação de schema Zod
    const validated = CreateAppointmentSchema.parse(params);
    
    // 2. Validação de contato
    await this.validateContact(validated.contact_id, validated.clinic_id);
    
    // 3. Validação de usuário
    await this.validateUser(validated.user_id, validated.clinic_id);
    
    // 4. Verificação de conflitos
    const conflicts = await this.checkConflicts(
      validated.scheduled_date,
      validated.duration_minutes,
      validated.user_id,
      validated.clinic_id
    );
    
    // 5. Criação segura com Drizzle ORM
    const result = await db.insert(appointments)
      .values(appointmentData)
      .returning();
  }
}
```

### Schemas de Validação Zod

```typescript
const CreateAppointmentSchema = z.object({
  contact_id: z.number().int().positive(),
  clinic_id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/),
  duration_minutes: z.number().int().min(15).max(480).default(60),
  status: z.enum(VALID_APPOINTMENT_STATUSES).default('agendada'),
  doctor_name: z.string().optional(),
  specialty: z.string().optional(),
  appointment_type: z.string().optional(),
  payment_status: z.enum(VALID_PAYMENT_STATUSES).default('pendente'),
  payment_amount: z.number().int().positive().optional(),
  tag_id: z.number().int().positive().optional()
});
```

## Middleware de Segurança

### Isolamento Multi-Tenant

```typescript
// Middleware aplicado em todas as rotas MCP
export const ensureClinicAccess = async (req, res, next) => {
  const { clinic_id } = req.body || req.query;
  const userId = req.user?.id;
  
  // Verificar se usuário tem acesso à clínica
  const access = await db.select()
    .from(clinic_users)
    .where(and(
      eq(clinic_users.user_id, userId),
      eq(clinic_users.clinic_id, clinic_id),
      eq(clinic_users.is_active, true)
    ));
    
  if (access.length === 0) {
    return res.status(403).json({
      success: false,
      error: "Access denied to clinic"
    });
  }
  
  next();
};
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const mcpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    success: false,
    error: "Too many requests"
  }
});

app.use('/api/mcp', mcpRateLimit);
```

## Configuração n8n

### Exemplo de Webhook n8n

```json
{
  "name": "Agendamento Automático",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "webhook-agendamento",
        "responseMode": "responseNode"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "parameters": {
        "url": "http://localhost:5000/api/mcp/appointments/create",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaderAuth": {
          "name": "Authorization",
          "value": "Bearer {{$env.API_TOKEN}}"
        },
        "sendBody": true,
        "bodyContentType": "json",
        "jsonBody": "{\n  \"contact_id\": {{$json.contact_id}},\n  \"clinic_id\": {{$json.clinic_id}},\n  \"user_id\": {{$json.user_id}},\n  \"scheduled_date\": \"{{$json.date}}\",\n  \"scheduled_time\": \"{{$json.time}}\",\n  \"duration_minutes\": 60,\n  \"status\": \"agendada\",\n  \"appointment_type\": \"{{$json.type}}\"\n}"
      },
      "name": "Criar Consulta",
      "type": "n8n-nodes-base.httpRequest"
    }
  ]
}
```

### Tratamento de Erros n8n

```javascript
// Node de tratamento de erro
if ($json.success === false) {
  // Log do erro
  console.error('Erro no agendamento:', $json.error);
  
  // Notificar administrador
  return [{
    action: 'notify_admin',
    error: $json.error,
    payload: $input.all()
  }];
}

// Sucesso - continuar workflow
return [{
  appointment_id: $json.appointment_id,
  status: 'created'
}];
```

## Performance e Otimização

### Cache de Validações

```typescript
import NodeCache from 'node-cache';

const validationCache = new NodeCache({ stdTTL: 300 }); // 5 minutos

async validateContact(contactId: number, clinicId: number) {
  const cacheKey = `contact-${contactId}-${clinicId}`;
  const cached = validationCache.get(cacheKey);
  
  if (cached) return cached;
  
  const result = await db.select()
    .from(contacts)
    .where(and(
      eq(contacts.id, contactId),
      eq(contacts.clinic_id, clinicId)
    ));
    
  const isValid = result.length > 0;
  validationCache.set(cacheKey, isValid);
  
  return isValid;
}
```

### Conexão Pool do Banco

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // máximo 20 conexões
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Monitoramento e Logs

### Configuração de Logs Estruturados

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/mcp-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/mcp-combined.log' })
  ]
});

// Uso nos métodos MCP
logger.info('Appointment created', {
  appointmentId: result.id,
  clinicId: validated.clinic_id,
  userId: validated.user_id,
  timestamp: new Date().toISOString()
});
```

### Métricas de Performance

```typescript
import { performance } from 'perf_hooks';

class PerformanceMonitor {
  static async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      logger.info('Operation completed', {
        operation: operationName,
        duration: `${duration.toFixed(2)}ms`,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      logger.error('Operation failed', {
        operation: operationName,
        duration: `${duration.toFixed(2)}ms`,
        error: error.message
      });
      
      throw error;
    }
  }
}

// Uso
const result = await PerformanceMonitor.measureOperation(
  'createAppointment',
  () => this.createAppointment(params)
);
```

## Backup e Recuperação

### Script de Backup Automático

```bash
#!/bin/bash
# backup-mcp.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mcp"
DB_NAME="taskmed"

# Criar backup das tabelas críticas
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --table=appointments \
  --table=contacts \
  --table=clinic_users \
  --table=appointment_tags \
  --data-only \
  --format=custom \
  > "$BACKUP_DIR/mcp_data_$DATE.backup"

# Comprimir backup
gzip "$BACKUP_DIR/mcp_data_$DATE.backup"

# Manter apenas últimos 30 backups
find $BACKUP_DIR -name "mcp_data_*.backup.gz" -mtime +30 -delete

echo "Backup MCP concluído: mcp_data_$DATE.backup.gz"
```

### Restauração de Dados

```bash
#!/bin/bash
# restore-mcp.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: $0 <arquivo_backup>"
  exit 1
fi

# Descomprimir se necessário
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip $BACKUP_FILE
  BACKUP_FILE=${BACKUP_FILE%.gz}
fi

# Restaurar dados
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --clean \
  --if-exists \
  --data-only \
  $BACKUP_FILE

echo "Restauração concluída"
```

## Testes Automatizados

### Testes de Integração

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { appointmentAgent } from '../appointment-agent-simple';

describe('MCP Agent Tests', () => {
  beforeEach(async () => {
    // Limpar dados de teste
    await db.delete(appointments).where(eq(appointments.clinic_id, 999));
  });

  it('should create appointment with valid data', async () => {
    const result = await appointmentAgent.createAppointment({
      contact_id: 1,
      clinic_id: 1,
      user_id: 4,
      scheduled_date: '2025-06-26',
      scheduled_time: '10:00',
      duration_minutes: 60,
      status: 'agendada'
    });

    expect(result.success).toBe(true);
    expect(result.appointment_id).toBeTypeOf('number');
  });

  it('should reject invalid contact', async () => {
    const result = await appointmentAgent.createAppointment({
      contact_id: 999,
      clinic_id: 1,
      user_id: 4,
      scheduled_date: '2025-06-26',
      scheduled_time: '10:00'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Contact not found');
  });
});
```

### Testes de Carga

```javascript
// k6 load test
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  const payload = JSON.stringify({
    contact_id: 1,
    clinic_id: 1,
    user_id: 4,
    scheduled_date: '2025-06-26',
    scheduled_time: '10:00'
  });

  const response = http.post('http://localhost:5000/api/mcp/appointments/create', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  mcp-api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=taskmed
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.taskmed.com;

    location /api/mcp {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
}
```

---

*Documentação técnica v1.0 - Atualizada em 18/06/2025*