import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Conversation, ConversationFilter } from "@/types/conversations";
import { cn } from "@/lib/utils";
import { Search, Bot, Calendar } from "lucide-react";

// Função helper para formatação inteligente de timestamp
const formatMessageTimestamp = (timestamp: string | null | undefined): string => {
  if (!timestamp) {
    return '';
  }
  
  try {
    const messageDate = new Date(timestamp);
    if (isNaN(messageDate.getTime())) {
      return '';
    }
    
    const today = new Date();
    
    // Normalizar datas para comparação (remover hora)
    const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const isToday = messageDateOnly.getTime() === todayOnly.getTime();
    
    // Mesmo dia: mostrar apenas hora (ex: "14:30")
    if (isToday) {
      return messageDate.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    }
    
    // Dia diferente: mostrar dia e mês (ex: "25 jun", "2 jan")
    return messageDate.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short'
    }).replace('.', ''); // Remove o ponto do mês abreviado
  } catch (error) {
    return '';
  }
};

interface ConversationsSidebarProps {
  conversations: Conversation[];
  selectedConversationId?: number;
  onConversationSelect: (conversationId: number) => void;
}

export function ConversationsSidebar({
  conversations,
  selectedConversationId,
  onConversationSelect
}: ConversationsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  


  // Reordenação dinâmica baseada em last_message_at
  const sortedAndFilteredConversations = useMemo(() => {
    const filtered = conversations.filter(conversation => {
      // Apply search only
      if (searchQuery && !conversation.patient_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });

    // Ordenar por timestamp da última mensagem (mais recente primeiro)
    return filtered.sort((a, b) => {
      const timeA = new Date(a.last_message_at || a.timestamp).getTime();
      const timeB = new Date(b.last_message_at || b.timestamp).getTime();
      return timeB - timeA; // Ordem decrescente (mais recente primeiro)
    });
  }, [conversations, searchQuery]);

  return (
    <div className="w-full h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Conversas</h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar paciente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>


      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {sortedAndFilteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          sortedAndFilteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={selectedConversationId === conversation.id}
              onClick={() => onConversationSelect(conversation.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer transition-colors hover:bg-gray-50",
        isActive && "bg-blue-50 border-r-2 border-r-blue-500"
      )}
    >
      <div className="flex items-start space-x-3">
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarImage src={conversation.patient_avatar} />
          <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
            {conversation.patient_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={cn(
              "font-medium text-gray-900 truncate text-sm",
              conversation.unread_count > 0 && "font-semibold"
            )}>
              {conversation.patient_name}
            </h3>
            <span className="text-xs text-gray-400 flex-shrink-0 min-w-[50px]">
              {conversation.last_message_at ? formatMessageTimestamp(conversation.last_message_at) : formatMessageTimestamp(conversation.timestamp)}
            </span>
          </div>

          <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">
            {conversation.last_message}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {conversation.ai_active && (
                <div className="w-2 h-2 rounded-full bg-[#0f766e]"></div>
              )}
              {conversation.has_pending_appointment && (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </div>

            {conversation.unread_count > 0 && (
              <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                {conversation.unread_count}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}