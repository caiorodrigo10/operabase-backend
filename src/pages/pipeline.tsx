import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockPipelineData } from "@/lib/mock-data";
import { Bot } from "lucide-react";


const stageLabels = {
  novo_contato: { title: "Novo Contato", color: "bg-slate-50" },
  em_conversa: { title: "Em Conversa", color: "bg-blue-50" },
  consulta_marcada: { title: "Consulta Marcada", color: "bg-green-50" },
  consulta_realizada: { title: "Consulta Realizada", color: "bg-purple-50" },
  pos_atendimento: { title: "Pós-atendimento", color: "bg-emerald-50" },
};

const stageColors = {
  novo_contato: "text-blue-600",
  em_conversa: "text-blue-600",
  consulta_marcada: "text-green-600",
  consulta_realizada: "text-purple-600",
  pos_atendimento: "text-emerald-600",
};

export function Pipeline() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="mb-6 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-40 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Pipeline de Atendimento</h2>
        <p className="text-slate-600">Acompanhe o fluxo dos pacientes em tempo real</p>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-6 min-w-max pb-4">
          {Object.entries(mockPipelineData).map(([stageKey, contacts]) => {
            const stage = stageLabels[stageKey as keyof typeof stageLabels];
            const colorClass = stageColors[stageKey as keyof typeof stageColors];
            
            return (
              <Card key={stageKey} className="w-72 flex-shrink-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">{stage.title}</CardTitle>
                  <span className="text-sm text-slate-500">{contacts.length} pacientes</span>
                </CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {contacts.map((contact) => (
                    <div key={contact.id} className={`${stage.color} rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer`}>
                      <h4 className="font-medium text-slate-800 text-sm mb-1">{contact.name}</h4>
                      <p className="text-xs text-slate-600 mb-2">{contact.phone}</p>
                      <p className="text-xs text-slate-500 mb-3">{contact.timeInStage}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${colorClass}`}>{contact.lastAction}</span>
                        {contact.isAiAction && (
                          <div className="flex items-center space-x-1">
                            <Bot className="w-3 h-3 text-medical-blue" />
                            <span className="text-xs text-medical-blue font-medium">IA</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>


    </div>
  );
}
