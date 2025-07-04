import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Send, Paperclip, Mic, MessageCircle, FileText, Info, Bot } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { EventMarker } from "./EventMarker";
import { ActionNotification } from "./ActionNotification";
import { FileUploadModal } from "./FileUploadModal";
import { AudioRecordingModal } from "./AudioRecordingModal";
import { LoadMoreButton } from "./LoadMoreButton";
import { useConversationDetail, useInfiniteConversationDetail } from "@/hooks/useConversations";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Simple date formatting function
const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Hoje';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ontem';
  } else {
    return date.toLocaleDateString('pt-BR', { 
      day: 'numeric', 
      month: 'short' 
    });
  }
};

interface TimelineItem {
  id: string | number;
  type: 'message' | 'event' | 'action';
  timestamp: string;
  data: any;
}

interface PatientInfo {
  id: string | number;
  name: string;
  phone?: string;
  lastMessage?: string;
  unreadCount?: number;
  avatar?: string;
}

const shouldShowDateHeader = (currentItem: TimelineItem, previousItem?: TimelineItem): boolean => {
  if (!previousItem) return true;
  
  const currentDate = currentItem.data?.timestamp || currentItem.data?.created_at;
  const previousDate = previousItem.data?.timestamp || previousItem.data?.created_at;
  
  if (!currentDate || !previousDate) return false;
  
  const current = new Date(currentDate).toDateString();
  const previous = new Date(previousDate).toDateString();
  
  return current !== previous;
};

interface MainConversationAreaProps {
  timelineItems: TimelineItem[];
  patientInfo?: PatientInfo;
  onSendMessage?: (message: string, isNote?: boolean) => void;
  showInfoButton?: boolean;
  onInfoClick?: () => void;
  selectedConversationId?: string | number;
}

