import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Conversation, Message, InsertConversation, InsertMessage } from '../../../shared/schema';
import { ConversationDetail, PaginationInfo } from '../types/conversations';

// Types para as respostas da API
interface ConversationsResponse {
  conversations: (Conversation & {
    contact_name: string;
    contact_phone: string;
    contact_email?: string;
    contact_status: string;
  })[];
  total: number;
  hasMore: boolean;
}

interface ConversationDetailResponse {
  conversation: Conversation;
  messages: (Message & {
    attachments: any[];
  })[];
  actions: {
    id: number;
    action_type: string;
    title: string;
    description: string;
    metadata: any;
    created_at: string;
  }[];
  pagination?: PaginationInfo;
}

export function useConversations(status: string = 'active', limit: number = 50) {
  return useQuery({
    queryKey: ['/api/conversations-simple', status, limit],
    queryFn: async () => {
      const timestamp = Date.now();
      const response = await fetch(`/api/conversations-simple?status=${status}&limit=${limit}&t=${timestamp}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar conversas');
      }
      return response.json() as Promise<ConversationsResponse>;
    },
    staleTime: 0, // Force fresh data for first_message_at field
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// Hook padrão com polling adaptativo baseado no estado da IA
export function useConversationDetail(conversationId: number | string | null) {
  const queryResult = useQuery({
    queryKey: ['/api/conversations-simple', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      // ETAPA 2: Add timestamp to bypass browser cache completely
      const timestamp = Date.now();
      const response = await fetch(`/api/conversations-simple/${conversationId}?t=${timestamp}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar conversa');
      }
      return response.json() as Promise<ConversationDetailResponse>;
    },
    enabled: !!conversationId,
    staleTime: 1000, // ETAPA 2: Reduced to 1 second for immediate updates
    gcTime: 2 * 60 * 1000, // ETAPA 2: Reduced to 2 minutes for faster cache clearing
    refetchInterval: (data, query) => {
      // Polling adaptativo baseado no estado da IA
      if (!data?.conversation) return false;
      
      const conversation = data.conversation;
      const isAiPaused = conversation.ai_active === false;
      
      // ETAPA 2: More aggressive polling during uploads
      // Se IA pausada: polling mais frequente para detectar reativação
      // Se IA ativa: polling normal
      return isAiPaused ? 1000 : 3000; // 1s vs 3s (mais agressivo)
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return queryResult;
}

// Hook ETAPA 3: Paginação Progressiva com Infinite Query
export function useInfiniteConversationDetail(conversationId: number | string | null, limit: number = 25) {
  return useInfiniteQuery({
    queryKey: ['/api/conversations-simple', conversationId, 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      if (!conversationId) throw new Error('ID da conversa é obrigatório');
      
      const response = await fetch(`/api/conversations-simple/${conversationId}?page=${pageParam}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar detalhes da conversa');
      }
      return response.json() as Promise<ConversationDetailResponse>;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasMore) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!conversationId,
    staleTime: 2 * 60 * 1000, // 2 minutos de cache para infinite query
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InsertConversation) => {
      return apiRequest('/api/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Invalidar lista de conversas
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, message }: { 
      conversationId: number | string; 
      message: { content: string } 
    }) => {
      const response = await fetch(`/api/conversations-simple/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: message.content }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar mensagem');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      console.log('✅ Message sent successfully:', data);
      
      // Invalidação imediata para atualizações em tempo real
      queryClient.invalidateQueries({ queryKey: ['/api/conversations-simple'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations-simple', variables.conversationId] 
      });
      
      // Refetch imediato da conversa para mostrar nova mensagem instantaneamente
      queryClient.refetchQueries({
        queryKey: ['/api/conversations-simple', variables.conversationId]
      });
    },
    onError: (error) => {
      console.error('❌ Error sending message details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        name: error.name
      });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: number) => {
      return apiRequest(`/api/conversations/${conversationId}/mark-read`, {
        method: 'PUT',
      });
    },
    onSuccess: (_, conversationId) => {
      // Invalidar conversa específica
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', conversationId] 
      });
      // Invalidar lista para atualizar contadores
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });
}

export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, archive }: { 
      conversationId: number; 
      archive: boolean 
    }) => {
      return apiRequest(`/api/conversations/${conversationId}/archive`, {
        method: 'PUT',
        body: JSON.stringify({ archive }),
      });
    },
    onSuccess: () => {
      // Invalidar todas as listas de conversas
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });
}