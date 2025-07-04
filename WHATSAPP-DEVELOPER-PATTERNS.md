# Padrões de Desenvolvimento - Integração WhatsApp

## Padrões de Código Obrigatórios

### 1. Validação de Entrada Rigorosa

```typescript
// ❌ NUNCA fazer isso
app.post('/api/whatsapp/connect', async (req, res) => {
  const { clinicId, userId } = req.body;
  // Usar diretamente sem validação
});

// ✅ SEMPRE fazer isso
interface ConnectRequest {
  clinicId: number;
  userId: number;
}

const validateConnectRequest = (data: any): ConnectRequest => {
  if (!data.clinicId || typeof data.clinicId !== 'number' || data.clinicId <= 0) {
    throw new Error('Invalid clinic ID - must be positive number');
  }
  
  if (!data.userId || typeof data.userId !== 'number' || data.userId <= 0) {
    throw new Error('Invalid user ID - must be positive number');
  }
  
  return { clinicId: data.clinicId, userId: data.userId };
};

app.post('/api/whatsapp/connect', async (req, res) => {
  try {
    const validatedData = validateConnectRequest(req.body);
    // Continuar com dados validados
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});
```

### 2. Tratamento de Erros Específicos

```typescript
// Categorias de erros específicos
enum WhatsAppErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EVOLUTION_API_ERROR = 'EVOLUTION_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INSTANCE_EXISTS_ERROR = 'INSTANCE_EXISTS_ERROR',
  QR_TIMEOUT_ERROR = 'QR_TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR'
}

class WhatsAppError extends Error {
  constructor(
    public type: WhatsAppErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}

// Uso em métodos
const createWhatsAppInstance = async (clinicId: number, userId: number) => {
  try {
    // Verificar rate limit
    if (await isRateLimited(userId)) {
      throw new WhatsAppError(
        WhatsAppErrorType.RATE_LIMIT_ERROR,
        'Too many connection attempts. Wait 60 seconds.'
      );
    }
    
    // Criar instância
    const instanceName = generateInstanceName(clinicId, userId);
    const response = await evolutionService.createInstance(instanceName);
    
    if (!response.success) {
      throw new WhatsAppError(
        WhatsAppErrorType.EVOLUTION_API_ERROR,
        `Failed to create instance: ${response.error}`,
        response
      );
    }
    
    return response;
  } catch (error) {
    if (error instanceof WhatsAppError) {
      throw error; // Re-throw custom errors
    }
    
    // Wrap unknown errors
    throw new WhatsAppError(
      WhatsAppErrorType.EVOLUTION_API_ERROR,
      'Unexpected error creating WhatsApp instance',
      error
    );
  }
};
```

### 3. Logging Estruturado

```typescript
// Logger estruturado para debugging
interface WhatsAppLogData {
  action: string;
  clinicId: number;
  userId: number;
  instanceName?: string;
  phoneNumber?: string;
  status?: string;
  error?: any;
  duration?: number;
  metadata?: Record<string, any>;
}

class WhatsAppLogger {
  static log(level: 'info' | 'error' | 'warn' | 'debug', data: WhatsAppLogData) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: 'whatsapp-integration',
      ...data
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  static info(data: WhatsAppLogData) {
    this.log('info', data);
  }
  
  static error(data: WhatsAppLogData) {
    this.log('error', data);
  }
  
  static debug(data: WhatsAppLogData) {
    this.log('debug', data);
  }
}

// Uso em operações
const connectWhatsApp = async (clinicId: number, userId: number) => {
  const startTime = Date.now();
  const instanceName = generateInstanceName(clinicId, userId);
  
  WhatsAppLogger.info({
    action: 'connection_started',
    clinicId,
    userId,
    instanceName
  });
  
  try {
    const result = await performConnection(instanceName);
    
    WhatsAppLogger.info({
      action: 'connection_completed',
      clinicId,
      userId,
      instanceName,
      phoneNumber: result.phoneNumber,
      duration: Date.now() - startTime
    });
    
    return result;
  } catch (error) {
    WhatsAppLogger.error({
      action: 'connection_failed',
      clinicId,
      userId,
      instanceName,
      error: error.message,
      duration: Date.now() - startTime
    });
    
    throw error;
  }
};
```

### 4. Rate Limiting Inteligente

