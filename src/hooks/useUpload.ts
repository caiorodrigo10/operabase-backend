import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface UploadParams {
  conversationId: string;
  file: File;
  caption?: string;
  sendToWhatsApp?: boolean;
}

interface UploadResult {
  success: boolean;
  data: {
    message: any;
    attachment: any;
    signedUrl: string;
    expiresAt: string;
    whatsapp: {
      sent: boolean;
      messageId?: string;
      error?: string;
    };
  };
}

interface OptimisticMessage {
  id: string;
  conversation_id: string;
  sender_type: 'professional';
  content: string;
  ai_action: 'file_upload';
  timestamp: string;
  device_type: 'manual';
  evolution_status: 'pending';
  message_type: string;
  isOptimistic: true;
  localFileUrl?: string;
}

interface OptimisticAttachment {
  id: string;
  message_id: string;
  clinic_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  isOptimistic: true;
}

// Helper functions for optimistic updates
function createOptimisticMessage(conversationId: string, file: File, caption?: string): OptimisticMessage {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const localFileUrl = URL.createObjectURL(file);
  
  // Determine message type based on file type
  let messageType = 'file';
  if (file.type.startsWith('image/')) messageType = 'image';
  else if (file.type.startsWith('audio/')) messageType = 'audio_voice';
  else if (file.type.startsWith('video/')) messageType = 'video';
  else if (file.type.includes('pdf') || file.type.includes('document')) messageType = 'document';
  
  return {
    id: tempId,
    conversation_id: conversationId,
    sender_type: 'professional',
    content: caption || '',
    ai_action: 'file_upload',
    timestamp: new Date().toISOString(),
    device_type: 'manual',
    evolution_status: 'pending',
    message_type: messageType,
    isOptimistic: true,
    localFileUrl
  };
}

