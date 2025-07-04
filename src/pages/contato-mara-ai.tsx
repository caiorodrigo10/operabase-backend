import { useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContactLayout } from "@/components/ContactLayout";

interface MaraMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ContatoMaraAI() {
  const { id } = useParams<{ id: string }>();
  const contactId = parseInt(id || '0');
  const [maraMessage, setMaraMessage] = useState('');
  const [isMaraLoading, setIsMaraLoading] = useState(false);
  const [maraConversation, setMaraConversation] = useState<MaraMessage[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou a Mara, sua assistente inteligente. Posso ajudar você com informações sobre este paciente, histórico médico, consultas anteriores e muito mais. Como posso ajudar?',
      timestamp: new Date()
    }
  ]);

  const sendMaraMessage = async () => {
    if (!maraMessage.trim() || isMaraLoading) return;

    const userMessage: MaraMessage = {
      role: 'user',
      content: maraMessage,
      timestamp: new Date()
    };

    setMaraConversation(prev => [...prev, userMessage]);
    setMaraMessage('');
    setIsMaraLoading(true);

    try {
      // Simulate AI response - replace with actual API call
      setTimeout(() => {
        const responses = [
          'Com base nas informações disponíveis sobre este paciente, posso verificar os seguintes dados...',
          'Analisando o histórico médico, observo que...',
          'De acordo com as consultas anteriores, o paciente apresenta...',
          'Baseado nos dados disponíveis, recomendo verificar...'
        ];
        
        const aiMessage: MaraMessage = {
          role: 'assistant',
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date()
        };

        setMaraConversation(prev => [...prev, aiMessage]);
        setIsMaraLoading(false);
      }, 2000);
    } catch (error) {
      setIsMaraLoading(false);
      console.error('Error sending message to Mara:', error);
    }
  };

  return (
    <ContactLayout currentTab="mara-ai">
      <div className="p-6">
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">M</span>
              </div>
              Mara AI - Assistente Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chat Container */}
            <div className="border rounded-lg bg-slate-50 h-96 flex flex-col">
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {maraConversation.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-[#0f766e] text-white'
                          : 'bg-white border border-slate-200 text-slate-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(message.timestamp, 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
                {isMaraLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 text-slate-900 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={maraMessage}
                    onChange={(e) => setMaraMessage(e.target.value)}
                    placeholder="Faça uma pergunta sobre este paciente..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMaraMessage()}
                    disabled={isMaraLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMaraMessage}
                    disabled={isMaraLoading || !maraMessage.trim()}
                    size="sm"
                  >
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Quick Suggestions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Sugestões de perguntas:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Qual o histórico médico deste paciente?",
                  "Há alguma alergia importante?",
                  "Quais foram as últimas consultas?",
                  "Resumo geral do paciente"
                ].map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMaraMessage(suggestion);
                      setTimeout(() => sendMaraMessage(), 100);
                    }}
                    disabled={isMaraLoading}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ContactLayout>
  );
}