import { Calendar, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ActionNotificationProps {
  action: {
    id: number;
    action_type: string;
    title: string;
    description: string;
    metadata: any;
    created_at: string;
  };
}

export function ActionNotification({ action }: ActionNotificationProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/');
    return `${day}/${month}`;
  };

  const getActionIcon = () => {
    switch (action.action_type) {
      case 'appointment_created':
        return <Calendar className="w-4 h-4 text-green-600" />;
      case 'appointment_status_changed':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = () => {
    switch (action.action_type) {
      case 'appointment_created':
        return 'border-green-200 bg-green-50';
      case 'appointment_status_changed':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const AppointmentPopup = () => (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Detalhes da Consulta</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm">
            {action.metadata?.date} às {action.metadata?.time}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-500" />
          <span className="text-sm">{action.metadata?.doctor_name}</span>
        </div>
        {action.metadata?.specialty && (
          <div className="text-sm text-gray-600">
            <strong>Especialidade:</strong> {action.metadata.specialty}
          </div>
        )}
        {action.action_type === 'appointment_status_changed' && (
          <div className="text-sm">
            <span className="text-red-600">{action.metadata?.old_status}</span>
            <span className="mx-2">→</span>
            <span className="text-green-600">{action.metadata?.new_status}</span>
          </div>
        )}
      </div>
    </DialogContent>
  );

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mx-4 my-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Calendar className="w-3 h-3 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-800">
                {action.description}
              </span>
              <span className="text-xs text-gray-500">
                {formatTime(action.created_at)}
              </span>
            </div>
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="ml-3 h-7 px-2 text-xs bg-white border-blue-300 text-blue-700 hover:bg-blue-50 flex-shrink-0"
            >
              Ver consulta
            </Button>
          </DialogTrigger>
          <AppointmentPopup />
        </Dialog>
      </div>
    </div>
  );
}