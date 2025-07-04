import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OptimizedContactCard } from "@/components/OptimizedContactCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { z } from "zod";
import { 
  User, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Calendar, 
  Clock, 
  Save,
  Plus,
  UserPlus,
  FileText
} from "lucide-react";
import type { Contact, InsertContact } from "../../../server/domains/contacts/contacts.schema";

// Status labels for contacts
const statusLabels = {
  lead: "Lead",
  ativo: "Ativo",
  inativo: "Inativo",
  // Legacy status labels for backward compatibility
  novo: "Lead",
  em_conversa: "Ativo", 
  agendado: "Ativo",
  realizado: "Ativo",
  pos_atendimento: "Inativo",
  arquivado: "Inativo",
};

export function ContatosOptimized() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [patientFormTab, setPatientFormTab] = useState("basic");
  const [, setLocation] = useLocation();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Optimized contacts query with filters
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['/api/contacts', { 
      clinic_id: 1, 
      search: debouncedSearchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        clinic_id: '1',
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      
      const response = await fetch(`/api/contacts?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar contatos');
      return response.json();
    },
    staleTime: debouncedSearchTerm ? 30 * 1000 : 5 * 60 * 1000, // Shorter cache for search
    refetchOnWindowFocus: false,
  });

  // Form for adding new contact
  const form = useForm<any>({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Nome é obrigatório"),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      profession: z.string().optional(),
      gender: z.string().optional(),
      notes: z.string().optional(),
    })),
    defaultValues: {
      clinic_id: 1,
      name: "",
      phone: "",
      email: "",
      profession: "",
      status: "novo",
      notes: "",
    }
  });

  // Mutation for creating contact
  const createContactMutation = useMutation({
    mutationFn: async (contactData: InsertContact) => {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });
      if (!response.ok) throw new Error('Erro ao criar contato');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setIsAddContactOpen(false);
      form.reset();
      toast({
        title: "Contato adicionado",
        description: "O novo contato foi criado com sucesso."
      });
    },
    onError: () => {
      toast({
        title: "Erro ao adicionar contato",
        description: "Não foi possível criar o contato. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Optimized contact click handler with useCallback
  const handleContactClick = useCallback((contactId: number) => {
    setLocation(`/contatos/${contactId}`);
  }, [setLocation]);

  // Filter contacts with memoization for better performance
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    
    return contacts.filter((contact: Contact) => {
      const matchesSearch = !debouncedSearchTerm || 
        contact.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        contact.phone?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [contacts, debouncedSearchTerm, statusFilter]);

  const onSubmitContact = (data: any) => {
    const contactData = {
      clinic_id: 1,
      name: data.name,
      phone: data.phone || "",
      email: data.email || null,
      profession: data.profession || null,
      status: "lead" as const,
      notes: data.notes || null
    };
    
    createContactMutation.mutate(contactData);
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-96 bg-slate-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Contatos</h2>
              <p className="text-slate-600">Gerencie todos os contatos da clínica</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => setIsAddContactOpen(true)}
                className="bg-medical-blue hover:bg-blue-700 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Adicionar Contato
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Buscar contato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts?.map((contact: Contact) => {
              if (!contact) return null;
              
              return (
                <OptimizedContactCard
                  key={contact.id}
                  contact={contact}
                  onClick={handleContactClick}
                />
              );
            })}
          </div>
          
          {filteredContacts?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500">
                {debouncedSearchTerm || statusFilter !== 'all' 
                  ? 'Nenhum contato encontrado com os filtros aplicados.'
                  : 'Nenhum contato cadastrado ainda.'
                }
              </p>
              <Button 
                onClick={() => setIsAddContactOpen(true)}
                className="mt-4 bg-medical-blue hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Contato
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Contact Modal */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar novo contato</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitContact)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissão</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite a profissão" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações adicionais..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddContactOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createContactMutation.isPending}
                  className="bg-medical-blue hover:bg-blue-700"
                >
                  {createContactMutation.isPending ? (
                    <>Salvando...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}