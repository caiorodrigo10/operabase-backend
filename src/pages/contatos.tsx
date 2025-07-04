import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OptimizedContactCard } from "@/components/OptimizedContactCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema } from "../../../server/domains/contacts/contacts.schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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

// Status labels for contacts (no longer displaying as badges)
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

export function Contatos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [patientFormTab, setPatientFormTab] = useState("basic");
  const [currentPage, setCurrentPage] = useState(1);
  const [, setLocation] = useLocation();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pagination constants
  const ITEMS_PER_PAGE = 20;

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

  // Form for adding new contact - complete patient form with minimal validation
  const form = useForm<any>({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Nome é obrigatório"),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      profession: z.string().optional(),
      // All other fields are optional strings
      gender: z.string().optional(),
      reminder_preference: z.string().optional(),
      cpf: z.string().optional(),
      rg: z.string().optional(),
      birth_date: z.string().optional(),
      how_found_clinic: z.string().optional(),
      notes: z.string().optional(),
      emergency_contact_name: z.string().optional(),
      emergency_contact_phone: z.string().optional(),
      landline_phone: z.string().optional(),
      zip_code: z.string().optional(),
      address: z.string().optional(),
      address_complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      responsible_name: z.string().optional(),
      responsible_cpf: z.string().optional(),
      responsible_birth_date: z.string().optional(),
      insurance_type: z.string().optional(),
      insurance_holder: z.string().optional(),
      insurance_number: z.string().optional(),
      insurance_responsible_cpf: z.string().optional(),
    })),
    defaultValues: {
      clinic_id: 1,
      name: "",
      phone: "",
      email: "",
      profession: "",
      status: "lead",
      gender: "",
      reminder_preference: "whatsapp",
      cpf: "",
      rg: "",
      birth_date: "",
      how_found_clinic: "",
      notes: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      landline_phone: "",
      zip_code: "",
      address: "",
      address_complement: "",
      neighborhood: "",
      city: "",
      state: "",
      responsible_name: "",
      responsible_cpf: "",
      responsible_birth_date: "",
      insurance_type: "particular",
      insurance_holder: "",
      insurance_number: "",
      insurance_responsible_cpf: "",
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



  const onSubmitContact = (data: any) => {
    // Filter only the fields that exist in the contact schema
    const contactData = {
      clinic_id: 1,
      name: data.name,
      phone: data.phone || "",
      email: data.email || null,
      profession: data.profession || null,
      status: "novo" as const,
      // Store additional data in notes for now
      notes: data.notes || [
        data.gender && `Gênero: ${data.gender}`,
        data.cpf && `CPF: ${data.cpf}`,
        data.rg && `RG: ${data.rg}`,
        data.birth_date && `Data de nascimento: ${data.birth_date}`,
        data.emergency_contact_name && `Contato de emergência: ${data.emergency_contact_name} - ${data.emergency_contact_phone}`,
        data.address && `Endereço: ${data.address}`,
        data.insurance_type && data.insurance_type !== "particular" && `Convênio: ${data.insurance_type}`
      ].filter(Boolean).join('\n') || null
    };
    
    createContactMutation.mutate(contactData);
  };

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

  // Pagination logic
  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedContacts = filteredContacts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter]);

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
                className="bg-teal-600 hover:bg-teal-700 flex items-center gap-2"
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
                  <SelectItem value="agendado">Agendou</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="pos_atendimento">Pós-atendimento</SelectItem>
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
            {paginatedContacts?.map((contact: Contact) => {
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
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredContacts.length)} de {filteredContacts.length} contatos
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Contact Modal - Complete Patient Creation Form */}
      <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar novo paciente</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitContact)} className="space-y-6">
              <Tabs value={patientFormTab} onValueChange={setPatientFormTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Informações básicas</TabsTrigger>
                  <TabsTrigger value="additional">Informações complementares</TabsTrigger>
                  <TabsTrigger value="insurance">Convênio</TabsTrigger>
                </TabsList>

                {/* Tab 1: Basic Information */}
                <TabsContent value="basic" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>* Nome completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite o nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gênero</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="masculino">Masculino</SelectItem>
                              <SelectItem value="feminino">Feminino</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                              <SelectItem value="nao_informado">Não informado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Celular</FormLabel>
                          <FormControl>
                            <Input placeholder="(11) 99999-9999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="reminder_preference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lembretes automáticos</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue="whatsapp">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="WhatsApp" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="none">Nenhum</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input placeholder="000.000.000-00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="rg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RG</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000-0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="birth_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de nascimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      name="how_found_clinic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Como conheceu a clínica</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="indicacao">Indicação</SelectItem>
                              <SelectItem value="internet">Internet</SelectItem>
                              <SelectItem value="redes_sociais">Redes sociais</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adicionar observações</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Adicione observações sobre o paciente"
                            className="resize-none"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Contato de emergência</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="emergency_contact_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do contato de emergência" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="emergency_contact_phone"
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
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Additional Information */}
                <TabsContent value="additional" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="email@exemplo.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="landline_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone fixo</FormLabel>
                          <FormControl>
                            <Input placeholder="(11) 3333-4444" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="zip_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input placeholder="00000-000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço com número</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, Avenida, número" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address_complement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Apartamento, casa, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do bairro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Cidade" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SP">São Paulo</SelectItem>
                              <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                              <SelectItem value="MG">Minas Gerais</SelectItem>
                              <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Responsável</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="responsible_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do responsável" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="responsible_cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input placeholder="000.000.000-00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="responsible_birth_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de nascimento</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 3: Insurance */}
                <TabsContent value="insurance" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="insurance_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Convênio</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue="particular">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Particular" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="particular">Particular</SelectItem>
                              <SelectItem value="unimed">Unimed</SelectItem>
                              <SelectItem value="bradesco">Bradesco Saúde</SelectItem>
                              <SelectItem value="amil">Amil</SelectItem>
                              <SelectItem value="sul_america">SulAmérica</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="insurance_holder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titular do convênio</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do titular" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="insurance_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número da carteirinha</FormLabel>
                          <FormControl>
                            <Input placeholder="Número da carteirinha" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="insurance_responsible_cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF do Responsável</FormLabel>
                          <FormControl>
                            <Input placeholder="000.000.000-00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddContactOpen(false)}
                  disabled={createContactMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-medical-blue hover:bg-blue-700"
                  disabled={createContactMutation.isPending}
                >
                  {createContactMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Cadastrar paciente
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