import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface AICodeChatProps {
  onMinimizedChange?: (isMinimized: boolean) => void;
}

const mockMessages: Message[] = [
  {
    id: '1',
    type: 'ai',
    content: '👋 Olá! Sou seu assistente de código. Posso ajudar você a criar e editar elementos na página. Digite um comando!',
    timestamp: '14:30'
  },
  {
    id: '2',
    type: 'user',
    content: 'Adicione um botão azul',
    timestamp: '14:31'
  },
  {
    id: '3',
    type: 'ai',
    content: '✅ Botão azul adicionado com sucesso! Posso ajudar com mais alguma coisa?',
    timestamp: '14:31'
  },
  {
    id: '4',
    type: 'user',
    content: 'Mude o título para vermelho',
    timestamp: '14:32'
  },
  {
    id: '5',
    type: 'ai',
    content: '🎨 Cor do título alterada para vermelho. Quer ajustar mais algum elemento?',
    timestamp: '14:32'
  }
];

export const AICodeChat: React.FC<AICodeChatProps> = ({ onMinimizedChange }) => {
  const [isMinimized, setIsMinimized] = useState(true);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '🤔 Entendi! Estou processando seu comando...',
        timestamp: new Date().toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    onMinimizedChange?.(true);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
    onMinimizedChange?.(false);
  };

  if (isMinimized) {
    return (
      <div className="ai-chat-minimized" onClick={handleMaximize}>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="ai-chat-container">
      {/* Header */}
      <div className="ai-chat-header">
        <h3 className="ai-chat-title">AI Code Assistant</h3>
        <button 
          className="ai-chat-minimize-btn"
          onClick={handleMinimize}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="ai-chat-messages">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`ai-chat-message ${message.type === 'user' ? 'user' : 'ai'}`}
          >
            <div className="ai-chat-message-content">
              {message.content}
            </div>
            <div className="ai-chat-message-time">
              {message.timestamp}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="ai-chat-input-container">
        <div className="ai-chat-input-wrapper">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite um comando..."
            className="ai-chat-input"
          />
          <button 
            onClick={handleSendMessage}
            className="ai-chat-send-btn"
            disabled={!inputValue.trim()}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};