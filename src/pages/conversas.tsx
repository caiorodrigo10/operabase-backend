import { useState, useEffect, useRef } from "react";
import { ConversationsSidebar } from "@/components/features/conversas/ConversationsSidebar";
import { MainConversationArea } from "@/components/features/conversas/MainConversationArea";
import { PatientInfoPanel } from "@/components/features/conversas/PatientInfoPanel";

import { CacheStatus } from "@/components/CacheStatus";
import { useConversations, useConversationDetail, useSendMessage, useMarkAsRead } from '@/hooks/useConversations';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useOptimisticMarkAsRead } from '@/hooks/useOptimisticConversations';
import { Conversation, TimelineItem, PatientInfo } from "@/types/conversations";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function ConversasPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | string | undefined>();
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [currentPatientInfo, setCurrentPatientInfo] = useState<PatientInfo | undefined>();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Backend hooks
  const { data: conversationsData, isLoading: loadingConversations } = useConversations('active');
  const { data: conversationDetail, isLoading: loadingDetail } = useConversationDetail(selectedConversationId || null);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  
  // ETAPA 5: WebSocket integration for real-time communication with user context
  const webSocket = useWebSocket('3cd96e6d-81f2-4c8a-a54d-3abac77b37a4', 1);
  
  // ETAPA 3: Optimistic mutations for instant UX
  const optimisticMarkAsRead = useOptimisticMarkAsRead();

  // ETAPA 5: WebSocket integration with conversation join/leave + fallback polling
  useEffect(() => {
    if (!selectedConversationId) return;

    // Join WebSocket conversation room
    webSocket.joinConversation(String(selectedConversationId));

    // Fallback polling only if WebSocket is not connected
    if (!webSocket.connected) {
      pollingIntervalRef.current = setInterval(() => {
        queryClient.invalidateQueries({
          queryKey: ['/api/conversations-simple', selectedConversationId]
        });
      }, 2000);
    }

    return () => {
      // Leave WebSocket room
      webSocket.leaveConversation(String(selectedConversationId));
      
      // Clear polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [selectedConversationId, queryClient, webSocket]);

  // Polling para lista de conversas (menos frequente)
  useEffect(() => {
    const listInterval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ['/api/conversations-simple']
      });
    }, 10000);

    return () => clearInterval(listInterval);
  }, [queryClient]);

  // Refetch imediato quando a aba ganha foco
  useEffect(() => {
    const handleFocus = () => {
      if (selectedConversationId) {
        queryClient.invalidateQueries({
          queryKey: ['/api/conversations-simple', selectedConversationId]
        });
      }
      queryClient.invalidateQueries({
        queryKey: ['/api/conversations-simple']
      });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedConversationId, queryClient]);

  // Handle responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1200);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Auto-select first conversation on load (only once)
  useEffect(() => {
    if (conversationsData?.conversations.length > 0 && selectedConversationId === undefined) {
      setSelectedConversationId(conversationsData.conversations[0].id);
    }
  }, [conversationsData]);

  // Convert backend data to frontend format
  const convertToFrontendConversations = (): Conversation[] => {
    if (!conversationsData?.conversations) return [];
    
    return conversationsData.conversations.map(conv => ({
      id: conv.id,
      patient_name: conv.contact_name || 'Contato sem nome',
      patient_avatar: conv.patient_avatar || undefined,
      last_message: conv.last_message || 'Toque para ver a conversa',
      timestamp: conv.last_message_at || conv.timestamp, // CORRIGIDO: usar timestamp da última mensagem
      updated_at: conv.updated_at,
      first_message_at: conv.first_message_at,
      last_message_at: conv.last_message_at, // ADICIONADO: timestamp da última mensagem
      unread_count: conv.unread_count || 0,
      status: conv.status === 'active' ? 'active' : 'inactive',
      ai_active: conv.ai_active ?? true,
      has_pending_appointment: false
    }));
  };

  // ETAPA 1: Process conversation detail with optimized checks
  useEffect(() => {
    if (conversationDetail?.messages && conversationDetail.conversation.id == selectedConversationId) {
      console.log('📊 Processing timeline for conversation:', selectedConversationId, 'with', conversationDetail.messages.length, 'messages');
      const timeline: TimelineItem[] = [];
      
      // Add messages to timeline
      conversationDetail.messages.forEach((msg, index) => {
        timeline.push({
          id: msg.id,
          type: 'message',
          timestamp: msg.timestamp,
          data: {
            id: msg.id,
            conversation_id: msg.conversation_id,
            type: msg.sender_type === 'ai' ? 'sent_ai' : 
                  msg.sender_type === 'professional' ? 'sent_user' : 'received',
            content: msg.content || '',
            timestamp: msg.timestamp,
            created_at: msg.timestamp,
            sender_name: msg.sender_type === 'ai' ? 'Mara AI' : msg.sender_name,
            sender_avatar: undefined,
            media_type: msg.message_type !== 'text' ? msg.message_type as any : undefined,
            media_url: msg.attachments?.[0]?.file_url || undefined,
            media_filename: msg.attachments?.[0]?.file_name || undefined,
            media_size: msg.attachments?.[0]?.file_size || undefined,
            media_duration: msg.attachments?.[0]?.duration || undefined,
            media_thumbnail: msg.attachments?.[0]?.thumbnail_url || undefined,
            evolution_status: msg.evolution_status,
            attachments: msg.attachments || []
          }
        });
      });

      // Add action notifications to timeline
      if (conversationDetail.actions && conversationDetail.actions.length > 0) {
        conversationDetail.actions.forEach(action => {
          timeline.push({
            id: action.id + 10000, // Offset to avoid ID conflicts
            type: 'action',
            timestamp: action.timestamp,
            data: action
          });
        });
      }
      
      // Sort timeline by timestamp
      timeline.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
      
      setTimelineItems(timeline);
    }
  }, [conversationDetail, selectedConversationId]);

  const handleConversationSelect = async (conversationId: number | string) => {
    // Prevent selecting the same conversation
    if (conversationId === selectedConversationId) {
      return;
    }
    
    // ETAPA 2: Leave previous conversation and join new one
    if (selectedConversationId && webSocket.connected) {
      webSocket.leaveConversation(selectedConversationId);
    }
    
    // ETAPA 2: Join new conversation for real-time updates
    if (webSocket.connected) {
      webSocket.joinConversation(conversationId);
    }
    
    // ETAPA 1: Clear state efficiently before transition
    setTimelineItems([]);
    setCurrentPatientInfo(undefined);
    setSelectedConversationId(conversationId);
    
    // ETAPA 2: Join new conversation for real-time updates
    if (webSocket.connected) {
      webSocket.joinConversation(conversationId);
    }
    
    // Create patient info from conversation data
    const conversation = conversationsData?.conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentPatientInfo({
        id: conversation.contact_id,
        name: conversation.contact_name || 'Contato sem nome',
        phone: conversation.contact_phone || '',
        email: conversation.contact_email || '',
        avatar: conversation.patient_avatar || undefined,
        last_appointment: undefined,
        recent_appointments: []
      });

      // Mark as read if has unread messages
      if (conversation.unread_count > 0) {
        try {
          await markAsRead.mutateAsync(conversationId);
        } catch (error) {
          console.error('Erro ao marcar como lida:', error);
        }
      }
    }
    
    // Close patient info panel on mobile when selecting conversation
    if (isMobile) {
      setShowPatientInfo(false);
    }
  };

  const handleSendMessage = async (messageContent: string, isNote = false) => {
    if (!selectedConversationId || !messageContent.trim()) return;

    const tempId = `temp-${Date.now()}`;

    // 1. Adicionar mensagem otimista imediatamente na UI
    const optimisticMessage: TimelineItem = {
      id: tempId,
      type: 'message',
      timestamp: new Date().toISOString(),
      data: {
        id: tempId,
        conversation_id: selectedConversationId,
        type: 'sent_user',
        content: messageContent,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        sender_name: 'Caio Rodrigo',
        sender_avatar: undefined,
        media_type: undefined,
        media_url: undefined,
        attachments: [],
        status: 'sending' // Status para indicar que está enviando
      }
    };

    setTimelineItems(prev => [...prev, optimisticMessage]);

    try {
      // 2. Enviar para backend (salva no banco + Evolution API)
      const result = await sendMessage.mutateAsync({
        conversationId: selectedConversationId,
        message: { content: messageContent }
      });

      // 3. Atualizar mensagem com dados reais do servidor
      setTimelineItems(prev => prev.map(item => 
        item.id === tempId ? {
          ...item,
          id: result.message.id,
          data: {
            ...item.data,
            id: result.message.id,
            status: result.sent_to_whatsapp ? 'sent' : 'sent_db_only'
          }
        } : item
      ));

    } catch (error) {
      console.error('❌ Full error details:', {
        error,
        message: error?.message,
        stack: error?.stack,
        cause: error?.cause
      });

      // 4. Em caso de erro, marcar mensagem com erro
      setTimelineItems(prev => prev.map(item => 
        item.id === tempId ? {
          ...item,
          data: {
            ...item.data,
            status: 'error'
          }
        } : item
      ));

      toast({
        title: "Erro",
        description: `Não foi possível enviar a mensagem: ${error?.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  };



  const conversations = convertToFrontendConversations();

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {!selectedConversationId ? (
          <ConversationsSidebar
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onConversationSelect={handleConversationSelect}
          />
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Mobile Header with Back Button */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConversationId(undefined)}
                className="text-blue-600"
              >
                ← Voltar
              </Button>
              
              {currentPatientInfo && (
                <h1 className="font-semibold text-gray-900 truncate">
                  {currentPatientInfo.name}
                </h1>
              )}
              
              <Sheet open={showPatientInfo} onOpenChange={setShowPatientInfo}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Info className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-96">
                  <PatientInfoPanel patientInfo={currentPatientInfo} />
                </SheetContent>
              </Sheet>
            </div>

            <MainConversationArea
              timelineItems={timelineItems}
              patientInfo={currentPatientInfo}
              onSendMessage={handleSendMessage}
              selectedConversationId={selectedConversationId}
            />
          </div>
        )}
      </div>
    );
  }

  // Tablet Layout
  if (isTablet) {
    return (
      <div className="h-full flex bg-gray-50">
        <div className="w-80 flex-shrink-0">
          <ConversationsSidebar
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onConversationSelect={handleConversationSelect}
          />
        </div>
        
        <div className="flex-1 flex">
          <MainConversationArea
            timelineItems={timelineItems}
            patientInfo={currentPatientInfo}
            onSendMessage={handleSendMessage}
            showInfoButton={true}
            onInfoClick={() => setShowPatientInfo(true)}
            selectedConversationId={selectedConversationId}
          />
          
          <Dialog open={showPatientInfo} onOpenChange={setShowPatientInfo}>
            <DialogContent className="max-w-md">
              <PatientInfoPanel patientInfo={currentPatientInfo} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Desktop Layout (3-column)
  return (
    <div className="h-full flex bg-gray-50">
      <div className="w-80 flex-shrink-0">
        <ConversationsSidebar
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onConversationSelect={handleConversationSelect}
        />
      </div>
      
      <div className="flex-1">
        <MainConversationArea
          timelineItems={timelineItems}
          patientInfo={currentPatientInfo}
          onSendMessage={handleSendMessage}
          selectedConversationId={selectedConversationId}
        />
      </div>
      
      <div className="w-80 flex-shrink-0 border-l border-gray-200">
        <PatientInfoPanel patientInfo={currentPatientInfo} />
      </div>
    </div>
  );
}