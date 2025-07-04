import { Router, Request, Response } from 'express';
import { mcpLogsService, LogEntry } from './logs.service';

const router = Router();

/**
 * GET /api/mcp/logs/stream
 * Server-Sent Events endpoint para logs em tempo real
 */
router.get('/logs/stream', (req: Request, res: Response) => {
  // Configura headers para SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Envia evento inicial
  res.write('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n');

  // Handler para novos logs
  const onNewLog = (logEntry: LogEntry) => {
    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  };

  // Handler para limpeza de logs
  const onLogsCleared = () => {
    res.write('data: {"type":"cleared","timestamp":"' + new Date().toISOString() + '"}\n\n');
  };

  // Registra listeners
  mcpLogsService.on('newLog', onNewLog);
  mcpLogsService.on('logsCleared', onLogsCleared);

  // Cleanup ao fechar conexão
  req.on('close', () => {
    mcpLogsService.removeListener('newLog', onNewLog);
    mcpLogsService.removeListener('logsCleared', onLogsCleared);
  });

  // Heartbeat para manter conexão viva
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

/**
 * GET /api/mcp/logs
 * Obtém logs com filtros opcionais
 */
router.get('/logs', (req: Request, res: Response) => {
  try {
    const { type, level, sessionId, limit } = req.query;
    
    const filter: any = {};
    if (type) filter.type = type as LogEntry['type'];
    if (level) filter.level = level as LogEntry['level'];
    if (sessionId) filter.sessionId = sessionId as string;
    if (limit) filter.limit = parseInt(limit as string);

    const logs = mcpLogsService.getLogs(filter);
    
    res.json({
      success: true,
      data: logs,
      total: logs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao obter logs'
    });
  }
});

/**
 * DELETE /api/mcp/logs
 * Limpa todos os logs
 */
router.delete('/logs', (req: Request, res: Response) => {
  try {
    mcpLogsService.clearLogs();
    
    res.json({
      success: true,
      message: 'Logs limpos com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar logs'
    });
  }
});

/**
 * GET /api/mcp/logs/stats
 * Obtém estatísticas dos logs
 */
router.get('/logs/stats', (req: Request, res: Response) => {
  try {
    const stats = mcpLogsService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas'
    });
  }
});

/**
 * POST /api/mcp/logs/export
 * Exporta logs em formato JSON
 */
router.post('/logs/export', (req: Request, res: Response) => {
  try {
    const { type, level, sessionId } = req.body;
    
    const filter: any = {};
    if (type) filter.type = type;
    if (level) filter.level = level;
    if (sessionId) filter.sessionId = sessionId;

    const logs = mcpLogsService.getLogs(filter);
    const stats = mcpLogsService.getStats();
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      filter,
      stats,
      logs
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=mcp-logs-${Date.now()}.json`);
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao exportar logs'
    });
  }
});

export default router;