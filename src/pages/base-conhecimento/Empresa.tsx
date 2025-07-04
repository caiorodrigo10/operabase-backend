import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Empresa() {
  const { toast } = useToast();
  const [companyInfo, setCompanyInfo] = useState(`Clínica Médica Exemplo

📍 Endereço: Rua das Flores, 123 - Centro - São Paulo/SP
📞 Telefone: (11) 3333-4444
📱 WhatsApp: (11) 99999-8888

🕒 Horários de Funcionamento:
Segunda a Sexta: 07h às 19h
Sábado: 08h às 16h
Domingo: Emergências apenas

🏥 Especialidades:
• Cardiologia
• Clínico Geral  
• Pediatria
• Ginecologia

💳 Convênios Aceitos:
• Unimed
• Bradesco Saúde
• SulAmérica
• Particular

🚗 Estacionamento gratuito disponível
🌟 Atendimento humanizado há mais de 20 anos`);

  const handleSaveCompanyInfo = () => {
    toast({
      title: "Informações da empresa salvas",
      description: "As informações da empresa foram atualizadas automaticamente.",
      variant: "default",
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Informações da Empresa</h1>
        <p className="text-gray-600">
          Adicione todas as informações relevantes sobre sua clínica para que a IA 
          possa fornecer respostas precisas e personalizadas aos pacientes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Textarea
            value={companyInfo}
            onChange={(e) => setCompanyInfo(e.target.value)}
            placeholder="Digite ou cole as informações da sua clínica aqui..."
            className="min-h-[400px] resize-none"
          />
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {companyInfo.length} caracteres
            </p>
            <div className="flex items-center gap-4">
              <p className="text-sm text-green-600">
                Salvo automaticamente
              </p>
              <Button size="sm" onClick={handleSaveCompanyInfo}>
                Salvar Agora
              </Button>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Sugestões do que incluir:</h4>
          <div className="space-y-3">
            {[
              { icon: "📍", text: "Endereço completo e como chegar" },
              { icon: "📞", text: "Telefones de contato e WhatsApp" },
              { icon: "🕒", text: "Horários de funcionamento" },
              { icon: "💳", text: "Convênios e formas de pagamento aceitas" },
              { icon: "📋", text: "Especialidades e serviços oferecidos" },
              { icon: "🚗", text: "Informações sobre estacionamento" },
              { icon: "📱", text: "Redes sociais e site" },
              { icon: "⭐", text: "Diferenciais e valores da clínica" }
            ].map((suggestion, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">{suggestion.icon}</span>
                <span className="text-sm text-gray-700">{suggestion.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}