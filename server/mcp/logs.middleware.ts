import { Request, Response, NextFunction } from 'express';
import { mcpLogsService } from './logs.service';

/**
 * Middleware para interceptar e logar todas as chamadas MCP
 */
export const mcpLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Intercepta a resposta para capturar dados de retorno
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    const sessionId = req.body?.sessionId || req.headers['x-session-id'] as string;
    
    // Log da chamada MCP
    mcpLogsService.logMCPCall(
      req.path,
      req.method,
      {
        request: req.body,
        response: typeof data === 'string' ? JSON.parse(data) : data,
        statusCode: res.statusCode
      },
      sessionId,
      duration
    );

    // Log de performance se demorou muito
    if (duration > 500) {
      mcpLogsService.logPerformance(
        `MCP ${req.method} ${req.path}`,
        duration,
        { statusCode: res.statusCode },
        sessionId
      );
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware específico para interceptar logs do ChatInterpreter
 */
export const chatInterpreterLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const sessionId = req.body?.sessionId;
  
  if (req.path === '/api/mcp/chat' && req.method === 'POST') {
    const userMessage = req.body?.message;
    
    // Log da mensagem do usuário
    mcpLogsService.addLog({
      type: 'openai',
      level: 'info',
      message: 'User message received',
      data: { userMessage },
      sessionId
    });

    // Intercepta resposta para logar interpretação
    const originalSend = res.send;
    res.send = function(data: any) {
      const duration = Date.now() - startTime;
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (responseData.success && responseData.data) {
        mcpLogsService.logOpenAI(
          userMessage,
          responseData.data.action,
          sessionId,
          duration
        );
      } else if (!responseData.success) {
        mcpLogsService.logError(
          responseData.error || 'Chat interpretation failed',
          { userMessage },
          sessionId
        );
      }

      return originalSend.call(this, data);
    };
  }

  next();
};

/**
 * Middleware global para capturar erros
 */
export const errorLoggingMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.body?.sessionId || req.headers['x-session-id'] as string;
  
  mcpLogsService.logError(err, {
    method: req.method,
    path: req.path,
    body: req.body,
    params: req.params
  }, sessionId);

  next(err);
};