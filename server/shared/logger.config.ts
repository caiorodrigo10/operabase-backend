export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

export const currentLogLevel = (process.env.LOG_LEVEL as LogLevel) || 
  (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG');

export const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel];
};

export const LOG_CONFIG = {
  // Controla se logs de debug aparecem em produção
  enableDebugInProduction: process.env.ENABLE_DEBUG_LOGS === 'true',
  
  // Controla se logs são enviados para console além do structured logger
  enableConsoleOutput: process.env.NODE_ENV === 'development',
  
  // Controla sampling de logs de alta frequência
  enableSampling: process.env.NODE_ENV === 'production',
  samplingRate: 0.1, // 10% dos logs em produção
  
  // Configurações de performance
  maxLogLength: 1000, // Truncar logs muito longos
  enableStackTrace: process.env.NODE_ENV === 'development'
} as const; 