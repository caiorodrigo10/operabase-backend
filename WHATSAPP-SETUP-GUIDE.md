# Guia de Configuração - Integração WhatsApp Evolution API

## Pré-requisitos

### 1. Evolution API Server
- Evolution API v1.5+ rodando e acessível
- API Key configurada
- Webhook URL configurada (opcional para N8N)

### 2. Banco de Dados
- PostgreSQL 12+ com tabela `whatsapp_numbers` criada
- Permissões de INSERT, UPDATE, DELETE, SELECT

### 3. Variáveis de Ambiente Obrigatórias

```bash
# Evolution API Configuration
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-chave-api-secreta

# Database (já configurado)
DATABASE_URL=postgresql://user:password@host:port/database

# Webhook N8N (opcional)
N8N_WEBHOOK_URL=https://sua-n8n.com/webhook/whatsapp
```

## Setup Inicial

### 1. Verificar Schema do Banco

```sql
-- Verificar se a tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'whatsapp_numbers';

-- Se não existir, criar a tabela
CREATE TABLE whatsapp_numbers (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    phone_number VARCHAR(20),
    instance_name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'disconnected',
    qr_code TEXT,
    connected_at TIMESTAMP,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar índices para performance
CREATE INDEX idx_whatsapp_clinic_id ON whatsapp_numbers(clinic_id);
CREATE INDEX idx_whatsapp_user_id ON whatsapp_numbers(user_id);
CREATE INDEX idx_whatsapp_status ON whatsapp_numbers(status);
CREATE INDEX idx_whatsapp_instance_name ON whatsapp_numbers(instance_name);
```

### 2. Testar Evolution API

```bash
# Teste básico de conectividade
curl -X GET "$EVOLUTION_API_URL/instance/fetchInstances" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json"

# Resposta esperada:
# {"status": "SUCCESS", "response": [...]}
```

### 3. Configurar Webhook N8N (Opcional)

```json
{
  "url": "https://n8n.com/webhook/whatsapp",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer seu-token-n8n"
  },
  "events": [
    "QRCODE_UPDATED",
    "CONNECTION_UPDATE",
    "MESSAGES_UPSERT"
  ]
}
```

## Configuração do Frontend

### 1. Verificar Componente WhatsAppManager

```typescript
// Em client/src/pages/configuracoes.tsx
import { WhatsAppManager } from '@/components/WhatsAppManager';
import { useAuth } from '@/hooks/useAuth';

export function Configuracoes() {
  const { user } = useAuth();
  
  return (
    <TabsContent value="integrations">
      <WhatsAppManager 
        clinicId={1} 
        userId={user?.id || '5'} 
      />
    </TabsContent>
  );
}
```

### 2. Verificar Imports e Hooks

```typescript
// Imports necessários no WhatsAppManager
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
```

## Configuração do Backend

### 1. Verificar Rotas WhatsApp

```typescript
// Em server/index.ts
import { setupWhatsAppRoutes } from './whatsapp-routes';
import { setupWhatsAppWebhookRoutes } from './whatsapp-webhook-routes';

// Registrar rotas
setupWhatsAppRoutes(app, storage);
setupWhatsAppWebhookRoutes(app, storage);
```

### 2. Configurar Evolution API Service

```typescript
// Em server/whatsapp-evolution-service.ts
export class EvolutionApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL!;
    this.apiKey = process.env.EVOLUTION_API_KEY!;
    
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Evolution API not configured');
    }
  }
}
```

### 3. Configurar Storage Methods

```typescript
// Em server/postgres-storage.ts ou server/storage.ts
async createWhatsAppNumber(data: InsertWhatsAppNumber): Promise<WhatsAppNumber> {
  const result = await this.db.insert(whatsappNumbers)
    .values({
      clinic_id: data.clinic_id,
      user_id: data.user_id,
      instance_name: data.instance_name,
      status: data.status || 'disconnected',
      phone_number: data.phone_number,
      qr_code: data.qr_code,
      connected_at: data.connected_at,
      last_seen: data.last_seen
    })
    .returning();
  
  return result[0];
}

async getWhatsAppNumbersByClinic(clinicId: number): Promise<WhatsAppNumber[]> {
  return await this.db.select()
    .from(whatsappNumbers)
    .where(eq(whatsappNumbers.clinic_id, clinicId))
    .orderBy(desc(whatsappNumbers.created_at));
}
```

## Deploy e Produção

### 1. Verificações Pré-Deploy

```bash
# 1. Verificar variáveis de ambiente
echo "Evolution API URL: $EVOLUTION_API_URL"
echo "Evolution API Key: ${EVOLUTION_API_KEY:0:10}..."

# 2. Testar conexão com banco
psql $DATABASE_URL -c "SELECT COUNT(*) FROM whatsapp_numbers;"

# 3. Testar Evolution API
curl -f "$EVOLUTION_API_URL/instance/fetchInstances" \
  -H "apikey: $EVOLUTION_API_KEY"
```

### 2. Configurações de Produção

```typescript
// Rate limiting para produção
const rateLimiter = require('express-rate-limit');

const whatsappLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 conexões por IP por janela
  message: 'Muitas tentativas de conexão WhatsApp'
});

app.use('/api/whatsapp/connect', whatsappLimiter);
```

### 3. Monitoramento

```typescript
// Métricas de performance
const performanceMonitor = {
  connectionAttempts: 0,
  successfulConnections: 0,
  failedConnections: 0,
  averageConnectionTime: 0,
  
  recordAttempt() {
    this.connectionAttempts++;
  },
  
  recordSuccess(timeMs: number) {
    this.successfulConnections++;
    this.averageConnectionTime = 
      (this.averageConnectionTime + timeMs) / 2;
  },
  
  recordFailure() {
    this.failedConnections++;
  },
  
  getStats() {
    return {
      attempts: this.connectionAttempts,
      successes: this.successfulConnections,
      failures: this.failedConnections,
      successRate: this.successfulConnections / this.connectionAttempts,
      avgTime: this.averageConnectionTime
    };
  }
};
```

