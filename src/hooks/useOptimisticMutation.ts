import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface OptimisticAction<TData, TVariables> {
  id: string;
  type: string;
  data: TData;
  variables: TVariables;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

interface UseOptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onOptimisticUpdate: (variables: TVariables) => TData;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  queryKey: string[];
  rollbackDelay?: number;
}

export function useOptimisticMutation<TData, TVariables>({
  mutationFn,
  onOptimisticUpdate,
  onSuccess,
  onError,
  queryKey,
  rollbackDelay = 5000
}: UseOptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingActions, setPendingActions] = useState<OptimisticAction<TData, TVariables>[]>([]);

  // ETAPA 3: Main mutation with optimistic updates
  const mutation = useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Create optimistic action
      const actionId = `optimistic_${Date.now()}_${Math.random()}`;
      const optimisticData = onOptimisticUpdate(variables);
      
      const action: OptimisticAction<TData, TVariables> = {
        id: actionId,
        type: 'optimistic_update',
        data: optimisticData,
        variables,
        timestamp: Date.now(),
        status: 'pending'
      };

      // Add to pending actions
      setPendingActions(prev => [...prev, action]);

      // Optimistically update query data
      queryClient.setQueryData(queryKey, optimisticData);

      // Show optimistic feedback
      toast({
        title: "Processando...",
        description: "Sua ação está sendo processada.",
        duration: 1000
      });

      return { previousData, actionId };
    },
    onSuccess: (data, variables, context) => {
      // Update action status to confirmed
      setPendingActions(prev => 
        prev.map(action => 
          action.id === context?.actionId 
            ? { ...action, status: 'confirmed' as const }
            : action
        )
      );

      // Update with server response
      queryClient.setQueryData(queryKey, data);

      // Remove confirmed action after delay
      setTimeout(() => {
        setPendingActions(prev => 
          prev.filter(action => action.id !== context?.actionId)
        );
      }, 2000);

      onSuccess?.(data, variables);

      toast({
        title: "Sucesso!",
        description: "Ação realizada com sucesso.",
        duration: 2000
      });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }

      // Update action status to failed
      setPendingActions(prev => 
        prev.map(action => 
          action.id === context?.actionId 
            ? { ...action, status: 'failed' as const }
            : action
        )
      );

      // Remove failed action after delay
      setTimeout(() => {
        setPendingActions(prev => 
          prev.filter(action => action.id !== context?.actionId)
        );
      }, rollbackDelay);

      onError?.(error, variables);

      toast({
        title: "Erro",
        description: "Não foi possível completar a ação. Tentando novamente...",
        variant: "destructive",
        duration: 3000
      });

      // Auto-retry after a delay
      setTimeout(() => {
        mutation.mutate(variables);
      }, 2000);
    }
  });

  // Helper to check if there are pending actions
  const hasPendingActions = useCallback(() => {
    return pendingActions.some(action => action.status === 'pending');
  }, [pendingActions]);

  // Helper to get pending actions by type
  const getPendingActions = useCallback((type?: string) => {
    if (type) {
      return pendingActions.filter(action => action.type === type);
    }
    return pendingActions;
  }, [pendingActions]);

  // Manual rollback function
  const rollback = useCallback((actionId: string) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (action) {
      setPendingActions(prev => prev.filter(a => a.id !== actionId));
      queryClient.invalidateQueries({ queryKey });
    }
  }, [pendingActions, queryClient, queryKey]);

  return {
    ...mutation,
    pendingActions,
    hasPendingActions,
    getPendingActions,
    rollback
  };
}