```typescript
// Rate limiter per-user com Redis ou Map
class RateLimiter {
  private attempts = new Map<number, { count: number; resetTime: number }>();
  private readonly maxAttempts = 3;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutos
  
  async checkLimit(userId: number): Promise<boolean> {
    const now = Date.now();
    const userAttempts = this.attempts.get(userId);
    
    if (!userAttempts || now > userAttempts.resetTime) {
      // Reset window
      this.attempts.set(userId, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }
    
    if (userAttempts.count >= this.maxAttempts) {
      const timeRemaining = Math.ceil((userAttempts.resetTime - now) / 1000);
      throw new WhatsAppError(
        WhatsAppErrorType.RATE_LIMIT_ERROR,
        `Rate limit exceeded. Try again in ${timeRemaining} seconds.`
      );
    }
    
    userAttempts.count++;
    return true;
  }
  
  reset(userId: number): void {
    this.attempts.delete(userId);
  }
}

const rateLimiter = new RateLimiter();

// Uso em rotas
app.post('/api/whatsapp/connect', async (req, res) => {
  try {
    const { clinicId, userId } = validateConnectRequest(req.body);
    
    // Verificar rate limit
    await rateLimiter.checkLimit(userId);
    
    // Continuar com conexão
    const result = await createWhatsAppConnection(clinicId, userId);
    res.json(result);
  } catch (error) {
    if (error instanceof WhatsAppError && error.type === WhatsAppErrorType.RATE_LIMIT_ERROR) {
      return res.status(429).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 5. Cleanup Automático com Timeouts

```typescript
// Sistema de cleanup com timeouts configuráveis
class InstanceCleanupManager {
  private cleanupTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly defaultTimeout = 5 * 60 * 1000; // 5 minutos
  
  scheduleCleanup(instanceName: string, timeoutMs: number = this.defaultTimeout) {
    // Cancelar cleanup anterior se existir
    this.cancelCleanup(instanceName);
    
    const timeoutId = setTimeout(async () => {
      try {
        await this.performCleanup(instanceName);
        WhatsAppLogger.info({
          action: 'instance_cleaned_up',
          instanceName,
          metadata: { reason: 'timeout' }
        });
      } catch (error) {
        WhatsAppLogger.error({
          action: 'cleanup_failed',
          instanceName,
          error: error.message
        });
      }
    }, timeoutMs);
    
    this.cleanupTimeouts.set(instanceName, timeoutId);
    
    WhatsAppLogger.debug({
      action: 'cleanup_scheduled',
      instanceName,
      metadata: { timeoutMs }
    });
  }
  
  cancelCleanup(instanceName: string): boolean {
    const timeoutId = this.cleanupTimeouts.get(instanceName);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.cleanupTimeouts.delete(instanceName);
      
      WhatsAppLogger.debug({
        action: 'cleanup_cancelled',
        instanceName
      });
      
      return true;
    }
    return false;
  }
  
  private async performCleanup(instanceName: string) {
    try {
      // 1. Deletar da Evolution API
      await evolutionService.deleteInstance(instanceName);
      
      // 2. Remover do banco
      await storage.deleteWhatsAppNumberByInstanceName(instanceName);
      
      // 3. Limpar timeout
      this.cleanupTimeouts.delete(instanceName);
      
    } catch (error) {
      throw new WhatsAppError(
        WhatsAppErrorType.DATABASE_ERROR,
        `Cleanup failed for ${instanceName}`,
        error
      );
    }
  }
}

const cleanupManager = new InstanceCleanupManager();

// Uso na criação de instâncias
const createWhatsAppConnection = async (clinicId: number, userId: number) => {
  const instanceName = generateInstanceName(clinicId, userId);
  
  try {
    // Criar instância
    const response = await evolutionService.createInstance(instanceName);
    
    // Salvar no banco
    const whatsappNumber = await storage.createWhatsAppNumber({
      clinic_id: clinicId,
      user_id: userId,
      instance_name: instanceName,
      status: 'connecting'
    });
    
    // Agendar cleanup
    cleanupManager.scheduleCleanup(instanceName);
    
    return { id: whatsappNumber.id, instanceName, qrCode: response.qrCode };
  } catch (error) {
    // Em caso de erro, fazer cleanup imediato
    await cleanupManager.performCleanup(instanceName);
    throw error;
  }
};
```

### 6. Status Management com State Machine

```typescript
// Estados da conexão WhatsApp
enum WhatsAppStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  QR_GENERATED = 'qr_generated',
  AUTHENTICATING = 'authenticating',
  OPEN = 'open',
  CLOSED = 'closed',
  ERROR = 'error'
}

// Transições válidas
const validTransitions: Record<WhatsAppStatus, WhatsAppStatus[]> = {
  [WhatsAppStatus.DISCONNECTED]: [WhatsAppStatus.CONNECTING],
  [WhatsAppStatus.CONNECTING]: [WhatsAppStatus.QR_GENERATED, WhatsAppStatus.ERROR],
  [WhatsAppStatus.QR_GENERATED]: [WhatsAppStatus.AUTHENTICATING, WhatsAppStatus.ERROR],
  [WhatsAppStatus.AUTHENTICATING]: [WhatsAppStatus.OPEN, WhatsAppStatus.ERROR],
  [WhatsAppStatus.OPEN]: [WhatsAppStatus.CLOSED, WhatsAppStatus.ERROR],
  [WhatsAppStatus.CLOSED]: [WhatsAppStatus.CONNECTING],
  [WhatsAppStatus.ERROR]: [WhatsAppStatus.CONNECTING, WhatsAppStatus.DISCONNECTED]
};

