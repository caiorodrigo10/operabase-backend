import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, User, Stethoscope, Calendar, MapPin } from "lucide-react";

interface EventTooltipProps {
  appointment: any;
  patientName: string;
  children: React.ReactNode;
}

export function EventTooltip({ appointment, patientName, children }: EventTooltipProps) {
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'scheduled': 'Agendado',
      'confirmed': 'Confirmado',
      'completed': 'Realizado',
      'cancelled': 'Cancelado',
      'no_show': 'Não compareceu'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'scheduled': 'text-blue-600',
      'confirmed': 'text-green-600',
      'completed': 'text-gray-600',
      'cancelled': 'text-red-600',
      'no_show': 'text-orange-600'
    };
    return colorMap[status] || 'text-gray-600';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-sm p-3 bg-white border border-gray-200 shadow-lg rounded-lg"
        >
          {appointment.google_calendar_event_id ? (
            /* Google Calendar Event Pattern */
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center gap-2 pb-2 border-b border-purple-100">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span className="font-semibold text-purple-900">Evento Externo</span>
              </div>

              {/* Event Title */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-sm font-medium text-gray-900">{patientName}</span>
              </div>

              {/* Date and Time */}
              {appointment.scheduled_date && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {formatDate(appointment.scheduled_date)}
                  </span>
                </div>
              )}

              {/* Duration */}
              {appointment.duration_minutes && (
                <div className="text-xs text-gray-500 pt-1">
                  Duração: {appointment.duration_minutes} minutos
                </div>
              )}

              {/* Source Info */}
              <div className="text-xs text-purple-600 pt-1 flex items-center gap-1 border-t border-purple-100 pt-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                Sincronizado do Google Calendar
              </div>
            </div>
          ) : (
            /* System Appointment Pattern */
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-blue-900">Consulta</span>
              </div>

              {/* Patient */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  <span className="text-gray-600">Paciente:</span>
                  <span className="ml-1 font-medium text-gray-900">{patientName}</span>
                </span>
              </div>

              {/* Date and Time */}
              {appointment.scheduled_date && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {formatDate(appointment.scheduled_date)}
                  </span>
                </div>
              )}

              {/* Doctor */}
              {appointment.doctor_name && (
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    <span className="text-gray-600">Profissional:</span>
                    <span className="ml-1 text-gray-900">{appointment.doctor_name}</span>
                  </span>
                </div>
              )}

              {/* Specialty */}
              {appointment.specialty && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    <span className="text-gray-600">Especialidade:</span>
                    <span className="ml-1 text-gray-900">{appointment.specialty}</span>
                  </span>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2 pt-1">
                <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
                <span className={`text-sm font-medium ${getStatusColor(appointment.status)}`}>
                  {getStatusText(appointment.status)}
                </span>
              </div>

              {/* Duration */}
              {appointment.duration_minutes && (
                <div className="text-xs text-gray-500 pt-1">
                  Duração: {appointment.duration_minutes} minutos
                </div>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}