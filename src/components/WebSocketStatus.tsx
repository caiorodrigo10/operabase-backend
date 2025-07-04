/**
 * ETAPA 5: WebSocket Connection Status Component
 * Displays real-time connection status with visual indicators
 */
import { Wifi, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebSocketStatusProps {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connectionCount?: number;
  className?: string;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  connected,
  connecting,
  error,
  connectionCount = 0,
  className
}) => {
  const getStatusIcon = () => {
    if (connecting) return <AlertCircle className="h-4 w-4 animate-pulse" />;
    if (connected) return <CheckCircle2 className="h-4 w-4" />;
    if (error) return <WifiOff className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (connecting) return 'text-yellow-500';
    if (connected) return 'text-green-500';
    if (error) return 'text-red-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (connecting) return 'Conectando...';
    if (connected) return 'Tempo Real';
    if (error) return 'Modo Offline';
    return 'Desconectado';
  };

  const getStatusBg = () => {
    if (connecting) return 'bg-yellow-50 border-yellow-200';
    if (connected) return 'bg-green-50 border-green-200';
    if (error) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium',
      getStatusBg(),
      getStatusColor(),
      className
    )}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {connectionCount > 0 && (
        <span className="text-xs opacity-75">
          #{connectionCount}
        </span>
      )}
      {error && (
        <span className="text-xs opacity-75 max-w-32 truncate">
          {error}
        </span>
      )}
    </div>
  );
};