class WhatsAppStatusManager {
  static async updateStatus(
    instanceName: string,
    newStatus: WhatsAppStatus,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Buscar status atual
      const current = await storage.getWhatsAppNumberByInstanceName(instanceName);
      const currentStatus = current.status as WhatsAppStatus;
      
      // Validar transição
      if (!this.isValidTransition(currentStatus, newStatus)) {
        WhatsAppLogger.error({
          action: 'invalid_status_transition',
          instanceName,
          metadata: {
            from: currentStatus,
            to: newStatus,
            validTransitions: validTransitions[currentStatus]
          }
        });
        return false;
      }
      
      // Atualizar no banco
      await storage.updateWhatsAppNumber(current.id, {
        status: newStatus,
        updated_at: new Date(),
        ...(newStatus === WhatsAppStatus.OPEN && { connected_at: new Date() }),
        ...(metadata?.phoneNumber && { phone_number: metadata.phoneNumber })
      });
      
      WhatsAppLogger.info({
        action: 'status_updated',
        instanceName,
        metadata: {
          from: currentStatus,
          to: newStatus,
          ...metadata
        }
      });
      
      return true;
    } catch (error) {
      WhatsAppLogger.error({
        action: 'status_update_failed',
        instanceName,
        error: error.message,
        metadata: { targetStatus: newStatus }
      });
      return false;
    }
  }
  
  private static isValidTransition(from: WhatsAppStatus, to: WhatsAppStatus): boolean {
    return validTransitions[from]?.includes(to) || false;
  }
}
```

### 7. Polling Inteligente com Backoff

```typescript
// Polling com exponential backoff
class SmartPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private currentInterval = 1000; // Começar com 1 segundo
  private readonly maxInterval = 10000; // Máximo 10 segundos
  private readonly backoffMultiplier = 1.5;
  private consecutiveFailures = 0;
  
  start(callback: () => Promise<boolean>, onComplete?: () => void) {
    this.poll(callback, onComplete);
  }
  
  stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private async poll(callback: () => Promise<boolean>, onComplete?: () => void) {
    try {
      const shouldContinue = await callback();
      
      if (!shouldContinue) {
        // Polling completo
        this.consecutiveFailures = 0;
        onComplete?.();
        return;
      }
      
      // Reset interval em caso de sucesso
      if (this.consecutiveFailures > 0) {
        this.currentInterval = 1000;
        this.consecutiveFailures = 0;
      }
      
      // Agendar próximo poll
      this.intervalId = setTimeout(() => {
        this.poll(callback, onComplete);
      }, this.currentInterval);
      
    } catch (error) {
      this.consecutiveFailures++;
      
      // Aplicar backoff
      this.currentInterval = Math.min(
        this.currentInterval * this.backoffMultiplier,
        this.maxInterval
      );
      
      console.error('Polling error:', error);
      
      // Tentar novamente após backoff
      this.intervalId = setTimeout(() => {
        this.poll(callback, onComplete);
      }, this.currentInterval);
    }
  }
}

