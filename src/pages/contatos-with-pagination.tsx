import { useState, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { PaginationInfo } from "@/components/ui/pagination-info";
import { ItemsPerPageSelector } from "@/components/ui/items-per-page-selector";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

export function ContatosWithPagination() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Pagination with search and filters
  const {
    data: contactsResponse,
    isLoading,
    pagination,
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    hasNext,
    hasPrev,
    goToPage,
    nextPage,
    prevPage,
    setItemsPerPage,
    isFirstPage,
    isLastPage
  } = usePagination(
    ['/api/contacts/paginated'],
    async (params) => {
      const queryParams = new URLSearchParams({
        clinic_id: '1',
        page: params.page.toString(),
        limit: params.limit.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      
      const response = await fetch(`/api/contacts/paginated?${queryParams}`);
      if (!response.ok) throw new Error('Erro ao carregar contatos');
      return response.json();
    },
    { search: debouncedSearchTerm, status: statusFilter },
    {
      defaultPage: 1,
      defaultLimit: 25,
      staleTime: debouncedSearchTerm ? 30 * 1000 : 5 * 60 * 1000
    }
  );

  const contacts = contactsResponse?.data || [];

  // Form for adding new contact
  const form = useForm<any>({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Nome é obrigatório"),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      profession: z.string().optional(),
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
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/paginated'] });
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

  // Optimized contact click handler
  const handleContactClick = useCallback((contactId: number) => {
    setLocation(`/contatos/${contactId}`);
  }, [setLocation]);

  const onSubmitContact = (data: any) => {
    const contactData = {
      clinic_id: 1,
      name: data.name,
      phone: data.phone || "",
      email: data.email || null,
      profession: data.profession || null,
      status: "novo" as const,
      notes: data.notes || null
    };
    
    createContactMutation.mutate(contactData);
  };

  // Generate pagination items
  const generatePaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);
      
      if (startPage > 1) {
        items.push(1);
        if (startPage > 2) items.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        items.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) items.push('...');
        items.push(totalPages);
      }
    }
    
    return items;
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
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="em_conversa">Em conversa</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
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
          {/* Pagination info and items per page selector */}
          <div className="flex justify-between items-center mb-4">
            <PaginationInfo pagination={pagination} isLoading={isLoading} />
            <ItemsPerPageSelector 
              value={itemsPerPage}
              onValueChange={setItemsPerPage}
              disabled={isLoading}
            />
          </div>

          {/* Contacts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {contacts?.map((contact: Contact) => {
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
          
          {contacts?.length === 0 && (
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

          {/* Pagination controls */}
          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      prevPage();
                    }}
                    className={!hasPrev ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {generatePaginationItems().map((item, index) => (
                  <PaginationItem key={index}>
                    {item === '...' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(item as number);
                        }}
                        isActive={currentPage === item}
                      >
                        {item}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      nextPage();
                    }}
                    className={!hasNext ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
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