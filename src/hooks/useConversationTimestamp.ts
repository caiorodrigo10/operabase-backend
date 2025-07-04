import { useMutation, useQueryClient } from '@tanstack/react-query';

interface UpdateTimestampParams {
  conversationId: string | number;
}

export function useConversationTimestamp() {
  const queryClient = useQueryClient();

  const updateTimestamp = useMutation({
    mutationFn: async ({ conversationId }: UpdateTimestampParams) => {
      const response = await fetch(`/api/conversations/${conversationId}/update-timestamp`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update conversation timestamp');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidar cache da lista de conversas para reordenação automática
      queryClient.invalidateQueries({ queryKey: ['/api/conversations-simple'] });
      console.log('🔄 Conversation list cache invalidated for reordering');
    },
    onError: (error) => {
      console.error('❌ Error updating conversation timestamp:', error);
    },
  });

  return {
    updateTimestamp: updateTimestamp.mutate,
    isUpdating: updateTimestamp.isPending,
  };
}