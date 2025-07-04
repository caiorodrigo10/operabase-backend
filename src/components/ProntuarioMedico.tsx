import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import ProntuarioEditor from "./EvolucaoEditor";
import ExpandableNote from "./ExpandableNote";
import { 
  FileText, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  History,
  Edit,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MedicalRecord {
  id: number;
  appointment_id?: number;
  contact_id: number;
  clinic_id: number;
  record_type: string;
  content?: string;
  chief_complaint?: string;
  history_present_illness?: string;
  physical_examination?: string;
  diagnosis?: string;
  treatment_plan?: string;
  prescriptions?: any;
  exam_requests?: any;
  follow_up_instructions?: string;
  observations?: string;
  vital_signs?: any;
  attachments?: string[];
  voice_transcription?: string;
  ai_summary?: string;
  templates_used?: string[];
  version: number;
  is_active: boolean;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

interface Appointment {
  id: number;
  contact_id: number;
  clinic_id: number;
  scheduled_date: string;
  appointment_type: string;
  doctor_name: string;
  specialty: string;
  status: string;
  duration_minutes: number;
  session_notes?: string;
}

interface ProntuarioMedicoProps {
  contactId: number;
  appointments: Appointment[];
}

export default function ProntuarioMedico({ contactId, appointments }: ProntuarioMedicoProps) {
  const [showEditor, setShowEditor] = useState(false);

  // Buscar prontuários do contato
  const { data: medicalRecords = [], isLoading, refetch } = useQuery<MedicalRecord[]>({
    queryKey: [`/api/contacts/${contactId}/medical-records`],
    enabled: !!contactId,
  });

  console.log('🔍 ProntuarioMedico render:', {
    contactId,
    recordsCount: medicalRecords.length,
    isLoading,
    records: medicalRecords
  });

  // Obter nome do contato para o editor - buscar em appointments ou usar padrão
  const contactName = appointments.length > 0 ? 
    `Paciente` : "Paciente";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando prontuários...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de criar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Evoluções do Paciente</h2>
          <p className="text-sm text-gray-600">Histórico de evoluções médicas do paciente</p>
        </div>
        <Button onClick={() => setShowEditor(true)} className="flex items-center gap-2 bg-[#0f766e] hover:bg-teal-700 text-white">
          <Plus className="w-4 h-4" />
          Nova Evolução
        </Button>
      </div>

      {/* Timeline de Evoluções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Timeline de Evoluções
          </CardTitle>
          <CardDescription>
            Histórico completo das evoluções médicas do paciente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {medicalRecords.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Nenhuma evolução registrada ainda</p>
              <p className="text-sm text-gray-400">Clique em "Nova Evolução" para criar o primeiro registro</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(medicalRecords as MedicalRecord[]).map((record, index) => {
                const appointment = appointments.find(apt => apt.id === record.appointment_id);
                const isFirst = index === 0;
                const isLast = index === medicalRecords.length - 1;
                
                return (
                  <div key={record.id} className="relative">
                    {/* Timeline Line */}
                    {!isLast && (
                      <div className="absolute left-6 top-12 w-px h-full bg-gray-200 -z-10"></div>
                    )}
                    
                    {/* Timeline Dot */}
                    <div className="absolute left-4 top-4 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>
                    
                    {/* Content */}
                    <div className="ml-12 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {format(new Date(record.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(record.created_at), "HH:mm", { locale: ptBR })}
                                {appointment && (
                                  <>
                                    <span>•</span>
                                    <User className="w-3 h-3" />
                                    {appointment.doctor_name}
                                    <span>•</span>
                                    <span>{appointment.specialty}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge variant={isFirst ? "default" : "secondary"} className="text-xs">
                            {isFirst ? "Mais Recente" : `Versão ${record.version}`}
                          </Badge>
                        </div>

                        {/* Conteúdo da Nota */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          {record.content || record.observations || record.chief_complaint ? (
                            <ExpandableNote 
                              content={record.content || record.observations || record.chief_complaint || ""} 
                              maxHeight={150}
                              className="text-sm text-gray-700"
                            />
                          ) : (
                            <div className="text-sm text-gray-500 italic">Nota vazia</div>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex gap-2 mt-4 pt-3 border-t">
                          <Button variant="outline" size="sm">
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-3 h-3 mr-1" />
                            Excluir
                          </Button>
                          {appointment && (
                            <Button variant="outline" size="sm">
                              <Calendar className="w-3 h-3 mr-1" />
                              Ver Consulta
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor Modal */}
      {showEditor && (
        <ProntuarioEditor
          contactId={contactId.toString()}
          contactName={contactName}
          appointments={appointments}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}