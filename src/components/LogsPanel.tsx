import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Search,
  Wifi,
  WifiOff,
  Circle,
  AlertCircle,
  Info,
  Clock
} from 'lucide-react';
import { useRealTimeLogs, LogEntry, LogFilter } from '@/hooks/useRealTimeLogs';

const LOG_COLORS = {
  mcp: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  openai: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  database: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  performance: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
};

const LEVEL_COLORS = {
  info: 'text-blue-600 dark:text-blue-400',
  warn: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
  debug: 'text-gray-600 dark:text-gray-400'
};

const LEVEL_ICONS = {
  info: Info,
  warn: AlertCircle,
  error: AlertCircle,
  debug: Circle
};

interface LogEntryProps {
  log: LogEntry;
  searchTerm?: string;
}

function LogEntryComponent({ log, searchTerm }: LogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const LevelIcon = LEVEL_ICONS[log.level];

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('pt-BR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const highlightText = (text: string, search?: string) => {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  const hasData = log.data && Object.keys(log.data).length > 0;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800">
      <div className="flex items-start gap-3">
        <LevelIcon className={`w-4 h-4 mt-0.5 ${LEVEL_COLORS[log.level]}`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`text-xs ${LOG_COLORS[log.type]}`}>
              {log.type.toUpperCase()}
            </Badge>
            
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(log.timestamp)}
            </span>
            
            {log.duration && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {log.duration}ms
              </Badge>
            )}
            
            {log.sessionId && (
              <Badge variant="outline" className="text-xs">
                Session: {log.sessionId.slice(-8)}
              </Badge>
            )}
          </div>
          
          <div className="text-sm">
            {log.endpoint && (
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300 mr-2">
                {log.endpoint}
              </span>
            )}
            <span 
              dangerouslySetInnerHTML={{ 
                __html: highlightText(log.message, searchTerm) 
              }}
            />
          </div>
          
          {hasData && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
            >
              {isExpanded ? 'Hide' : 'Show'} details
            </button>
          )}
          
          {isExpanded && hasData && (
            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
              {JSON.stringify(log.data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

interface LogsPanelProps {
  className?: string;
}

export function LogsPanel({ className }: LogsPanelProps) {
  const {
    logs,
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
  } = useRealTimeLogs();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para logs mais recentes
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, isPaused]);

  // Atualiza estatísticas periodicamente
  useEffect(() => {
    getStats();
    const interval = setInterval(getStats, 10000); // A cada 10s
    return () => clearInterval(interval);
  }, [getStats]);

  const filteredByTab = logs.filter(log => {
    if (activeTab === 'all') return true;
    return log.type === activeTab;
  });

  const handleFilterChange = (key: keyof LogFilter, value: string) => {
    if (key === 'search') {
      setSearchTerm(value);
      setFilter({ ...filter, search: value });
    } else {
      setFilter({ ...filter, [key]: value || undefined });
    }
  };

  const getTabCount = (type: string) => {
    if (type === 'all') return logs.length;
    return logs.filter(log => log.type === type).length;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Real-time Logs
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {isPaused && pausedCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {pausedCount} pending
              </Badge>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={togglePause}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={clearLogs}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportLogs()}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        {stats && (
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Total: {stats.total}</span>
            <span>Errors: {stats.byLevel.error}%</span>
            <span>Avg: {stats.avgDuration}ms</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="all" className="text-xs">
                All ({getTabCount('all')})
              </TabsTrigger>
              <TabsTrigger value="mcp" className="text-xs">
                MCP ({getTabCount('mcp')})
              </TabsTrigger>
              <TabsTrigger value="openai" className="text-xs">
                OpenAI ({getTabCount('openai')})
              </TabsTrigger>
              <TabsTrigger value="database" className="text-xs">
                DB ({getTabCount('database')})
              </TabsTrigger>
              <TabsTrigger value="error" className="text-xs">
                Errors ({getTabCount('error')})
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-xs">
                Perf ({getTabCount('performance')})
              </TabsTrigger>
            </TabsList>
          </div>
          
          <Separator />
          
          <TabsContent value={activeTab} className="m-0">
            <ScrollArea className="h-64" ref={scrollRef}>
              {filteredByTab.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {logs.length === 0 ? 'No logs yet' : 'No logs match current filter'}
                </div>
              ) : (
                <div>
                  {filteredByTab.map((log) => (
                    <LogEntryComponent
                      key={log.id}
                      log={log}
                      searchTerm={searchTerm}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}