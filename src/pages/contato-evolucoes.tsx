import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ContactLayout from "@/components/ContactLayout";
import ProntuarioMedico from "@/components/ProntuarioMedico";

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

export default function ContatoEvolucoes() {
  const { id: contactId } = useParams() as { id: string };

  // Fetch appointments for this contact
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments', contactId],
    queryFn: async () => {
      const response = await fetch(`/api/appointments?clinic_id=1&contact_id=${contactId}`);
      if (!response.ok) throw new Error('Erro ao carregar consultas');
      return response.json();
    },
    enabled: !!contactId
  });

  if (isLoading) {
    return (
      <ContactLayout currentTab="evolucoes">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </ContactLayout>
    );
  }

  return (
    <ContactLayout currentTab="evolucoes">
      <ProntuarioMedico 
        contactId={parseInt(contactId)} 
        appointments={appointments} 
      />
    </ContactLayout>
  );
}