import { structuredLogger, LogCategory } from './structured-logger.service.js';
import { LOG_CONFIG, shouldLog, LogLevel } from './logger.config.js';

interface LogData {
  [key: string]: any;
}

export class Logger {
  private static truncateData(data: any): any {
    if (typeof data === 'string' && data.length > LOG_CONFIG.maxLogLength) {
      return data.substring(0, LOG_CONFIG.maxLogLength) + '...';
    }
    
    if (typeof data === 'object' && data !== null) {
      const truncated: any = {};
      for (const [key, value] of Object.entries(data)) {
        truncated[key] = typeof value === 'string' && value.length > LOG_CONFIG.maxLogLength
          ? value.substring(0, LOG_CONFIG.maxLogLength) + '...'
          : value;
      }
      return truncated;
    }
    
    return data;
  }

  private static shouldSample(): boolean {
    if (!LOG_CONFIG.enableSampling) return true;
    return Math.random() < LOG_CONFIG.samplingRate;
  }

  static debug(message: string, data?: LogData, category: LogCategory = LogCategory.API): void {
    if (!shouldLog('DEBUG')) return;
    if (!LOG_CONFIG.enableDebugInProduction && process.env.NODE_ENV === 'production') return;
    
    const truncatedData = data ? this.truncateData(data) : {};
    
    structuredLogger.debug(category, message, truncatedData);
    
    if (LOG_CONFIG.enableConsoleOutput) {
      console.log(`[DEBUG] ${message}`, truncatedData);
    }
  }

  static info(message: string, data?: LogData, category: LogCategory = LogCategory.API): void {
    if (!shouldLog('INFO')) return;
    if (!this.shouldSample()) return;
    
    const truncatedData = data ? this.truncateData(data) : {};
    
    structuredLogger.info(category, message, truncatedData);
    
    if (LOG_CONFIG.enableConsoleOutput) {
      console.log(`[INFO] ${message}`, truncatedData);
    }
  }

  static warn(message: string, data?: LogData, category: LogCategory = LogCategory.API): void {
    if (!shouldLog('WARN')) return;
    
    const truncatedData = data ? this.truncateData(data) : {};
    
    structuredLogger.warn(category, message, truncatedData);
    
    if (LOG_CONFIG.enableConsoleOutput) {
      console.warn(`[WARN] ${message}`, truncatedData);
    }
  }

  static error(message: string, data?: LogData, category: LogCategory = LogCategory.API): void {
    if (!shouldLog('ERROR')) return;
    
    const truncatedData = data ? this.truncateData(data) : {};
    
    // Adicionar stack trace em desenvolvimento
    if (LOG_CONFIG.enableStackTrace && data?.error instanceof Error) {
      truncatedData.stack = data.error.stack;
    }
    
    structuredLogger.error(category, message, truncatedData);
    
    // Errors sempre vão para console, independente do ambiente
    console.error(`[ERROR] ${message}`, truncatedData);
  }

  // Métodos específicos para diferentes categorias
  static auth(level: LogLevel, message: string, data?: LogData): void {
    this[level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error'](message, data, LogCategory.AUTH);
  }

  static medical(level: LogLevel, message: string, data?: LogData): void {
    this[level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error'](message, data, LogCategory.MEDICAL);
  }

  static performance(level: LogLevel, message: string, data?: LogData): void {
    this[level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error'](message, data, LogCategory.PERFORMANCE);
  }

  static security(level: LogLevel, message: string, data?: LogData): void {
    this[level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error'](message, data, LogCategory.SECURITY);
  }

  static audit(level: LogLevel, message: string, data?: LogData): void {
    this[level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error'](message, data, LogCategory.AUDIT);
  }

  // Método para timing de operações
  static time(label: string): void {
    if (LOG_CONFIG.enableConsoleOutput) {
      console.time(label);
    }
  }

  static timeEnd(label: string, data?: LogData): void {
    if (LOG_CONFIG.enableConsoleOutput) {
      console.timeEnd(label);
    }
    
    this.info(`Operation completed: ${label}`, data, LogCategory.PERFORMANCE);
  }

  // Método para logs condicionais
  static conditional(condition: boolean, level: LogLevel, message: string, data?: LogData): void {
    if (condition) {
      this[level.toLowerCase() as 'debug' | 'info' | 'warn' | 'error'](message, data);
    }
  }
} 