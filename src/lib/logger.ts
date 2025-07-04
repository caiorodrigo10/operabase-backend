interface LogData {
  [key: string]: any;
}

class ClientLogger {
  private isDev = import.meta.env.MODE === 'development';
  private enableDebug = import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true';
  private maxLogLength = 1000;

  private truncateData(data: any): any {
    if (typeof data === 'string' && data.length > this.maxLogLength) {
      return data.substring(0, this.maxLogLength) + '...';
    }
    
    if (typeof data === 'object' && data !== null) {
      const truncated: any = {};
      for (const [key, value] of Object.entries(data)) {
        truncated[key] = typeof value === 'string' && value.length > this.maxLogLength
          ? value.substring(0, this.maxLogLength) + '...'
          : value;
      }
      return truncated;
    }
    
    return data;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  debug(message: string, data?: LogData): void {
    if (this.isDev || this.enableDebug) {
      const truncatedData = data ? this.truncateData(data) : undefined;
      console.log(this.formatMessage('DEBUG', message), truncatedData);
    }
  }

  info(message: string, data?: LogData): void {
    const truncatedData = data ? this.truncateData(data) : undefined;
    console.log(this.formatMessage('INFO', message), truncatedData);
  }

  warn(message: string, data?: LogData): void {
    const truncatedData = data ? this.truncateData(data) : undefined;
    console.warn(this.formatMessage('WARN', message), truncatedData);
  }

  error(message: string, data?: LogData): void {
    const truncatedData = data ? this.truncateData(data) : undefined;
    console.error(this.formatMessage('ERROR', message), truncatedData);
    
    // Em produção, podemos enviar erros para serviço de monitoramento
    if (!this.isDev && data?.error instanceof Error) {
      // TODO: Integrar com serviço de monitoramento (Sentry, LogRocket, etc.)
      // this.reportError(data.error, message, truncatedData);
    }
  }

  // Métodos específicos para diferentes contextos
  api(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: LogData): void {
    this[level](`[API] ${message}`, data);
  }

  auth(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: LogData): void {
    this[level](`[AUTH] ${message}`, data);
  }

  ui(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: LogData): void {
    this[level](`[UI] ${message}`, data);
  }

  performance(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: LogData): void {
    this[level](`[PERF] ${message}`, data);
  }

  // Método para timing de operações
  time(label: string): void {
    if (this.isDev) {
      console.time(label);
    }
  }

  timeEnd(label: string, data?: LogData): void {
    if (this.isDev) {
      console.timeEnd(label);
    }
    this.performance('info', `Operation completed: ${label}`, data);
  }

  // Método para logs condicionais
  conditional(condition: boolean, level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: LogData): void {
    if (condition) {
      this[level](message, data);
    }
  }

  // Método para agrupar logs relacionados
  group(label: string): void {
    if (this.isDev) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDev) {
      console.groupEnd();
    }
  }

  // Método para logs de tabela (útil para debugging)
  table(data: any[], columns?: string[]): void {
    if (this.isDev) {
      console.table(data, columns);
    }
  }
}

export const logger = new ClientLogger(); 