function createOptimisticAttachment(messageId: string, file: File): OptimisticAttachment {
  const tempId = `temp-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const localFileUrl = URL.createObjectURL(file);
  
  return {
    id: tempId,
    message_id: messageId,
    clinic_id: 1, // Assumindo clinic_id 1 por ora
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    file_url: localFileUrl,
    isOptimistic: true
  };
}

export function useUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, file, caption, sendToWhatsApp = true }: UploadParams): Promise<UploadResult> => {
      console.log('📤 useUpload: Received parameters:', {
        conversationId,
        conversationIdType: typeof conversationId,
        conversationIdLength: conversationId?.length,
        fileName: file.name,
        fileSize: file.size
      });

      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('caption', caption);
      formData.append('sendToWhatsApp', sendToWhatsApp.toString());

      console.log(`📤 Uploading file: ${file.name} (${file.size} bytes) to conversation ${conversationId}`);

      console.log(`📤 Frontend: Making upload request to /api/conversations/${conversationId}/upload`);
      console.log(`📤 Frontend: FormData keys:`, Array.from(formData.keys()));
      console.log(`📤 Frontend: File info:`, file.name, file.size, file.type);
      
      const response = await fetch(`/api/conversations/${conversationId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          // Não adicionar Content-Type - deixar o browser definir boundary para multipart
        }
      });
      
      console.log(`📤 Frontend: Response status:`, response.status);
      console.log(`📤 Frontend: Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Upload failed with status ${response.status}:`, errorText);
        const error = JSON.parse(errorText || '{}').error || errorText || `HTTP ${response.status}`;
        throw new Error(error);
      }

      const result = await response.json();
      console.log(`✅ Upload successful:`, result);
      
      return result;
    },
    onMutate: async ({ conversationId, file, caption }) => {
      console.log('⚡ OPTIMISTIC: Starting optimistic update for upload');
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/conversations-simple', conversationId] });
      
      // Create optimistic message and attachment
      const optimisticMessage = createOptimisticMessage(conversationId, file, caption);
      const optimisticAttachment = createOptimisticAttachment(optimisticMessage.id, file);
      
      console.log('⚡ OPTIMISTIC: Created optimistic message:', optimisticMessage);
      console.log('⚡ OPTIMISTIC: Created optimistic attachment:', optimisticAttachment);
      
      // Get current conversation data
      const previousData = queryClient.getQueryData(['/api/conversations-simple', conversationId]);
      
      // Update the cache with optimistic data
      queryClient.setQueryData(['/api/conversations-simple', conversationId], (old: any) => {
        if (!old) return old;
        
        console.log('⚡ OPTIMISTIC: Updating cache with optimistic data');
        
        return {
          ...old,
          conversation: {
            ...old.conversation,
            ai_active: false // AI becomes inactive immediately
          },
          messages: [
            ...old.messages,
            {
              ...optimisticMessage,
              attachments: [optimisticAttachment]
            }
          ],
          totalMessages: old.totalMessages + 1
        };
      });
      
      // Return context for potential rollback
      return { previousData, optimisticMessage, optimisticAttachment };
    },
    onSuccess: (data, variables, context) => {
      console.log('✅ OPTIMISTIC: Upload completed successfully, replacing optimistic data');
      
      // Clean up the local file URL to prevent memory leaks
      if (context?.optimisticAttachment?.file_url?.startsWith('blob:')) {
        URL.revokeObjectURL(context.optimisticAttachment.file_url);
        console.log('🧹 OPTIMISTIC: Cleaned up local file URL');
      }
      
      // 🚀 ETAPA 5.1: TRANSITION STATE MANAGEMENT - Preserve optimistic data during transition
      console.log('⚡ ETAPA 5.1: Starting smooth transition from optimistic to real data');
      
      // Flag to preserve optimistic data until real data is confirmed
      const transitionId = `transition-${Date.now()}`;
      console.log('🔄 ETAPA 5.1: Created transition ID:', transitionId);
      
      try {
        // ETAPA 5.1: Don't remove optimistic data immediately - let it persist during transition
        console.log('🛡️ ETAPA 5.1: Preserving optimistic data during cache transition');
        
        // ETAPA 5.2: CACHE REPLACEMENT - Fetch fresh data and replace cache directly
        const timestamp = Date.now();
        const bustParam = Math.random();
        
        console.log('🔄 ETAPA 5.2: Fetching fresh data with cache replacement strategy');
        
        // Fetch fresh conversation detail and replace cache directly (no invalidation gap)
        const freshDetailPromise = queryClient.fetchQuery({
          queryKey: ['/api/conversations-simple', variables.conversationId],
          queryFn: async () => {
            const response = await fetch(`/api/conversations-simple/${variables.conversationId}?nocache=${timestamp}&bust=${bustParam}`);
            return response.json();
          },
          staleTime: 0,
          gcTime: 0
        });
        
        // Fetch fresh conversation list and replace cache directly
        const freshListPromise = queryClient.fetchQuery({
          queryKey: ['/api/conversations-simple'],
          queryFn: async () => {
            const response = await fetch(`/api/conversations-simple?nocache=${timestamp}&bust=${bustParam}`);
            return response.json();
          },
          staleTime: 0,
          gcTime: 0
        });
        
        // ETAPA 5.2: Wait for fresh data and then seamlessly replace cache
        Promise.all([freshDetailPromise, freshListPromise]).then(() => {
          console.log('✅ ETAPA 5.2: Fresh data fetched and cache replaced seamlessly');
          console.log('🔄 ETAPA 5.2: Transition completed - optimistic → real data replacement');
        }).catch(error => {
          console.error('❌ ETAPA 5.2: Error during cache replacement:', error);
        });
        
        // 5. Set staleTime to 0 temporarily for immediate updates
        queryClient.setQueryDefaults(['/api/conversations-simple', variables.conversationId], {
          staleTime: 0,
          gcTime: 0
        });
        
        setTimeout(() => {
          // Reset to normal cache settings after 5 seconds
          queryClient.setQueryDefaults(['/api/conversations-simple', variables.conversationId], {
            staleTime: 3000,
            gcTime: 5 * 60 * 1000
          });
          console.log('⚡ ETAPA 2: Cache settings reset to normal');
        }, 5000);
        
        // 📡 WEBSOCKET: Tentar emitir evento WebSocket se disponível
        const webSocketEmit = (window as any).webSocketEmit;
        if (webSocketEmit) {
          webSocketEmit('conversation:updated', {
            conversationId: variables.conversationId,
            type: 'file_upload',
            messageId: data.data.message.id,
            attachmentId: data.data.attachment.id
          });
          console.log('📡 ETAPA 2: WebSocket evento emitido');
        }
        
        console.log('✅ ETAPA 2: Aggressive cache invalidation completed - data should appear instantly');
        
      } catch (error) {
        console.log('⚠️ ETAPA 2: Aggressive cache invalidation falhou:', error);
      }
    },
    onError: (error, variables, context) => {
      console.error('❌ OPTIMISTIC: Upload failed, rolling back optimistic updates');
      
      // Clean up the local file URL
      if (context?.optimisticAttachment?.file_url?.startsWith('blob:')) {
        URL.revokeObjectURL(context.optimisticAttachment.file_url);
        console.log('🧹 OPTIMISTIC: Cleaned up local file URL after error');
      }
      
      // Rollback to previous data
      if (context?.previousData) {
        queryClient.setQueryData(['/api/conversations-simple', variables.conversationId], context.previousData);
        console.log('⚡ OPTIMISTIC: Rolled back to previous data');
      }
      
      console.error('Upload error details:', error);
    },
    onSettled: () => {
      console.log('🎯 OPTIMISTIC: Upload mutation settled, refreshing data');
      
      // Force a final refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations-simple'] 
      });
    }
  });
}