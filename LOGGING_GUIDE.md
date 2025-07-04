# 📋 Guia de Logging - Operabase

## 🚨 Problema Atual
- **2.786 console statements** em 244 arquivos
- Logs poluídos dificultam debugging
- Performance degradada em produção
- Informações importantes se perdem no ruído

## ✅ Nova Abordagem - Structured Logging

### **Server-Side (Node.js)**
```typescript
import { Logger } from '../shared/logger.js';

// ❌ ANTES - Logs poluídos
console.log('🚀 AppointmentsService.getAppointments called for clinic:', clinicId);
console.log('📊 DB appointments found:', appointments.length);

// ✅ DEPOIS - Structured logging
Logger.debug('Getting appointments for clinic', { clinicId, filters });
Logger.info('Appointments retrieved successfully', { 
  clinicId, 
  count: appointments.length 
});
```

### **Client-Side (React)**
```typescript
import { logger } from '../lib/logger.js';

// ❌ ANTES - Logs sempre visíveis
console.log('User clicked button:', buttonId);
console.error('API call failed:', error);

// ✅ DEPOIS - Logs controlados
logger.debug('User interaction', { action: 'button_click', buttonId });
logger.error('API call failed', { endpoint: '/api/users', error });
```

---

## 🎯 Níveis de Log

### **DEBUG** - Desenvolvimento apenas
```typescript
Logger.debug('Processing data', { userId, dataSize: data.length });
// Só aparece em NODE_ENV=development
```

### **INFO** - Informações importantes
```typescript
Logger.info('User logged in', { userId, loginMethod: 'email' });
// Aparece em todos os ambientes
```

### **WARN** - Situações anômalas
```typescript
Logger.warn('API rate limit approaching', { currentRequests: 90, limit: 100 });
// Situações que merecem atenção
```

### **ERROR** - Erros críticos
```typescript
Logger.error('Database connection failed', { 
  error: error.message, 
  stack: error.stack 
});
// Sempre logados, mesmo em produção
```

---

## 🔧 Configuração por Ambiente

### **Desenvolvimento**
```bash
NODE_ENV=development
LOG_LEVEL=DEBUG
ENABLE_DEBUG_LOGS=true
```
- Todos os logs aparecem no console
- Stack traces completos
- Logs de timing habilitados

### **Produção**
```bash
NODE_ENV=production
LOG_LEVEL=INFO
ENABLE_DEBUG_LOGS=false
```
- Apenas INFO, WARN, ERROR no console
- Logs estruturados salvos em arquivos
- Sampling de 10% para logs de alta frequência

---

## 🚀 Métodos Especiais

### **Categorias Específicas**
```typescript
// Logs de autenticação
Logger.auth('INFO', 'User login attempt', { email, success: true });

// Logs médicos (sensíveis)
Logger.medical('INFO', 'Patient record accessed', { patientId });

// Logs de performance
Logger.performance('WARN', 'Slow query detected', { query, duration: 2000 });

// Logs de segurança
Logger.security('ERROR', 'Unauthorized access attempt', { ip, endpoint });
```

### **Timing de Operações**
```typescript
Logger.time('database-query');
const result = await database.query('SELECT * FROM users');
Logger.timeEnd('database-query', { resultCount: result.length });
```

### **Logs Condicionais**
```typescript
Logger.conditional(
  process.env.NODE_ENV === 'development',
  'DEBUG',
  'Development-only debug info',
  { debugData }
);
```

---

## 📊 Frontend - Client Logger

### **Configuração**
```typescript
// .env.development
VITE_ENABLE_DEBUG_LOGS=true

// .env.production
VITE_ENABLE_DEBUG_LOGS=false
```

### **Uso em Componentes**
```typescript
import { logger } from '../lib/logger';

function UserProfile({ userId }) {
  useEffect(() => {
    logger.debug('UserProfile component mounted', { userId });
    
    fetchUserData(userId)
      .then(data => {
        logger.info('User data loaded', { userId, dataKeys: Object.keys(data) });
      })
      .catch(error => {
        logger.error('Failed to load user data', { userId, error });
      });
  }, [userId]);
}
```

### **Contextos Específicos**
```typescript
// Logs de API
logger.api('error', 'Request failed', { endpoint, status: 500 });

// Logs de UI
logger.ui('info', 'Modal opened', { modalType: 'confirmation' });

// Logs de performance
logger.performance('warn', 'Component render took too long', { 
  component: 'UserList', 
  renderTime: 150 
});
```

---

## 🛠️ Migração Automática

### **Script de Migração**
```bash
# Contar logs atuais
./scripts/migrate-logs.sh count

# Criar backup
./scripts/migrate-logs.sh backup

# Migrar automaticamente
./scripts/migrate-logs.sh migrate

# Validar migração
./scripts/migrate-logs.sh validate

# Rollback se necessário
./scripts/migrate-logs.sh rollback
```

### **Migração Manual**
```typescript
// 1. Adicionar import
import { Logger } from '../shared/logger.js';

// 2. Substituir console.log
console.log('message', data) → Logger.debug('message', data)
console.error('error', data) → Logger.error('error', data)
console.warn('warning', data) → Logger.warn('warning', data)

// 3. Estruturar dados
Logger.info('User created', { 
  userId: user.id, 
  email: user.email,
  timestamp: new Date().toISOString()
});
```

---

## 📈 Monitoramento

### **Logs Estruturados**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "category": "api",
  "clinic_id": 1,
  "user_id": "user123",
  "action": "appointment_created",
  "details": {
    "appointment_id": 456,
    "scheduled_date": "2024-01-20T14:00:00.000Z"
  },
  "request_id": "abc123",
  "response_time": 150
}
```

### **Arquivos de Log**
```
logs/
├── api/
│   ├── api-2024-01-15.jsonl
│   └── api-2024-01-16.jsonl
├── auth/
│   └── auth-2024-01-15.jsonl
├── medical/
│   └── medical-2024-01-15.jsonl
└── performance/
    └── performance-2024-01-15.jsonl
```

---

## 🎯 Boas Práticas

### **✅ Faça**
- Use níveis apropriados (DEBUG para desenvolvimento, INFO para produção)
- Inclua contexto relevante nos logs
- Use categorias específicas para diferentes domínios
- Estruture dados como objetos, não strings concatenadas
- Inclua IDs únicos para rastreamento

### **❌ Não Faça**
- Não use console.log em código de produção
- Não logue informações sensíveis (senhas, tokens)
- Não crie logs excessivamente verbosos
- Não use strings concatenadas para dados estruturados
- Não ignore configurações de ambiente

### **Exemplo Completo**
```typescript
// ❌ RUIM
console.log('User ' + userId + ' created appointment at ' + new Date());

// ✅ BOM
Logger.info('Appointment created', {
  userId,
  appointmentId: appointment.id,
  scheduledDate: appointment.scheduled_date,
  clinicId: appointment.clinic_id,
  duration: appointment.duration
});
```

---

## 📝 Próximos Passos

1. **Implementar logger wrapper** ✅
2. **Migrar 5 arquivos críticos** (prova de conceito)
3. **Validar em desenvolvimento**
4. **Migração gradual** (server → client)
5. **Configurar monitoramento** (DataDog, LogRocket)
6. **Documentar padrões** para equipe

---

**Meta**: Reduzir de **2.786 → < 50 console statements** (98% redução)
**Benefícios**: Performance, debugging, monitoramento, conformidade 