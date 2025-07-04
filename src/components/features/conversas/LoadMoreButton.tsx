import { Button } from '@/components/ui/button';
import { Loader2, ChevronUp } from 'lucide-react';

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  totalMessages: number;
  loadedMessages: number;
}

export function LoadMoreButton({ 
  onLoadMore, 
  isLoading, 
  hasMore, 
  totalMessages, 
  loadedMessages 
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return null;
  }

  const remainingMessages = totalMessages - loadedMessages;

  return (
    <div className="flex flex-col items-center gap-2 py-4 border-b border-gray-200">
      <Button
        variant="outline"
        size="sm"
        onClick={onLoadMore}
        disabled={isLoading}
        className="flex items-center gap-2 text-sm"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </>
        ) : (
          <>
            <ChevronUp className="h-4 w-4" />
            Carregar mais mensagens
          </>
        )}
      </Button>
      
      <div className="text-xs text-gray-500">
        Mostrando {loadedMessages} de {totalMessages} mensagens
        {remainingMessages > 0 && (
          <span className="ml-1">
            ({remainingMessages} restantes)
          </span>
        )}
      </div>
    </div>
  );
}