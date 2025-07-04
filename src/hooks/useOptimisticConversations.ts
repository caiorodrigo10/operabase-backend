import { useOptimisticMutation } from './useOptimisticMutation';
import { apiRequest } from '@/lib/queryClient';

// ETAPA 3: Optimistic mutation for marking messages as read
export function useOptimisticMarkAsRead() {
  return useOptimisticMutation({
    mutationFn: async ({ conversationId, messageId }: { conversationId: number; messageId: number }) => {
      return await apiRequest(`/api/conversations-simple/${conversationId}/mark-read`, {
        method: 'POST',
        body: { messageId }
      });
    },
    onOptimisticUpdate: ({ conversationId }) => {
      // Return optimistic state - mark conversation as read
      return { conversationId, unreadCount: 0, markedAt: new Date().toISOString() };
    },
    queryKey: ['/api/conversations-simple'],
    rollbackDelay: 3000
  });
}

// ETAPA 3: Optimistic mutation for archiving conversations
export function useOptimisticArchiveConversation() {
  return useOptimisticMutation({
    mutationFn: async ({ conversationId }: { conversationId: number }) => {
      return await apiRequest(`/api/conversations-simple/${conversationId}/archive`, {
        method: 'POST'
      });
    },
    onOptimisticUpdate: ({ conversationId }) => {
      // Return optimistic state - conversation archived
      return { conversationId, status: 'archived', archivedAt: new Date().toISOString() };
    },
    queryKey: ['/api/conversations-simple'],
    rollbackDelay: 5000
  });
}

// ETAPA 3: Optimistic mutation for adding conversation notes
export function useOptimisticAddNote() {
  return useOptimisticMutation({
    mutationFn: async ({ conversationId, note }: { conversationId: number; note: string }) => {
      return await apiRequest(`/api/conversations-simple/${conversationId}/notes`, {
        method: 'POST',
        body: { note }
      });
    },
    onOptimisticUpdate: ({ conversationId, note }) => {
      // Return optimistic state - note added
      const optimisticNote = {
        id: `temp_${Date.now()}`,
        conversationId,
        content: note,
        createdAt: new Date().toISOString(),
        isPending: true
      };
      return optimisticNote;
    },
    queryKey: ['/api/conversations-simple'],
    rollbackDelay: 4000
  });
}

// ETAPA 3: Optimistic mutation for conversation priority
export function useOptimisticSetPriority() {
  return useOptimisticMutation({
    mutationFn: async ({ conversationId, priority }: { conversationId: number; priority: 'low' | 'normal' | 'high' | 'urgent' }) => {
      return await apiRequest(`/api/conversations-simple/${conversationId}/priority`, {
        method: 'POST',
        body: { priority }
      });
    },
    onOptimisticUpdate: ({ conversationId, priority }) => {
      // Return optimistic state - priority changed
      return { 
        conversationId, 
        priority, 
        priorityChangedAt: new Date().toISOString(),
        isPriorityPending: true
      };
    },
    queryKey: ['/api/conversations-simple'],
    rollbackDelay: 3000
  });
}