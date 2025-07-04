import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema } from "@/../../shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Calendar, 
  Clock, 
  Save,
  Plus,
  UserPlus
} from "lucide-react";
import type { Contact, InsertContact } from "@/../../shared/schema";

const statusLabels = {
  novo: { label: "Novo", color: "bg-slate-100 text-slate-800" },
  em_conversa: { label: "Em conversa", color: "bg-blue-100 text-blue-800" },
  agendado: { label: "Agendado", color: "bg-green-100 text-green-800" },
  realizado: { label: "Realizado", color: "bg-purple-100 text-purple-800" },
  pos_atendimento: { label: "Pós-atendimento", color: "bg-emerald-100 text-emerald-800" },
};

export function Contatos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch contacts from API
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['/api/contacts', { clinic_id: 1 }],
    queryFn: async () => {
      const response = await fetch('/api/contacts?clinic_id=1');
      if (!response.ok) throw new Error('Erro ao carregar contatos');
      return response.json();
    }
  });

  // Form for adding new contact
  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema.extend({
      age: insertContactSchema.shape.age.optional(),
      profession: insertContactSchema.shape.profession.optional()
    })),
    defaultValues: {
      clinic_id: 1,
      name: "",
      phone: "",
      email: "",
      age: undefined,
      profession: "",
      status: "novo",
      priority: "normal",
      source: "whatsapp"
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

  const filteredContacts = contacts.filter((contact: Contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onSubmitContact = (data: InsertContact) => {
    createContactMutation.mutate(data);
  };

  const handleContactClick = (contact: Contact) => {
    setLocation(`/contatos/${contact.id}`);
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
            {filteredContacts.map((contact: Contact) => {
              const status = statusLabels[contact.status as keyof typeof statusLabels];
              
              return (
                <div
                  key={contact.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-medical-blue"
                  onClick={() => handleContactClick(contact)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-medical-blue to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 truncate">{contact.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </div>
                      </div>
                    </div>
                    <Badge className={status.color}>
                      {status.label}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    {contact.profession && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {contact.profession}
                      </div>
                    )}
                    
                    {contact.address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{contact.address}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {contact.first_contact 
                        ? formatDistanceToNow(new Date(contact.first_contact), { addSuffix: true, locale: ptBR })
                        : 'Data não informada'
                      }
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MessageCircle className="w-3 h-3" />
                      {contact.source || 'WhatsApp'}
                    </div>
                    <span className="text-xs text-slate-500">
                      Ver detalhes →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">Nenhum contato encontrado</h3>
              <p className="text-slate-500 mb-4">
                {searchTerm || statusFilter !== "all" 
                  ? "Tente ajustar os filtros de busca" 
                  : "Comece adicionando o primeiro contato"}
              </p>
              <Button 
                onClick={() => setIsAddContactOpen(true)}
                className="bg-medical-blue hover:bg-blue-700"
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-medical-blue" />
              Adicionar Novo Contato
            </DialogTitle>
            <DialogDescription>
              Preencha as informações básicas do novo contato
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitContact)} className="space-y-6">
              {/* Basic Information */}
              <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informações Básicas
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome completo" {...field} />
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
                        <FormLabel>Telefone *</FormLabel>
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
                          <Input 
                            type="email" 
                            placeholder="email@exemplo.com" 
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idade</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Idade" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
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
                          <Input 
                            placeholder="Profissão" 
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status Inicial</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="novo">Novo</SelectItem>
                            <SelectItem value="em_conversa">Em conversa</SelectItem>
                            <SelectItem value="agendado">Agendado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Informações Adicionais
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origem do Contato</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Como chegou até nós?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="telefone">Telefone</SelectItem>
                            <SelectItem value="indicacao">Indicação</SelectItem>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="redes_sociais">Redes Sociais</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Nível de prioridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Endereço completo" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergency_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato de Emergência</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome e telefone do contato de emergência" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Contato
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