## Troubleshooting Comum

### 1. Erro: "Evolution API not configured"

```bash
# Verificar variáveis
echo $EVOLUTION_API_URL
echo $EVOLUTION_API_KEY

# Se vazias, configurar
export EVOLUTION_API_URL="https://sua-api.com"
export EVOLUTION_API_KEY="sua-chave"
```

### 2. Erro: "Invalid User ID format"

```typescript
// Verificar conversão no frontend
const startConnection = () => {
  const payload = {
    clinicId: parseInt(clinicId),
    userId: parseInt(userId) // Garantir que é número
  };
};
```

### 3. Erro: "Instance already exists"

```typescript
// Cleanup de instâncias órfãs
const cleanupOrphanedInstances = async () => {
  const orphaned = await storage.getOrphanedWhatsAppInstances();
  
  for (const instance of orphaned) {
    try {
      await evolutionService.deleteInstance(instance.instance_name);
      await storage.deleteWhatsAppNumber(instance.id);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
};
```

### 4. QR Code não aparece

```typescript
// Implementar retry com backoff
const fetchQRWithRetry = async (instanceName: string) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const qrCode = await evolutionService.fetchQRCode(instanceName);
      if (qrCode) return qrCode;
    } catch (error) {
      console.log(`QR fetch attempt ${attempt} failed:`, error);
      if (attempt < 3) {
        await new Promise(resolve => 
          setTimeout(resolve, 2000 * attempt)
        );
      }
    }
  }
  throw new Error('Failed to fetch QR code after 3 attempts');
};
```

### 5. Performance Issues

```typescript
// Implementar cache para listagem
const whatsappCache = new Map();

const getCachedWhatsAppNumbers = async (clinicId: number) => {
  const cacheKey = `whatsapp_${clinicId}`;
  
  if (whatsappCache.has(cacheKey)) {
    const cached = whatsappCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 30000) { // 30 segundos
      return cached.data;
    }
  }
  
  const data = await storage.getWhatsAppNumbersByClinic(clinicId);
  whatsappCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  return data;
};
```

## Scripts Úteis

### 1. Cleanup Manual

```bash
#!/bin/bash
# cleanup-whatsapp.sh

echo "Limpando instâncias WhatsApp órfãs..."

# Buscar instâncias órfãs no banco
psql $DATABASE_URL -c "
SELECT instance_name 
FROM whatsapp_numbers 
WHERE status = 'connecting' 
AND created_at < NOW() - INTERVAL '10 minutes';
" -t -A | while read instance_name; do
  if [ ! -z "$instance_name" ]; then
    echo "Removendo instância: $instance_name"
    
    # Deletar da Evolution API
    curl -X DELETE "$EVOLUTION_API_URL/instance/delete/$instance_name" \
      -H "apikey: $EVOLUTION_API_KEY"
    
    # Deletar do banco
    psql $DATABASE_URL -c "
    DELETE FROM whatsapp_numbers 
    WHERE instance_name = '$instance_name';
    "
  fi
done

echo "Limpeza concluída."
```

### 2. Health Check

```bash
#!/bin/bash
# health-check.sh

echo "Verificando saúde da integração WhatsApp..."

# 1. Testar Evolution API
echo "1. Testando Evolution API..."
if curl -f -s "$EVOLUTION_API_URL/instance/fetchInstances" \
   -H "apikey: $EVOLUTION_API_KEY" > /dev/null; then
  echo "   ✅ Evolution API OK"
else
  echo "   ❌ Evolution API FALHOU"
  exit 1
fi

# 2. Testar banco de dados
echo "2. Testando banco de dados..."
if psql $DATABASE_URL -c "SELECT 1 FROM whatsapp_numbers LIMIT 1;" > /dev/null 2>&1; then
  echo "   ✅ Banco de dados OK"
else
  echo "   ❌ Banco de dados FALHOU"
  exit 1
fi

# 3. Verificar instâncias ativas
echo "3. Verificando instâncias ativas..."
ACTIVE_COUNT=$(psql $DATABASE_URL -t -A -c "
SELECT COUNT(*) FROM whatsapp_numbers WHERE status = 'open';
")
echo "   📱 $ACTIVE_COUNT instâncias ativas"

# 4. Verificar instâncias órfãs
ORPHANED_COUNT=$(psql $DATABASE_URL -t -A -c "
SELECT COUNT(*) FROM whatsapp_numbers 
WHERE status = 'connecting' 
AND created_at < NOW() - INTERVAL '10 minutes';
")

if [ "$ORPHANED_COUNT" -gt 0 ]; then
  echo "   ⚠️  $ORPHANED_COUNT instâncias órfãs detectadas"
else
  echo "   ✅ Nenhuma instância órfã"
fi

echo "Verificação concluída."
```

### 3. Backup de Instâncias

```bash
#!/bin/bash
# backup-whatsapp.sh

BACKUP_FILE="whatsapp_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Criando backup das instâncias WhatsApp..."

psql $DATABASE_URL -c "
COPY (
  SELECT * FROM whatsapp_numbers 
  WHERE status = 'open'
) TO STDOUT WITH CSV HEADER
" > "$BACKUP_FILE"

echo "Backup salvo em: $BACKUP_FILE"
```

Esta configuração garante que a integração WhatsApp funcione corretamente em todos os ambientes, com monitoramento adequado e scripts de manutenção.