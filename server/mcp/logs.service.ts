import { EventEmitter } from 'events';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'mcp' | 'openai' | 'database' | 'error' | 'performance' | 'chat_request' | 'chat_interpretation' | 'chat_response' | 'chat_error';
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  duration?: number;
  endpoint?: string;
  sessionId?: string;
  userId?: string;
}

class MCPLogsService extends EventEmitter {
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 100;

  constructor() {
    super();
    this.setMaxListeners(50); // Aumenta limite para múltiplas conexões SSE
  }

  /**
   * Adiciona um novo log e emite evento para clientes conectados
   */
  addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const logEntry: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...entry
    };

    // Adiciona ao buffer circular
    this.logs.push(logEntry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Emite evento para clientes SSE
    this.emit('newLog', logEntry);
  }

  /**
   * Log específico para chamadas MCP
   */
  logMCPCall(endpoint: string, method: string, data?: any, sessionId?: string, duration?: number): void {
    this.addLog({
      type: 'mcp',
      level: 'info',
      message: `${method} ${endpoint}`,
      data,
      endpoint,
      sessionId,
      duration
    });
  }

  /**
   * Log específico para interpretação OpenAI
   */
  logOpenAI(message: string, action?: string, sessionId?: string, duration?: number): void {
    this.addLog({
      type: 'openai',
      level: 'info',
      message: `GPT-4 Interpretation: ${action || 'processing'}`,
      data: { userMessage: message, extractedAction: action },
      sessionId,
      duration
    });
  }

  /**
   * Log específico para operações de banco
   */
  logDatabase(query: string, duration?: number, sessionId?: string): void {
    this.addLog({
      type: 'database',
      level: 'debug',
      message: 'Database Query',
      data: { query: query.substring(0, 200) + (query.length > 200 ? '...' : '') },
      sessionId,
      duration
    });
  }

  /**
   * Log específico para erros
   */
  logError(error: Error | string, context?: any, sessionId?: string): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.addLog({
      type: 'error',
      level: 'error',
      message: errorMessage,
      data: { 
        context, 
        stack: errorStack,
        timestamp: new Date().toISOString()
      },
      sessionId
    });
  }

  /**
   * Log específico para métricas de performance
   */
  logPerformance(operation: string, duration: number, metadata?: any, sessionId?: string): void {
    const level = duration > 1000 ? 'warn' : 'info'; // Warn se > 1s

    this.addLog({
      type: 'performance',
      level,
      message: `${operation} completed in ${duration}ms`,
      data: { operation, ...metadata },
      duration,
      sessionId
    });
  }

  /**
   * Obtém logs filtrados
   */
  getLogs(filter?: {
    type?: LogEntry['type'];
    level?: LogEntry['level'];
    sessionId?: string;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter?.type) {
      filteredLogs = filteredLogs.filter(log => log.type === filter.type);
    }

    if (filter?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    if (filter?.sessionId) {
      filteredLogs = filteredLogs.filter(log => log.sessionId === filter.sessionId);
    }

    if (filter?.limit) {
      filteredLogs = filteredLogs.slice(-filter.limit);
    }

    return filteredLogs.reverse(); // Mais recentes primeiro
  }

  /**
   * Limpa todos os logs
   */
  clearLogs(): void {
    this.logs = [];
    this.emit('logsCleared');
  }

  /**
   * Obtém estatísticas dos logs
   */
  getStats(): {
    total: number;
    byType: Record<LogEntry['type'], number>;
    byLevel: Record<LogEntry['level'], number>;
    avgDuration: number;
    errorRate: number;
  } {
    const total = this.logs.length;
    const byType: Record<LogEntry['type'], number> = {
      mcp: 0,
      openai: 0,
      database: 0,
      error: 0,
      performance: 0,
      chat_request: 0,
      chat_interpretation: 0,
      chat_response: 0,
      chat_error: 0
    };
    const byLevel: Record<LogEntry['level'], number> = {
      info: 0,
      warn: 0,
      error: 0,
      debug: 0
    };

    let totalDuration = 0;
    let durationCount = 0;
    let errorCount = 0;

    this.logs.forEach(log => {
      byType[log.type]++;
      byLevel[log.level]++;
      
      if (log.duration) {
        totalDuration += log.duration;
        durationCount++;
      }
      
      if (log.level === 'error') {
        errorCount++;
      }
    });

    return {
      total,
      byType,
      byLevel,
      avgDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      errorRate: total > 0 ? Math.round((errorCount / total) * 100) : 0
    };
  }
}

export const mcpLogsService = new MCPLogsService();