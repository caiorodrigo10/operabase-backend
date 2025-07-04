/**
 * ETAPA 5: WebSocket Real-Time Hook
 * Manages WebSocket connection with auto-reconnection and cache invalidation
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connectionCount: number;
}

interface MessageEvent {
  conversationId: string;
  message: any;
  timestamp: string;
}

interface ConversationListEvent {
  conversationId: string;
  clinicId: number;
  eventType: 'new' | 'updated' | 'deleted';
  timestamp: string;
}

export const useWebSocket = (userId?: string, clinicId?: number) => {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    connectionCount: 0
  });
  
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Connection function with auth token
  const connect = useCallback(() => {
    if (!userId || !clinicId) {
      console.log('⚠️ ETAPA 5: Missing userId or clinicId, skipping WebSocket connection');
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));
    
    try {
      const socket = io('/', {
        auth: {
          token: JSON.stringify({
            userId,
            email: 'cr@caiorodrigo.com.br', // Fixed for demo
            clinicId,
            name: 'Caio Rodrigo'
          })
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        console.log('✅ ETAPA 5: WebSocket connected');
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          connecting: false, 
          error: null,
          connectionCount: prev.connectionCount + 1
        }));
        reconnectAttempts.current = 0;
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ ETAPA 5: WebSocket disconnected:', reason);
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false
        }));
        
        // Auto-reconnect with exponential backoff
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect
          return;
        }
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 1s, 2s, 4s, 8s, 16s
          console.log(`🔄 ETAPA 5: Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setState(prev => ({ 
            ...prev, 
            error: 'Max reconnection attempts reached. Using fallback polling.'
          }));
        }
      });

      socket.on('connect_error', (error) => {
        console.error('❌ ETAPA 5: WebSocket connection error:', error);
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false, 
          error: error.message || 'Connection failed'
        }));
      });

      // ETAPA 5: Message events with cache invalidation
      socket.on('message:new', (data: MessageEvent) => {
        console.log('📨 ETAPA 5: New message received via WebSocket:', data.conversationId);
        
        // Invalidate conversation detail cache
        queryClient.invalidateQueries({ 
          queryKey: ['/api/conversations-simple', data.conversationId]
        });
        
        // Invalidate conversation list cache
        queryClient.invalidateQueries({ 
          queryKey: ['/api/conversations-simple']
        });
      });

      socket.on('message:updated', (data: MessageEvent) => {
        console.log('📝 ETAPA 5: Message updated via WebSocket:', data.conversationId);
        
        queryClient.invalidateQueries({ 
          queryKey: ['/api/conversations-simple', data.conversationId]
        });
      });

      socket.on('conversation:list:updated', (data: ConversationListEvent) => {
        console.log('📋 ETAPA 5: Conversation list updated via WebSocket');
        
        queryClient.invalidateQueries({ 
          queryKey: ['/api/conversations-simple']
        });
      });

      // ETAPA 5: AI reactivation event for real-time UI sync
      socket.on('ai_reactivated', (data: { conversation_id: string; ai_active: boolean; timestamp: string }) => {
        console.log('🤖 ETAPA 5: AI reactivated via WebSocket:', data.conversation_id);
        
        // Invalidate conversation detail cache to refresh AI button state
        queryClient.invalidateQueries({ 
          queryKey: ['/api/conversations-simple', data.conversation_id]
        });
        
        // Also invalidate conversation list cache
        queryClient.invalidateQueries({ 
          queryKey: ['/api/conversations-simple']
        });
      });

      // ⚡ AI CONFIG CHANGED: Real-time sync when Livia configuration changes
      socket.on('ai_config_changed', (data: { 
        clinic_id: number; 
        whatsapp_connected: boolean; 
        ai_should_be_active: boolean; 
        timestamp: string 
      }) => {
        console.log('⚡ SYNC: Livia config changed via WebSocket - invalidating ALL caches immediately');
        console.log('📋 Config change details:', data);
        
        // Force immediate invalidation of ALL conversation caches
        queryClient.invalidateQueries({ 
          queryKey: ['/api/conversations-simple']
        });
        
        // Force refetch to bypass any cache
        queryClient.refetchQueries({
          queryKey: ['/api/conversations-simple']
        });
        
        console.log('✅ SYNC: Cache invalidation complete - AI buttons should update in <5 seconds');
      });

      // Join clinic room for notifications
      socket.emit('clinic:join', clinicId);

    } catch (error) {
      console.error('❌ ETAPA 5: Error creating WebSocket connection:', error);
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false, 
        error: 'Failed to create connection'
      }));
    }
  }, [userId, clinicId, queryClient]);

  // Join conversation room
  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('conversation:join', conversationId);
      console.log(`💬 ETAPA 5: Joined conversation room: ${conversationId}`);
    }
  }, []);

  // Leave conversation room
  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('conversation:leave', conversationId);
      console.log(`👋 ETAPA 5: Left conversation room: ${conversationId}`);
    }
  }, []);

  // Manual disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false 
      }));
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    joinConversation,
    leaveConversation,
    socket: socketRef.current
  };
};