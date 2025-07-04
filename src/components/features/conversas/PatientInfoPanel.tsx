import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PatientInfo } from "@/types/conversations";
import { Phone, Mail, Calendar } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

interface PatientInfoPanelProps {
  patientInfo?: PatientInfo;
}

function RecentAppointmentsList({ contactId }: { contactId: number }) {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments', contactId],
    queryFn: async () => {
      const response = await fetch(`/api/appointments?clinic_id=1&contact_id=${contactId}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar consultas');
      }
      return response.json();
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-1">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        Nenhuma consulta encontrada
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div className="space-y-1">
      {appointments.slice(0, 3).map((appointment: any) => (
        <div key={appointment.id} className="text-sm text-gray-600 leading-relaxed">
          {formatDate(appointment.scheduled_date)} - {appointment.specialty || 'Consulta'}
        </div>
      ))}
    </div>
  );
}

export function PatientInfoPanel({ patientInfo }: PatientInfoPanelProps) {
  const [, setLocation] = useLocation();
  if (!patientInfo) {
    return (
      <div className="w-full h-full bg-white p-5 overflow-y-auto">
        <div className="animate-pulse">
          <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-6"></div>
          <div className="h-5 bg-gray-200 rounded mb-3 mx-8"></div>
          <div className="h-4 bg-gray-200 rounded mb-2 mx-12"></div>
          <div className="h-4 bg-gray-200 rounded mb-6 mx-12"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-10 bg-gray-200 rounded mt-6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white p-6 overflow-y-auto">
      {/* Foto de Perfil */}
      <div className="text-center mb-8">
        <Avatar className="w-16 h-16 mx-auto mb-4">
          <AvatarImage src={patientInfo.avatar} />
          <AvatarFallback className="text-lg font-medium bg-gray-200 text-gray-700">
            {patientInfo.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Dados Básicos */}
        <h3 
          className="text-lg font-medium text-gray-900 mb-6 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => setLocation(`/contatos/${patientInfo.id}`)}
        >
          {patientInfo.name}
        </h3>
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center justify-center space-x-2">
            <Phone className="w-3 h-3" />
            <span>{patientInfo.phone}</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Mail className="w-3 h-3" />
            <span>{patientInfo.email}</span>
          </div>
        </div>
      </div>

      {/* Dados Médicos */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Informações Médicas
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Plano de Saúde:</span>
            <span className="text-gray-900">{patientInfo.health_plan || 'Particular'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tipo Sanguíneo:</span>
            <span className="text-gray-900">{patientInfo.blood_type || 'Não informado'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Alergias:</span>
            <span className="text-gray-900">{patientInfo.allergies || 'Não informado'}</span>
          </div>
        </div>
      </div>

      {/* Consultas Recentes */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Consultas Recentes
        </h4>
        <RecentAppointmentsList contactId={patientInfo.id} />
      </div>

      {/* Botão Ver Histórico Completo */}
      <Button 
        variant="ghost" 
        className="w-full h-9 text-gray-500 hover:bg-gray-50 font-normal"
      >
        Ver Histórico Completo
      </Button>
    </div>
  );
}