import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar,
  Clock,
  User,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Activity,
  RefreshCw,
  Stethoscope,
  UserCheck,
  CalendarCheck
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContactPipelineHistoryItem {
  id: number;
  type: 'stage_change' | 'appointment_created' | 'appointment_completed' | 'medical_record_added' | 'contact_updated' | 'whatsapp_message' | 'call_completed';
  title: string;
  description: string;
  from_stage?: string;
  to_stage?: string;
  appointment_date?: string;
  created_at: string;
  created_by?: string;
  metadata?: any;
}

const activityIcons = {
  stage_change: Activity,
  appointment_created: Calendar,
  appointment_completed: CheckCircle,
  medical_record_added: Stethoscope,
  contact_updated: UserCheck,
  whatsapp_message: MessageSquare,
  call_completed: Phone,
};

const activityColors = {
  stage_change: "bg-blue-50 border-blue-200 text-blue-700",
  appointment_created: "bg-green-50 border-green-200 text-green-700",
  appointment_completed: "bg-emerald-50 border-emerald-200 text-emerald-700",
  medical_record_added: "bg-purple-50 border-purple-200 text-purple-700",
  contact_updated: "bg-orange-50 border-orange-200 text-orange-700",
  whatsapp_message: "bg-cyan-50 border-cyan-200 text-cyan-700",
  call_completed: "bg-indigo-50 border-indigo-200 text-indigo-700",
};

const stageLabels = {
  lead: "Lead",
  ativo: "Ativo",
  inativo: "Inativo",
  // Legacy status labels for backward compatibility
  novo: "Lead",
  em_conversa: "Ativo", 
  agendado: "Ativo",
  pos_atendimento: "Inativo",
  perdido: "Inativo"
};

interface ContactPipelineHistoryProps {
  contactId: number;
  contactName: string;
}

export function ContactPipelineHistory({ contactId, contactName }: ContactPipelineHistoryProps) {
  const [showAll, setShowAll] = useState(false);

  // Buscar histórico real do contato específico
  const { data: historyItems = [], isLoading } = useQuery({
    queryKey: ['/api/contacts', contactId, 'pipeline-history'],
    enabled: true
  });

  // Mock data específico para plataforma médica
  const generateMedicalHistory = (contactId: number, contactName: string): ContactPipelineHistoryItem[] => {
    return [
      {
        id: 1,
        type: 'appointment_completed',
        title: 'Consulta realizada',
        description: `Consulta de ${contactName} finalizada com sucesso - Cardiologia`,
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        created_by: 'Dr. Carlos Silva'
      },
      {
        id: 2,
        type: 'medical_record_added',
        title: 'Prontuário atualizado',
        description: 'Evolução médica registrada - Melhora dos sintomas cardíacos',
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        created_by: 'Dr. Carlos Silva'
      },
      {
        id: 3,
        type: 'stage_change',
        title: 'Movido para Pós-Atendimento',
        description: `${contactName} foi movido de "Consulta Agendada" para "Pós-Atendimento"`,
        from_stage: 'agendado',
        to_stage: 'pos_atendimento',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        created_by: 'Sistema'
      },
      {
        id: 4,
        type: 'whatsapp_message',
        title: 'Lembrete enviado',
        description: 'Mensagem de confirmação de consulta enviada via WhatsApp',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'Sistema Automático'
      },
      {
        id: 5,
        type: 'appointment_created',
        title: 'Consulta agendada',
        description: `Consulta de ${contactName} marcada para Cardiologia - Dr. Carlos Silva`,
        appointment_date: '2025-06-13T17:00:00',
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        created_by: 'Recepcionista Ana'
      },
      {
        id: 6,
        type: 'call_completed',
        title: 'Ligação realizada',
        description: 'Contato telefônico para agendamento - Paciente confirmou disponibilidade',
        created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        created_by: 'Recepcionista Ana'
      },
      {
        id: 7,
        type: 'stage_change',
        title: 'Qualificado como paciente',
        description: `${contactName} foi movido de "Novo Contato" para "Em Conversa"`,
        from_stage: 'novo',
        to_stage: 'em_conversa',
        created_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
        created_by: 'Recepcionista Maria'
      },
      {
        id: 8,
        type: 'contact_updated',
        title: 'Cadastro inicial',
        description: `${contactName} registrado no sistema - Dados básicos coletados`,
        created_at: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
        created_by: 'Sistema'
      }
    ];
  };

  const mockHistoryItems = generateMedicalHistory(contactId, contactName);
  const displayItems = showAll ? mockHistoryItems : mockHistoryItems.slice(0, 4);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Histórico do Funil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/30">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b border-blue-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            Histórico do Funil - {contactName}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-2">Acompanhe todas as interações e movimentações no funil de atendimento</p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {displayItems.map((item, index) => {
            const IconComponent = activityIcons[item.type];
            const isLast = index === displayItems.length - 1;
            
            return (
              <div key={item.id} className="relative animate-in slide-in-from-left-2 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                {/* Timeline Line */}
                {!isLast && (
                  <div className="absolute left-5.5 top-12 w-0.5 h-16 bg-gradient-to-b from-blue-300 via-gray-200 to-gray-100 rounded-full opacity-60" />
                )}
                
                {/* Activity Card */}
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center shadow-sm ${activityColors[item.type]}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/60 rounded-xl p-4 shadow-sm hover:shadow-lg hover:border-blue-200/60 transition-all duration-300 group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-blue-700 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        {(item.from_stage && item.to_stage) && (
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant="outline" className="text-xs bg-gray-50">
                              {stageLabels[item.from_stage as keyof typeof stageLabels]}
                            </Badge>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                              {stageLabels[item.to_stage as keyof typeof stageLabels]}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="font-medium">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                        {item.created_by && (
                          <div className="flex items-center gap-1 text-xs">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600 font-medium">{item.created_by}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Show More/Less Button */}
        {mockHistoryItems.length > 4 && (
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setShowAll(!showAll)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showAll ? 'Mostrar menos' : `Mostrar mais (${mockHistoryItems.length - 4} itens)`}
            </Button>
          </div>
        )}
        
        {displayItems.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Histórico do Funil Vazio</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">
              Quando você começar a movimentar este contato no funil, todas as atividades aparecerão aqui
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Mudanças de estágio</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Consultas criadas</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>Registros médicos</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}