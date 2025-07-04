import React, { useState, useRef, useEffect } from 'react';
import { Send, Phone, Video, MoreVertical, Smile } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'success' | 'error' | 'info';
  isTyping?: boolean;
}

export default function ChatDeTeste() {
  const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Oi! 😊 Aqui é a Marina da clínica! Seja bem-vindo(a)! Como posso te ajudar hoje? Posso marcar consultas, tirar dúvidas ou qualquer coisa que precisar!',
      isUser: false,
      timestamp: new Date(),
      type: 'info'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputText;
    setInputText('');
    setIsLoading(true);
    setError(null);

    // Adiciona indicador de digitação da Marina
    const typingMessage: Message = {
      id: 'typing',
      text: 'Marina está digitando...',
      isUser: false,
      timestamp: new Date(),
      isTyping: true
    };
    
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await fetch('/api/mcp/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          sessionId: sessionId
        }),
      });

      const data = await response.json();
      
      // Remove indicador de digitação
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.success ? (data.data?.response || 'Oi! Aqui é a Marina da clínica. Como posso ajudar você hoje?') : 'Ops, não consegui entender direito. Pode repetir de outra forma? 😊',
        isUser: false,
        timestamp: new Date(),
        type: data.success ? 'success' : 'info'
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      // Remove indicador de digitação
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpa, tive um probleminha aqui. Pode tentar novamente? 🙏',
        isUser: false,
        timestamp: new Date(),
        type: 'info'
      };

      setMessages(prev => [...prev, errorMessage]);
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageBgColor = (isUser: boolean, type?: string, isTyping?: boolean) => {
    if (isTyping) {
      return 'bg-gray-100 text-gray-600 italic';
    }
    
    if (isUser) {
      return 'bg-teal-500 text-white';
    }
    
    return 'bg-white text-gray-800 border border-gray-200';
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header WhatsApp-style */}
      <div className="bg-teal-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-teal-600 font-bold text-lg">M</span>
          </div>
          <div>
            <h1 className="font-semibold">Marina</h1>
            <p className="text-sm text-teal-100">Assistente da Clínica • Online</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full hover:bg-teal-700">
            <Phone className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-teal-700">
            <Video className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-teal-700">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23e5e7eb" fill-opacity="0.1"%3E%3Cpath d="m20 20 20 20-20-20z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${getMessageBgColor(message.isUser, message.type, message.isTyping)}`}>
                {message.isTyping ? (
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="ml-2">{message.text}</span>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <p className={`text-xs mt-1 ${message.isUser ? 'text-teal-100' : 'text-gray-500'}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input de mensagem */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center space-x-3">
          <button className="p-2 text-gray-500 hover:text-gray-700">
            <Smile className="h-6 w-6" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite uma mensagem..."
              className="w-full p-3 border rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              rows={1}
              disabled={isLoading}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}