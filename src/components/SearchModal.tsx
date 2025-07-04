import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, User, Phone, Mail, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  clinic_id: number;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Custom hook for debouncing search term
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Only search when we have at least 2 characters
  const shouldSearch = debouncedSearchTerm.length >= 2;

  const { data: contactsData = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts/optimized', { clinic_id: 1, search: debouncedSearchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams({
        clinic_id: '1',
        search: debouncedSearchTerm,
        limit: '10' // Limit results for search modal
      });
      
      const response = await fetch(`/api/contacts/optimized?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      return response.json();
    },
    enabled: isOpen && shouldSearch, // Only fetch when modal is open and we have a search term
    retry: false,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Ensure contacts is properly typed
  const contacts = Array.isArray(contactsData) ? contactsData : [];

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleContactClick = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-800">
            Procurar Pacientes
          </DialogTitle>
          <DialogDescription>
            Digite pelo menos 2 caracteres para buscar pacientes
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Digite o nome do paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input pl-10 text-base"
              autoFocus
            />
            {isLoading && (
              <div className="absolute right-3 top-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto">
            {!shouldSearch ? (
              <div className="text-center py-8 text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Digite pelo menos 2 caracteres para buscar pacientes</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-slate-600">Buscando pacientes...</span>
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <User className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Nenhum paciente encontrado para "{debouncedSearchTerm}"</p>
                <p className="text-sm mt-2">Tente um termo de busca diferente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact: Contact) => (
                  <Link
                    key={contact.id}
                    href={`/contatos/${contact.id}`}
                    onClick={handleContactClick}
                    className={cn(
                      "block p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 truncate">
                          {contact.name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          {contact.email && (
                            <div className="flex items-center space-x-1 text-sm text-slate-500">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center space-x-1 text-sm text-slate-500">
                              <Phone className="w-3 h-3" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Search Results Summary */}
          {shouldSearch && contacts.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <div className="text-xs text-slate-500 mb-2">
                {contacts.length} paciente{contacts.length !== 1 ? 's' : ''} encontrado{contacts.length !== 1 ? 's' : ''}
                {contacts.length >= 10 && (
                  <span className="ml-2 text-orange-600">
                    (mostrando primeiros 10 resultados)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button asChild>
            <Link href="/contatos" onClick={handleContactClick}>
              Ver Todos os Pacientes
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}