import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin,
  User,
  Star,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContactAvatar } from "@/components/ContactAvatar";

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

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'lead':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Lead</Badge>;
    case 'ativo':
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Ativo</Badge>;
    case 'inativo':
      return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">Inativo</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

interface ContactLayoutProps {
  children: React.ReactNode;
  currentTab: string;
}

export function ContactLayout({ children, currentTab }: ContactLayoutProps) {
  const { id } = useParams<{ id: string }>();
  const contactId = parseInt(id || '0');
  const [, setLocation] = useLocation();
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Fetch contact data
  const { data: contact, isLoading } = useQuery<Contact>({
    queryKey: ['/api/contacts', contactId],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}?clinic_id=1`);
      if (!response.ok) throw new Error('Erro ao carregar contato');
      return response.json();
    },
    enabled: !!contactId
  });

  useEffect(() => {
    const handleScroll = () => {
      if (tabsRef.current) {
        const rect = tabsRef.current.getBoundingClientRect();
        setIsTabsSticky(rect.top <= 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTabChange = (tab: string) => {
    setLocation(`/contatos/${contactId}/${tab}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-6 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mb-6"></div>
            <div className="h-64 bg-slate-200 rounded mb-6"></div>
            <div className="h-12 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Contato não encontrado</h1>
            <Button onClick={() => setLocation('/contatos')}>
              Voltar para contatos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Contact Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-start gap-6">
            {/* Back Button + Avatar unified */}
            <div className="flex-shrink-0 flex items-start gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setLocation('/contatos')}
                className="mt-1"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <ContactAvatar 
                name={contact?.name || "Contato"} 
                profilePicture={contact?.profile_picture}
                size="lg"
                className="w-20 h-20"
              />
            </div>
            
            {/* Contact Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-slate-900 truncate">
                      {contact.name}
                    </h1>
                    {contact.status && getStatusBadge(contact.status)}
                  </div>
                  
                  {/* Contact Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {contact.phone && (
                      <div className="flex items-center text-slate-600">
                        <Phone className="w-4 h-4 mr-2 text-slate-400" />
                        {contact.phone}
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center text-slate-600">
                        <Mail className="w-4 h-4 mr-2 text-slate-400" />
                        {contact.email}
                      </div>
                    )}
                    {contact.age && (
                      <div className="flex items-center text-slate-600">
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        {contact.age} anos
                      </div>
                    )}
                  </div>
                  
                  {contact.address && (
                    <div className="flex items-center text-slate-600 mt-2">
                      <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                      {contact.address}
                    </div>
                  )}
                </div>
                
                {/* Edit Button + Quick Stats */}
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-start gap-3">
                    <div>
                      <div className="text-sm text-slate-500 mb-1">
                        Paciente desde {contact.created_at && format(new Date(contact.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      {contact.appointment_count !== undefined && (
                        <div className="text-sm text-slate-600">
                          {contact.appointment_count} consulta{contact.appointment_count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="ml-2"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div ref={tabsRef} className={`bg-white border-b border-slate-200 ${isTabsSticky ? 'sticky top-0 z-10' : ''}`}>
        <div className="container mx-auto px-6">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { key: 'visao-geral', label: 'Visão Geral' },
              { key: 'anamneses', label: 'Anamneses' },
              { key: 'mara-ai', label: 'Mara AI' },
              { key: 'evolucoes', label: 'Evoluções' },
              { key: 'documentos', label: 'Documentos' },
              { key: 'arquivos', label: 'Arquivos' }
            ].map((tab) => (
              <button
                key={tab.key}
                className={`py-4 px-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  currentTab === tab.key
                    ? 'border-[#0f766e] text-[#0f766e]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`container mx-auto px-6 py-6 ${isTabsSticky ? 'pt-16' : ''}`}>
        {children}
      </div>
    </div>
  );
}

export default ContactLayout;