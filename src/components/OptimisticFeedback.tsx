import { CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimisticFeedbackProps {
  status: 'pending' | 'confirmed' | 'failed';
  message?: string;
  className?: string;
}

export function OptimisticFeedback({ 
  status, 
  message, 
  className 
}: OptimisticFeedbackProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Loader2,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          defaultMessage: 'Processando...',
          animate: 'animate-spin'
        };
      case 'confirmed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          defaultMessage: 'Confirmado!',
          animate: ''
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          defaultMessage: 'Falhou - tentando novamente...',
          animate: ''
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          defaultMessage: 'Aguardando...',
          animate: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center space-x-2 px-3 py-1 rounded-lg border text-sm font-medium transition-all duration-200",
      config.bgColor,
      config.borderColor,
      className
    )}>
      <Icon className={cn("w-4 h-4", config.color, config.animate)} />
      <span className={config.color}>
        {message || config.defaultMessage}
      </span>
    </div>
  );
}

// Helper component for message-level optimistic feedback
export function MessageOptimisticStatus({ 
  isPending, 
  isConfirmed, 
  isFailed 
}: { 
  isPending: boolean; 
  isConfirmed: boolean; 
  isFailed: boolean; 
}) {
  if (isPending) {
    return <OptimisticFeedback status="pending" className="text-xs" />;
  }
  
  if (isFailed) {
    return <OptimisticFeedback status="failed" className="text-xs" />;
  }
  
  if (isConfirmed) {
    return <OptimisticFeedback status="confirmed" className="text-xs" />;
  }
  
  return null;
}