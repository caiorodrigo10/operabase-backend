# 🧹 Plano de Limpeza dos Logs - Operabase

## 📊 Situação Atual
- **2.786 declarações de console** em 244 arquivos
- Sistema de structured logging já implementado mas subutilizado
- Logs poluídos dificultam debugging e monitoramento

## 🎯 Objetivos
1. Reduzir logs de console em 90%+ 
2. Migrar para structured logging
3. Implementar níveis de log apropriados
4. Melhorar performance e debugging

---

## 📋 Fase 1: Análise e Categorização (Semana 1)

### 1.1 Categorizar Logs por Tipo
```bash
# Debug temporário (remover)
grep -r "console\.log.*DEBUG\|🔍\|📊\|🚀" client/ server/ 

# Logs de erro importantes (migrar)
grep -r "console\.error\|console\.warn" client/ server/

# Logs de produção (manter/migrar)
grep -r "console\.log.*✅\|❌\|⚠️" client/ server/
```

### 1.2 Identificar Arquivos Críticos
**Prioridade ALTA** (limpar primeiro):
- `server/domains/*/` - Lógica de negócio
- `client/src/pages/` - Páginas principais
- `server/shared/` - Serviços compartilhados

**Prioridade MÉDIA**:
- `client/src/components/` - Componentes
- `server/services/` - Serviços auxiliares

**Prioridade BAIXA**:
- Arquivos de teste e migração
- Scripts temporários

---

## 🔧 Fase 2: Implementação do Sistema de Logging (Semana 2)

### 2.1 Configurar Níveis de Log
```typescript
// server/shared/logger.config.ts
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1, 
  INFO: 2,
  DEBUG: 3
} as const;

export const currentLogLevel = process.env.LOG_LEVEL || 
  (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG');
```

### 2.2 Criar Wrapper de Logger
```typescript
// server/shared/logger.ts
import { structuredLogger, LogCategory } from './structured-logger.service';

export class Logger {
  static debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      structuredLogger.debug(LogCategory.API, message, data);
    }
  }

  static info(message: string, data?: any) {
    structuredLogger.info(LogCategory.API, message, data);
  }

  static warn(message: string, data?: any) {
    structuredLogger.warn(LogCategory.API, message, data);
  }

  static error(message: string, data?: any) {
    structuredLogger.error(LogCategory.API, message, data);
  }
}
```

### 2.3 Logger para Frontend
```typescript
// client/src/lib/logger.ts
class ClientLogger {
  private isDev = process.env.NODE_ENV === 'development';

  debug(message: string, data?: any) {
    if (this.isDev) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }

  info(message: string, data?: any) {
    console.log(`[INFO] ${message}`, data);
  }

  warn(message: string, data?: any) {
    console.warn(`[WARN] ${message}`, data);
  }

  error(message: string, data?: any) {
    console.error(`[ERROR] ${message}`, data);
  }
}

export const logger = new ClientLogger();
```

---

## 🚀 Fase 3: Migração Gradual (Semanas 3-4)

### 3.1 Padrões de Substituição

**ANTES:**
```typescript
console.log('🚀 AppointmentsService.getAppointments called for clinic:', clinicId);
console.log('📊 DB appointments found:', appointments.length);
```

**DEPOIS:**
```typescript
import { Logger } from '../shared/logger';

Logger.debug('AppointmentsService.getAppointments called', { clinicId });
Logger.info('DB appointments found', { count: appointments.length });
```

### 3.2 Script de Migração Automática
```bash
#!/bin/bash
# scripts/migrate-logs.sh

# Substituir console.log por Logger.debug em desenvolvimento
find server/ -name "*.ts" -exec sed -i '' 's/console\.log(/Logger.debug(/g' {} \;

# Substituir console.error por Logger.error
find server/ -name "*.ts" -exec sed -i '' 's/console\.error(/Logger.error(/g' {} \;

# Adicionar imports
find server/ -name "*.ts" -exec sed -i '' '1i\
import { Logger } from "../shared/logger";
' {} \;
```

### 3.3 Cronograma de Migração
- **Semana 3**: Server-side (domains, services)
- **Semana 4**: Client-side (pages, components)

---

## 🧪 Fase 4: Validação e Testes (Semana 5)

### 4.1 Testes de Performance
```typescript
// Benchmark antes/depois da limpeza
const startTime = performance.now();
// ... operação
const endTime = performance.now();
Logger.info('Performance test', { 
  operation: 'test', 
  duration: endTime - startTime 
});
```

### 4.2 Validação de Logs
```bash
# Verificar se logs estão sendo gerados corretamente
tail -f logs/api/api-$(date +%Y-%m-%d).jsonl

# Contar logs restantes
find . -name "*.ts" -o -name "*.tsx" | xargs grep -c "console\." | awk -F: '{sum += $2} END {print sum}'
```

---

## 📈 Fase 5: Monitoramento e Otimização (Semana 6)

### 5.1 Dashboard de Logs
- Implementar visualização de logs estruturados
- Alertas para logs de erro
- Métricas de performance

### 5.2 Configuração de Produção
```typescript
// Configurar log rotation
// Configurar envio para serviços externos (DataDog, LogRocket)
// Implementar sampling para logs de alta frequência
```

---

## 🎯 Metas de Sucesso

### Métricas Objetivo:
- **Console statements**: 2.786 → < 50 (98% redução)
- **Performance**: Melhoria de 10-15% no tempo de resposta
- **Debugging**: Logs estruturados com contexto completo
- **Monitoramento**: Alertas automáticos para erros críticos

### Critérios de Aceitação:
- ✅ Logs de produção limpos e estruturados
- ✅ Logs de desenvolvimento controláveis via ENV
- ✅ Performance melhorada
- ✅ Debugging mais eficiente
- ✅ Monitoramento robusto

---

## 🚨 Riscos e Mitigações

### Riscos:
1. **Perda de informações de debug importantes**
2. **Quebra de funcionalidades que dependem de logs**
3. **Overhead inicial de configuração**

### Mitigações:
1. **Migração gradual** com validação em cada etapa
2. **Backup completo** antes das alterações
3. **Testes extensivos** em ambiente de desenvolvimento
4. **Rollback plan** preparado

---

## 📝 Próximos Passos Imediatos

1. **Criar branch específica**: `feature/log-cleanup`
2. **Implementar logger wrapper** (Fase 2.2)
3. **Migrar 5 arquivos críticos** como prova de conceito
4. **Validar funcionamento** em desenvolvimento
5. **Documentar padrões** para a equipe

---

**Estimativa Total**: 6 semanas
**Esforço**: ~40 horas
**Impacto**: Alto (performance, debugging, monitoramento)
**Risco**: Médio (mitigado com abordagem gradual) 