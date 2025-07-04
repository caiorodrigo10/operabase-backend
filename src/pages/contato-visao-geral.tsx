import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  MessageCircle,
  Edit,
  Info,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContactLayout } from "@/components/ContactLayout";
import EvolucaoEditor from "@/components/EvolucaoEditor";
import { AppointmentEditor } from "@/components/AppointmentEditor";

interface Contact {
  id: number;
  clinic_id: number;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  profession?: string;
  address?: string;
  birth_date?: string;
  medical_history?: string;
  allergies?: string;
  medications?: string;
  source?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  last_appointment?: string;
  appointment_count?: number;
}

interface Appointment {
  id: number;
  contact_id: number;
  clinic_id: number;
  user_id: number;
  doctor_name?: string;
  specialty?: string;
  appointment_type?: string;
  scheduled_date: string;
  duration_minutes: number;
  status: string;
  cancellation_reason?: string;
  session_notes?: string;
  next_appointment_suggested?: string;
  payment_status?: string;
  payment_amount?: number;
  google_calendar_event_id?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'agendada':
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Agendada</Badge>;
    case 'confirmada':
      return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Confirmada</Badge>;
    case 'realizada':
      return <Badge variant="default" className="bg-[#0f766e] text-white border-[#0f766e]">Realizada</Badge>;
    case 'cancelada':
      return <Badge variant="destructive">Cancelada</Badge>;
    case 'nao_compareceu':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Não compareceu</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function ContatoVisaoGeral() {
  const { id } = useParams<{ id: string }>();
  const contactId = parseInt(id || '0');
  const [showEvolucaoEditor, setShowEvolucaoEditor] = useState(false);
  const [showAppointmentEditor, setShowAppointmentEditor] = useState(false);

  // Fetch contact data
  const { data: contact } = useQuery<Contact>({
    queryKey: ['/api/contacts', contactId],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}?clinic_id=1`);
      if (!response.ok) throw new Error('Erro ao carregar contato');
      return response.json();
    },
    enabled: !!contactId
  });

  // Fetch appointments
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments', { contact_id: contactId }],
    queryFn: async () => {
      const params = new URLSearchParams({
        clinic_id: '1',
        contact_id: contactId.toString()
      });
      const response = await fetch(`/api/appointments?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar consultas');
      return response.json();
    },
    enabled: !!contactId
  });

  return (
    <ContactLayout currentTab="visao-geral">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Patient Information (narrower) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Patient Info Section */}
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Informações</h2>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-slate-700">Código do paciente</span>
                  <p className="text-slate-600">{contact?.id}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-slate-700">Preferência de lembretes</span>
                  <p className="text-slate-600">{contact?.source || 'WhatsApp'}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-slate-700">Celular</span>
                  <p className="text-slate-600">{contact?.phone || 'Não informado'}</p>
                </div>
                
                {contact?.gender && (
                  <div>
                    <span className="text-sm font-medium text-slate-700">Gênero</span>
                    <p className="text-slate-600">{contact.gender}</p>
                  </div>
                )}
                
                {contact?.profession && (
                  <div>
                    <span className="text-sm font-medium text-slate-700">Convênio</span>
                    <p className="text-slate-600">{contact.profession}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Health Information */}
          {(contact?.medical_history || contact?.allergies || contact?.medications) && (
            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="text-base font-medium">Informações de Saúde</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.medical_history && (
                  <div>
                    <span className="text-sm font-medium text-slate-700">Histórico Médico</span>
                    <p className="text-sm text-slate-600 mt-1">{contact.medical_history}</p>
                  </div>
                )}
                {contact.allergies && (
                  <div>
                    <span className="text-sm font-medium text-slate-700">Alergias</span>
                    <p className="text-sm text-slate-600 mt-1">{contact.allergies}</p>
                  </div>
                )}
                {contact.medications && (
                  <div>
                    <span className="text-sm font-medium text-slate-700">Medicações</span>
                    <p className="text-sm text-slate-600 mt-1">{contact.medications}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Services */}
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center justify-between">
                Consulta no Serasa
                <Button variant="outline" size="sm">
                  Consultar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-[#f0fdfa]">
                    <div className="text-[#0f766e] text-2xl font-bold">$</div>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">
                    Consulte o score e pendências que constam no CPF do seu paciente
                  </p>
                  <Button variant="link" className="text-[#0f766e] p-0 h-auto text-sm">
                    Comprar créditos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Satisfaction Survey */}
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center justify-between">
                Pesquisa de satisfação
                <Button variant="outline" size="sm">
                  Ativar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <div className="text-yellow-600 text-2xl">💡</div>
                  </div>
                  <p className="text-sm text-slate-500">
                    Configure a pesquisa de satisfação para este paciente
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Appointments and Messages (wider) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Latest Evolutions */}
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Últimas Evoluções</h2>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = `/contatos/${contactId}/evolucoes`}
                  >
                    Ver todas
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowEvolucaoEditor(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Evolução
                  </Button>
                </div>
              </div>
              
              {appointments?.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Edit className="w-8 h-8 text-[#0f766e]" />
                  </div>
                  <p className="text-slate-500 mb-2">
                    Nenhuma evolução registrada ainda
                  </p>
                  <p className="text-slate-400 text-sm mb-3">
                    Registre a primeira evolução deste paciente
                  </p>
                  <Button 
                    size="sm" 
                    className="bg-[#0f766e] hover:bg-teal-700 text-white"
                    onClick={() => setShowEvolucaoEditor(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeira evolução
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-[#0f766e] rounded-full"></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">
                                {appointment.scheduled_date && format(new Date(appointment.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                              <span className="text-xs text-slate-500">
                                {appointment.scheduled_date && format(new Date(appointment.scheduled_date), "HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            {appointment.doctor_name && (
                              <p className="text-xs text-slate-600 mt-1">{appointment.doctor_name}</p>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      {appointment.notes && (
                        <div className="mt-2 ml-5">
                          <p className="text-xs text-slate-600 line-clamp-2">
                            {appointment.notes.length > 80 ? 
                              appointment.notes.substring(0, 80) + '...' : 
                              appointment.notes
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  {appointments.length > 3 && (
                    <div className="text-center pt-2">
                      <Button 
                        variant="link" 
                        size="sm"
                        className="text-[#0f766e]"
                        onClick={() => window.location.href = `/contatos/${contactId}/evolucoes`}
                      >
                        Ver todas as {appointments.length} evoluções
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment History */}
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Histórico de consultas</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAppointmentEditor(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              
              <div className="space-y-3">
                {appointments
                  .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
                  .slice(0, 4)
                  .map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-900">
                        {appointment.scheduled_date && format(new Date(appointment.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="text-sm text-slate-500">
                        {appointment.scheduled_date && format(new Date(appointment.scheduled_date), "HH:mm", { locale: ptBR })}
                      </span>
                      <span className="text-sm text-slate-600">{appointment.doctor_name}</span>
                      {getStatusBadge(appointment.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Info className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {appointments.length > 4 && (
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.location.href = `/contatos/${contactId}/evolucoes`}
                    >
                      Ver mais ({appointments.length - 4} consultas)
                    </Button>
                  </div>
                )}
                
                {appointments.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-[#0f766e]" />
                    </div>
                    <p className="text-slate-500 mb-2">
                      Nenhuma consulta registrada ainda
                    </p>
                    <p className="text-slate-400 text-sm mb-4">
                      Agende a primeira consulta deste paciente
                    </p>
                    <Button 
                      size="sm" 
                      className="bg-[#0f766e] hover:bg-teal-700 text-white"
                      onClick={() => setShowAppointmentEditor(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agendar consulta
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messages Section */}
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Mensagens</h2>
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-[#f0fdfa]">
                  <MessageCircle className="w-8 h-8 text-[#0f766e]" />
                </div>
                <p className="text-slate-500 mb-2">
                  Nenhuma mensagem foi trocada com esse paciente ainda
                </p>
                <p className="text-slate-400 text-sm mb-4">
                  Só é possível enviar mensagens a pacientes que entraram em contato nas últimas 24 horas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showEvolucaoEditor && (
        <EvolucaoEditor
          contactId={contactId}
          onSuccess={() => setShowEvolucaoEditor(false)}
          onCancel={() => setShowEvolucaoEditor(false)}
        />
      )}

      {showAppointmentEditor && (
        <AppointmentEditor
          contactId={contactId}
          onSuccess={() => setShowAppointmentEditor(false)}
          onCancel={() => setShowAppointmentEditor(false)}
        />
      )}
    </ContactLayout>
  );
}