import { useState, useEffect, useRef } from 'react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'mcp' | 'openai' | 'database' | 'error' | 'performance';
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  duration?: number;
  endpoint?: string;
  sessionId?: string;
  userId?: string;
}

export interface LogFilter {
  type?: LogEntry['type'];
  level?: LogEntry['level'];
  sessionId?: string;
  search?: string;
}

export interface LogStats {
  total: number;
  byType: Record<LogEntry['type'], number>;
  byLevel: Record<LogEntry['level'], number>;
  avgDuration: number;
  errorRate: number;
}

export function useRealTimeLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<LogFilter>({});
  const [stats, setStats] = useState<LogStats | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pausedLogsRef = useRef<LogEntry[]>([]);

  // Conecta ao stream de logs
  useEffect(() => {
    const connectToLogs = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource('/api/mcp/logs/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        console.log('📡 Connected to MCP logs stream');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            setIsConnected(true);
            return;
          }
          
          if (data.type === 'cleared') {
            setLogs([]);
            pausedLogsRef.current = [];
            return;
          }
          
          if (data.type === 'heartbeat') {
            return;
          }

          // Converte timestamp string para Date
          const logEntry: LogEntry = {
            ...data,
            timestamp: new Date(data.timestamp)
          };

          if (isPaused) {
            // Armazena logs enquanto pausado
            pausedLogsRef.current.unshift(logEntry);
            // Limita buffer de logs pausados
            if (pausedLogsRef.current.length > 200) {
              pausedLogsRef.current = pausedLogsRef.current.slice(0, 200);
            }
          } else {
            // Adiciona log em tempo real
            setLogs(prevLogs => {
              const newLogs = [logEntry, ...prevLogs];
              return newLogs.slice(0, 100); // Mantém apenas os últimos 100
            });
          }
        } catch (error) {
          console.error('Error parsing log entry:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setIsConnected(false);
        
        // Reconecta após 5 segundos
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectToLogs();
          }
        }, 5000);
      };
    };

    connectToLogs();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isPaused]);

  // Filtra logs baseado no filtro atual
  const filteredLogs = logs.filter(log => {
    if (filter.type && log.type !== filter.type) return false;
    if (filter.level && log.level !== filter.level) return false;
    if (filter.sessionId && log.sessionId !== filter.sessionId) return false;
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        log.message.toLowerCase().includes(searchLower) ||
        log.endpoint?.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.data).toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Obtém estatísticas dos logs
  const getStats = async () => {
    try {
      const response = await fetch('/api/mcp/logs/stats');
      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Limpa todos os logs
  const clearLogs = async () => {
    try {
      await fetch('/api/mcp/logs', { method: 'DELETE' });
      setLogs([]);
      pausedLogsRef.current = [];
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  // Exporta logs
  const exportLogs = async (exportFilter?: LogFilter) => {
    try {
      const response = await fetch('/api/mcp/logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportFilter || filter)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mcp-logs-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  // Pausa/resume logs
  const togglePause = () => {
    if (isPaused) {
      // Resume: adiciona logs pausados
      const combinedLogs = [...pausedLogsRef.current, ...logs];
      setLogs(combinedLogs.slice(0, 100));
      pausedLogsRef.current = [];
    }
    setIsPaused(!isPaused);
  };

  // Obtém contagem de logs pausados
  const pausedCount = pausedLogsRef.current.length;

  return {
    logs: filteredLogs,
    allLogs: logs,
    isConnected,
    isPaused,
    pausedCount,
    filter,
    stats,
    setFilter,
    clearLogs,
    exportLogs,
    togglePause,
    getStats
  };
}