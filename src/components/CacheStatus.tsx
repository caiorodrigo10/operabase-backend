import { useEffect, useState } from 'react';
import { Database, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  connected: boolean;
}

export function CacheStatus() {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics');
        const data = await response.json();
        
        if (data.cache?.metrics) {
          const cacheData = data.cache;
          const conversationMetrics = cacheData.metrics.conversations || {};
          
          setMetrics({
            hits: conversationMetrics.hits || 0,
            misses: conversationMetrics.misses || 0,
            hitRate: conversationMetrics.hitRate || 0,
            connected: cacheData.connected || false
          });
        }
      } catch (error) {
        console.warn('Failed to fetch cache metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    
    // Update metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return null;
  }

  const getStatusConfig = () => {
    if (!metrics.connected) {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        status: 'Fallback DB'
      };
    }
    
    if (metrics.hitRate >= 80) {
      return {
        icon: Zap,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        status: 'Cache Ativo'
      };
    }
    
    return {
      icon: Database,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      status: 'Cache Warming'
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center space-x-2 px-3 py-1 rounded-lg border text-xs font-medium",
      config.bgColor,
      config.borderColor
    )}>
      <Icon className={cn("w-3 h-3", config.color)} />
      <span className={config.color}>
        {config.status}
      </span>
      {metrics.connected && (
        <span className="text-gray-500">
          {Math.round(metrics.hitRate)}% hit
        </span>
      )}
    </div>
  );
}