export function MainConversationArea({
  timelineItems: externalTimelineItems,
  patientInfo,
  onSendMessage,
  showInfoButton = false,
  onInfoClick,
  selectedConversationId
}: MainConversationAreaProps) {
  const [message, setMessage] = useState("");
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [isAIActive, setIsAIActive] = useState(false);
  
  // 🎯 ESTADO OPTIMISTIC: Para mostrar áudios imediatamente
  const [optimisticAudios, setOptimisticAudios] = useState<Array<{
    id: string;
    audioFile: File;
    localUrl: string;
    timestamp: string;
    status: 'uploading' | 'sent' | 'failed';
  }>>([]);
  
  // 🎯 CONTROLE DE POLLING: Pausar durante uploads para evitar race conditions
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // ETAPA 3: Flag para usar paginação progressiva (pode ser alterada dinamicamente)
  const [useProgressivePagination, setUseProgressivePagination] = useState(false);
  
  // Hook tradicional para compatibilidade - pausar durante upload de áudio
  const { data: conversationData, isLoading: isLoadingTraditional } = useConversationDetail(
    !useProgressivePagination && !isUploadingAudio ? selectedConversationId?.toString() || '' : null
  );
  
  // Hook ETAPA 3: Paginação Progressiva com Infinite Query - pausar durante upload de áudio
  const {
    data: infiniteData,
    isLoading: isLoadingInfinite,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteConversationDetail(
    useProgressivePagination && !isUploadingAudio ? selectedConversationId?.toString() || '' : null,
    25 // 25 mensagens por página
  );

  // Processar dados baseado no modo ativo
  const activeConversationData = useProgressivePagination 
    ? (infiniteData?.pages?.[0] || null)
    : conversationData;
    
  const allMessages = useProgressivePagination && infiniteData?.pages
    ? infiniteData.pages.flatMap(page => page.messages || [])
    : (conversationData?.messages || []);
    
  const totalMessages = useProgressivePagination && infiniteData?.pages?.[0]?.pagination
    ? infiniteData.pages[0].pagination.totalMessages
    : (conversationData?.messages?.length || 0);
    
  const isLoading = useProgressivePagination ? isLoadingInfinite : isLoadingTraditional;

  // Criar timeline inteligente: usa dados internos ou externos + áudios optimistic
  const timelineItems = useMemo(() => {
    let items: TimelineItem[] = [];
    
    // Se temos dados internos (hooks), use-os; senão use dados externos
    if (allMessages.length > 0) {
      items = allMessages.map(message => ({
        id: message.id,
        type: 'message' as const,
        timestamp: (message as any).timestamp || message.created_at?.toString() || new Date().toISOString(),
        data: message
      }));
    } else {
      // Fallback para dados externos (para compatibilidade)
      items = externalTimelineItems || [];
    }
    
    // 🎯 ADICIONAR ÁUDIOS OPTIMISTIC: Incluir áudios que estão sendo enviados
    const optimisticItems: TimelineItem[] = optimisticAudios.map(audio => ({
      id: audio.id,
      type: 'message' as const,
      timestamp: audio.timestamp,
      data: {
        id: audio.id,
        conversation_id: selectedConversationId,
        content: 'Mensagem de voz',
        sender_type: 'professional',
        sender_name: 'Você',
        message_type: 'audio',
        timestamp: audio.timestamp,
        created_at: audio.timestamp,
        attachments: [{
          id: `${audio.id}_attachment`,
          file_name: audio.audioFile.name,
          file_type: audio.audioFile.type,
          file_size: audio.audioFile.size,
          file_url: audio.localUrl,
          media_type: 'audio'
        }],
        isOptimistic: true,
        optimisticStatus: audio.status
      }
    }));
    
    // Combinar mensagens reais com optimistic e ordenar por timestamp
    const combined = [...items, ...optimisticItems];
    return combined.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [allMessages, externalTimelineItems, optimisticAudios, selectedConversationId]);

  // Sincronizar estado da IA com os dados do banco
  useEffect(() => {
    const aiActive = activeConversationData?.conversation?.ai_active;
    if (aiActive !== undefined && aiActive !== null) {
      setIsAIActive(Boolean(aiActive));
    }
  }, [activeConversationData?.conversation?.ai_active]);

  // Mutation para alternar estado da IA
  const toggleAIMutation = useMutation({
    mutationFn: async (newAIState: boolean) => {
      return apiRequest(
        `/api/conversations/${selectedConversationId}/ai-toggle`, 
        'PATCH', 
        { ai_active: newAIState }
      );
    },
    onSuccess: () => {
      // Invalidar cache para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['/api/conversations-simple'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations-simple', selectedConversationId?.toString()] });
    },
    onError: (error) => {
      console.error('Erro ao alternar IA:', error);
      // Reverter estado local em caso de erro
      setIsAIActive(!isAIActive);
    }
  });

  // Função para alternar IA
  const handleToggleAI = () => {
    const newState = !isAIActive;
    setIsAIActive(newState); // Atualização otimista
    toggleAIMutation.mutate(newState);
  };

  // Posiciona instantaneamente nas mensagens mais recentes
  useEffect(() => {
    if (messagesEndRef.current && timelineItems.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, [timelineItems]);

  const handleSendMessage = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim(), isNoteMode);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };



  const handleFileUpload = async (files: File[], caption?: string) => {
    if (!selectedConversationId) {
      console.error('❌ No selectedConversationId for file upload');
      return;
    }

    console.log('📤 Starting file upload:', {
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type })),
      caption,
      conversationId: selectedConversationId
    });

    try {
      const formData = new FormData();
      files.forEach(file => {
        console.log('📎 Adding file to FormData:', file.name, file.type, file.size);
        formData.append('file', file);
      });
      if (caption) formData.append('caption', caption);
      formData.append('sendToWhatsApp', 'true');
      
      // Para áudio gravado, adicionar messageType específico
      if (files[0] && (files[0].name.includes('gravacao_') || files[0].type.includes('audio/webm'))) {
        formData.append('messageType', 'audio_voice');
        console.log('🎤 Marked as audio_voice for Evolution API routing');
      }

      const uploadUrl = `/api/conversations/${selectedConversationId}/upload`;
      console.log('📡 Making request to:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      console.log('📡 Upload response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload response error:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);
    } catch (error) {
      console.error('❌ Upload error details:', error);
    }
    
    setShowUploadModal(false);
  };

  const handleAudioReady = async (audioFile: File) => {
    console.log('🎤 Audio ready for upload:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      selectedConversationId
    });
    
    if (!selectedConversationId) {
      console.error('❌ No conversation selected for audio upload');
      return;
    }
    
    // 🎯 ESTRATÉGIA 3: Criar áudio optimistic IMEDIATAMENTE
    const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const localUrl = URL.createObjectURL(audioFile);
    const timestamp = new Date().toISOString();
    
    const optimisticAudio = {
      id: optimisticId,
      audioFile,
      localUrl,
      timestamp,
      status: 'uploading' as const
    };
    
    // 🎯 ESTRATÉGIA 4: Adicionar áudio optimistic à lista ANTES do upload
    setOptimisticAudios(prev => [...prev, optimisticAudio]);
    
    // 🎯 ESTRATÉGIA 5: Pausar polling para evitar race conditions
    setIsUploadingAudio(true);
    
    // 🎯 ESTRATÉGIA 6: Invalidar cache ANTES do upload para evitar sobrescrita
    queryClient.setQueryData(['/api/conversations-simple', selectedConversationId?.toString()], (old: any) => {
      // Marcar que temos updates optimistic
      return old ? { ...old, hasOptimisticUpdates: true } : old;
    });
    
    try {
      console.log('📤 Starting audio upload via isolated route...');
      
      const formData = new FormData();
      formData.append('file', audioFile);
      
      const response = await fetch(`/api/audio/voice-message/${selectedConversationId}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload response error:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Audio upload via isolated route successful:', result);
      
      // 🎯 ESTRATÉGIA 7: Marcar como enviado com sucesso
      setOptimisticAudios(prev => 
        prev.map(audio => 
          audio.id === optimisticId 
            ? { ...audio, status: 'sent' as const }
            : audio
        )
      );
      
      // 🎯 ESTRATÉGIA 8: Aguardar um pouco e depois remover optimistic + invalidar cache
      setTimeout(() => {
        setOptimisticAudios(prev => prev.filter(audio => audio.id !== optimisticId));
        URL.revokeObjectURL(localUrl); // Cleanup memory
        
        // Invalidar cache para buscar dados reais do servidor
        queryClient.invalidateQueries({ queryKey: ['/api/conversations-simple'] });
        queryClient.invalidateQueries({ queryKey: ['/api/conversations-simple', selectedConversationId?.toString()] });
      }, 1000); // 1 segundo para transição suave
      
    } catch (error) {
      console.error('❌ Audio upload failed:', error);
      
      // 🎯 ESTRATÉGIA 9: Marcar como falha em caso de erro
      setOptimisticAudios(prev => 
        prev.map(audio => 
          audio.id === optimisticId 
            ? { ...audio, status: 'failed' as const }
            : audio
        )
      );
      
      // Remover após 3 segundos em caso de falha
      setTimeout(() => {
        setOptimisticAudios(prev => prev.filter(audio => audio.id !== optimisticId));
        URL.revokeObjectURL(localUrl);
      }, 3000);
      
    } finally {
      // 🎯 ESTRATÉGIA 10: Reativar polling após upload
      setIsUploadingAudio(false);
    }
  };

  if (!patientInfo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <Info className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium">Selecione uma conversa para começar</p>
          <p className="text-sm">Escolha uma conversa da lista ao lado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Messages Timeline - Scrollable */}
      <div 
        ref={timelineRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-5"
      >
        {timelineItems.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <>
            {/* ETAPA 3: LoadMoreButton - Aparece apenas no modo paginação progressiva */}
            {useProgressivePagination && hasNextPage && (
              <LoadMoreButton
                onLoadMore={() => fetchNextPage()}
                isLoading={isFetchingNextPage}
                hasMore={hasNextPage}
                totalMessages={totalMessages}
                loadedMessages={allMessages.length}
              />
            )}
            
            {timelineItems.map((item: any, index: number) => {
              const previousItem = index > 0 ? timelineItems[index - 1] : undefined;
              const showDateHeader = shouldShowDateHeader(item, previousItem);
              const dateToShow = item.data?.timestamp || item.data?.created_at;

              return (
                <div key={item.id}>
                  {showDateHeader && dateToShow && (
                    <div className="flex justify-center my-4">
                      <div className="text-white text-sm font-medium px-3 py-1 rounded-full bg-[#666666]">
                        {formatDateLabel(dateToShow)}
                      </div>
                    </div>
                  )}
                  {item.type === 'message' ? (
                    <MessageBubble 
                  message={item.data as any} 
                  isOptimistic={item.data.isOptimistic}
                  optimisticStatus={item.data.optimisticStatus}
                />
                  ) : item.type === 'action' ? (
                    <ActionNotification action={item.data as any} />
                  ) : (
                    <EventMarker event={item.data as any} />
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      {/* Input Area - Fixed at Bottom */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="flex mb-3 justify-between items-center">
          <div className="flex space-x-2">
            <Button
              variant={!isNoteMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsNoteMode(false)}
              className="justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 h-9 rounded-md px-3 flex items-center space-x-2 transition-all text-white hover:bg-blue-600 bg-[#0f766e]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Mensagem</span>
            </Button>
            
            <Button
              variant={isNoteMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsNoteMode(true)}
              className={cn(
                "flex items-center space-x-2 transition-all",
                isNoteMode 
                  ? "bg-amber-500 text-white hover:bg-amber-600" 
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              )}
            >
              <FileText className="w-4 h-4" />
              <span>Nota Interna</span>
            </Button>

            {showInfoButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={onInfoClick}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              >
                <Info className="w-4 h-4" />
                <span>Informações do Paciente</span>
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleAI}
            disabled={toggleAIMutation.isPending}
            className={cn(
              "justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border h-9 rounded-md px-3 flex items-center space-x-2 transition-all",
              isAIActive 
                ? "text-white hover:bg-blue-600 border-blue-500 bg-[#0f766e]" 
                : "text-gray-500 hover:text-gray-700 border-gray-300 bg-gray-100 hover:bg-gray-200"
            )}
            title={isAIActive ? "IA ativada - clique para desativar" : "IA desativada - clique para ativar"}
          >
            <Bot className="w-4 h-4" />
            <span>IA</span>
          </Button>
        </div>

        <div className="flex space-x-2 items-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 flex-shrink-0 w-10 h-10"
            title="Anexar arquivo"
            onClick={() => setShowUploadModal(true)}
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isNoteMode ? "Digite sua nota interna..." : "Digite sua mensagem..."}
              className={cn(
                "resize-none pr-4 transition-all duration-200",
                isNoteMode 
                  ? "border-amber-300 focus:border-amber-500 focus:ring-amber-200" 
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
              )}
              rows={1}
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 flex-shrink-0 w-10 h-10"
            title="Gravar áudio"
            onClick={() => setShowAudioRecorder(true)}
          >
            <Mic className="w-4 h-4" />
          </Button>

          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size="sm"
            className={cn(
              "flex-shrink-0 w-10 h-10 disabled:bg-gray-300",
              isNoteMode 
                ? "bg-amber-500 hover:bg-amber-600" 
                : "bg-emerald-500 hover:bg-emerald-600"
            )}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {/* Upload Modal */}
      {showUploadModal && selectedConversationId && (
        <FileUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          conversationId={selectedConversationId.toString()}
          onUploadSuccess={() => {
            console.log('✅ Upload completed successfully');
            setShowUploadModal(false);
          }}
        />
      )}
      {/* Audio Recording Modal */}
      {showAudioRecorder && (
        <AudioRecordingModal
          isOpen={showAudioRecorder}
          onClose={() => setShowAudioRecorder(false)}
          onSend={handleAudioReady}
        />
      )}
    </div>
  );
}