// Uso no frontend
const useWhatsAppPolling = (instanceName: string | null) => {
  const [poller] = useState(() => new SmartPoller());
  
  useEffect(() => {
    if (!instanceName) return;
    
    poller.start(
      async () => {
        const numbers = await fetchWhatsAppNumbers();
        const instance = numbers.find(n => n.instance_name === instanceName);
        
        // Retornar true para continuar polling, false para parar
        return instance?.status !== 'open';
      },
      () => {
        // Callback quando conexão for estabelecida
        toast({ title: "WhatsApp conectado com sucesso!" });
      }
    );
    
    return () => poller.stop();
  }, [instanceName]);
};
```

### 8. Testes Automatizados Essenciais

```typescript
// Testes de integração críticos
describe('WhatsApp Integration', () => {
  beforeEach(async () => {
    // Limpar banco de teste
    await testDb.clear();
    // Reset rate limiter
    rateLimiter.reset();
  });
  
  describe('Connection Flow', () => {
    it('should create instance with valid data', async () => {
      const result = await createWhatsAppConnection(1, 5);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('instanceName');
      expect(result).toHaveProperty('qrCode');
      expect(result.instanceName).toMatch(/^clinic_1_user_5_\d+$/);
    });
    
    it('should reject invalid clinic ID', async () => {
      await expect(createWhatsAppConnection(0, 5))
        .rejects.toThrow('Invalid clinic ID');
      
      await expect(createWhatsAppConnection(-1, 5))
        .rejects.toThrow('Invalid clinic ID');
    });
    
    it('should enforce rate limiting', async () => {
      // Fazer 3 tentativas (limite)
      for (let i = 0; i < 3; i++) {
        await createWhatsAppConnection(1, 5);
      }
      
      // 4ª tentativa deve falhar
      await expect(createWhatsAppConnection(1, 5))
        .rejects.toThrow('Rate limit exceeded');
    });
    
    it('should cleanup unclaimed instances', async () => {
      const result = await createWhatsAppConnection(1, 5);
      
      // Simular timeout
      jest.advanceTimersByTime(5 * 60 * 1000);
      
      // Verificar se foi removido
      const instances = await storage.getWhatsAppNumbersByClinic(1);
      expect(instances).toHaveLength(0);
    });
  });
  
  describe('Status Management', () => {
    it('should follow valid status transitions', async () => {
      const instanceName = 'test_instance';
      
      // connecting -> qr_generated
      expect(await WhatsAppStatusManager.updateStatus(
        instanceName, 
        WhatsAppStatus.QR_GENERATED
      )).toBe(true);
      
      // qr_generated -> open
      expect(await WhatsAppStatusManager.updateStatus(
        instanceName, 
        WhatsAppStatus.OPEN
      )).toBe(true);
    });
    
    it('should reject invalid transitions', async () => {
      const instanceName = 'test_instance';
      
      // connecting -> open (pular qr_generated)
      expect(await WhatsAppStatusManager.updateStatus(
        instanceName, 
        WhatsAppStatus.OPEN
      )).toBe(false);
    });
  });
});
```

### 9. Métricas e Monitoramento

```typescript
// Collector de métricas
class WhatsAppMetrics {
  private static metrics = {
    connectionsAttempted: 0,
    connectionsSuccessful: 0,
    connectionsFailed: 0,
    averageConnectionTime: 0,
    qrGenerationTime: 0,
    activeInstances: 0,
    errorsByType: new Map<string, number>()
  };
  
  static recordConnectionAttempt() {
    this.metrics.connectionsAttempted++;
  }
  
  static recordConnectionSuccess(durationMs: number) {
    this.metrics.connectionsSuccessful++;
    this.updateAverageTime(durationMs);
  }
  
  static recordConnectionFailure(errorType: string) {
    this.metrics.connectionsFailed++;
    const count = this.metrics.errorsByType.get(errorType) || 0;
    this.metrics.errorsByType.set(errorType, count + 1);
  }
  
  static recordQRGeneration(durationMs: number) {
    this.metrics.qrGenerationTime = durationMs;
  }
  
  static updateActiveInstances(count: number) {
    this.metrics.activeInstances = count;
  }
  
  private static updateAverageTime(newTime: number) {
    const count = this.metrics.connectionsSuccessful;
    this.metrics.averageConnectionTime = 
      (this.metrics.averageConnectionTime * (count - 1) + newTime) / count;
  }
  
  static getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.connectionsSuccessful / this.metrics.connectionsAttempted,
      errorsByType: Object.fromEntries(this.metrics.errorsByType)
    };
  }
  
  static reset() {
    this.metrics = {
      connectionsAttempted: 0,
      connectionsSuccessful: 0,
      connectionsFailed: 0,
      averageConnectionTime: 0,
      qrGenerationTime: 0,
      activeInstances: 0,
      errorsByType: new Map()
    };
  }
}

// Endpoint para métricas
app.get('/api/whatsapp/metrics', (req, res) => {
  res.json(WhatsAppMetrics.getMetrics());
});
```

## Checklist de Implementação para Agentes de IA

### Antes de Modificar o Código

- [ ] Validar entrada de dados rigorosamente
- [ ] Implementar logging estruturado
- [ ] Configurar rate limiting apropriado
- [ ] Definir tratamento de erros específicos
- [ ] Planejar estratégia de cleanup
- [ ] Estabelecer métricas de monitoramento

### Durante o Desenvolvimento

- [ ] Seguir padrões de nomenclatura consistentes
- [ ] Implementar testes para cenários críticos
- [ ] Usar state machine para status
- [ ] Aplicar timeouts apropriados
- [ ] Documentar decisões arquiteturais

### Após Implementação

- [ ] Testar todos os fluxos de erro
- [ ] Verificar performance sob carga
- [ ] Validar cleanup automático
- [ ] Confirmar métricas funcionando
- [ ] Documentar APIs e mudanças

Esta documentação garante que qualquer desenvolvedor ou agente de IA que trabalhe com a integração WhatsApp mantenha os padrões de qualidade e robustez necessários para um sistema de produção.