import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ContactAvatar } from "@/components/ContactAvatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Phone, MessageCircle, Clock } from "lucide-react";

interface Contact {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  last_interaction: string | null;
  profession?: string | null;
}

interface OptimizedContactCardProps {
  contact: Contact;
  onClick: (contactId: number) => void;
}

/**
 * Componente otimizado de cartão de contato com memo para evitar re-renderizações
 */
export const OptimizedContactCard = memo(function OptimizedContactCard({ 
  contact, 
  onClick 
}: OptimizedContactCardProps) {
  
  const handleClick = () => {
    onClick(contact.id);
  };

  const formatLastInteraction = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return "Data inválida";
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <ContactAvatar name={contact.name} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {contact.name}
              </h3>
              <span className={`px-2 py-1 text-xs rounded-full ${
                contact.status === 'lead' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                contact.status === 'ativo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                contact.status === 'inativo' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                // Legacy status fallbacks
                contact.status === 'novo' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                contact.status === 'em_conversa' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                contact.status === 'agendado' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {contact.status === 'lead' ? 'Lead' :
                 contact.status === 'ativo' ? 'Ativo' :
                 contact.status === 'inativo' ? 'Inativo' :
                 // Legacy status fallbacks
                 contact.status === 'novo' ? 'Lead' :
                 contact.status === 'em_conversa' ? 'Ativo' :
                 contact.status === 'agendado' ? 'Ativo' :
                 contact.status}
              </span>
            </div>
            
            <div className="mt-2 space-y-1">
              {contact.phone && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="w-3 h-3 mr-2" />
                  <span className="truncate">{contact.phone}</span>
                </div>
              )}
              
              {contact.email && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <MessageCircle className="w-3 h-3 mr-2" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              
              {contact.profession && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <User className="w-3 h-3 mr-2" />
                  <span className="truncate">{contact.profession}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center mt-3 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3 mr-1" />
              <span>Última interação: {formatLastInteraction(contact.last_interaction)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedContactCard.displayName = 'OptimizedContactCard';