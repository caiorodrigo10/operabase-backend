import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Plus, Building2, Users, Mail, Trash2, Clock, CheckCircle, XCircle, Copy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Schemas de validação
const createInvitationSchema = z.object({
  email: z.string().email('Email inválido'),
  adminName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  clinicName: z.string().min(2, 'Nome da clínica deve ter no mínimo 2 caracteres')
});

type CreateInvitationForm = z.infer<typeof createInvitationSchema>;

// Interfaces
interface Clinic {
  id: number;
  name: string;
  responsible: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  total_professionals?: number;
}

interface Invitation {
  id: number;
  admin_email: string;
  admin_name: string;
  clinic_name: string;
  status: 'pending' | 'accepted' | 'cancelled';
  expires_at: string;
  created_at: string;
}

// Modal para criar convite
function CreateInvitationDialog({ onSubmit }: { onSubmit: (data: CreateInvitationForm) => void }) {
  const [open, setOpen] = useState(false);
  
  const form = useForm<CreateInvitationForm>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      email: '',
      adminName: '',
      clinicName: ''
    }
  });

  const handleSubmit = async (data: CreateInvitationForm) => {
    await onSubmit(data);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Convidar Nova Clínica
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Convite de Clínica</DialogTitle>
          <DialogDescription>
            Envie um convite para criar uma nova clínica no sistema.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email do Administrador</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@clinica.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Administrador</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clinicName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Clínica</FormLabel>
                  <FormControl>
                    <Input placeholder="Clínica Exemplo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Criar e Enviar Convite</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Modal para exibir link do convite
function InvitationLinkDialog({ 
  open, 
  onOpenChange, 
  invitationLink 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  invitationLink: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para sua área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convite Criado com Sucesso!</DialogTitle>
          <DialogDescription>
            Compartilhe este link com o administrador da nova clínica para que ele possa criar sua conta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <label htmlFor="link" className="text-sm font-medium">
                Link do Convite
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="link"
                  defaultValue={invitationLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={copyToClipboard}
                >
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>
          </div>
          <Alert>
            <AlertDescription>
              Este link é válido por 7 dias. Após esse período, será necessário criar um novo convite.
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente principal
export function ClinicsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [invitationLink, setInvitationLink] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  // Query para listar clínicas
  const { data: clinicsData, isLoading: clinicsLoading, error: clinicsError } = useQuery({
    queryKey: ['/api/clinics'],
    queryFn: async () => {
      const res = await apiRequest('/api/clinics?limit=100', 'GET');
      if (!res.ok) {
        throw new Error(`Failed to fetch clinics: ${res.status}`);
      }
      return res.json();
    },
    retry: 1
  });

  const clinics = clinicsData?.clinics || [];

  // Query para listar convites
  const { data: invitationsData, isLoading: invitationsLoading, error: invitationsError } = useQuery({
    queryKey: ['/api/clinics/invitations'],
    queryFn: async () => {
      const res = await apiRequest('/api/clinics/invitations?limit=100', 'GET');
      if (!res.ok) {
        throw new Error(`Failed to fetch invitations: ${res.status}`);
      }
      return res.json();
    },
    retry: 1
  });

  const invitations = invitationsData?.invitations || [];

  // Mutation para criar convite
  const createInvitationMutation = useMutation({
    mutationFn: async (data: CreateInvitationForm) => {
      const payload = {
        admin_email: data.email, // backend expects admin_email but maps to email field
        admin_name: data.adminName,
        clinic_name: data.clinicName
      };
      const res = await apiRequest('/api/clinics/invitations', 'POST', payload);
      return res.json();
    },
    onSuccess: (data) => {
      // Construir o link do convite
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/convite-clinica/${data.token}`;
      setInvitationLink(link);
      setShowLinkDialog(true);
      
      toast({
        title: "Convite criado com sucesso",
        description: "O email foi enviado para o administrador da nova clínica.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clinics/invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar convite",
        description: error.message || "Ocorreu um erro ao enviar o convite.",
        variant: "destructive",
      });
    }
  });

  // Mutation para cancelar convite
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await apiRequest(`/api/clinics/invitations/${invitationId}`, 'DELETE');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Convite cancelado",
        description: "O convite foi cancelado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clinics/invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar convite",
        description: error.message || "Ocorreu um erro ao cancelar o convite.",
        variant: "destructive",
      });
    }
  });

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending': return 'outline';
      case 'accepted': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'accepted': return 'Aceito';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Clínicas</h1>
          <p className="text-muted-foreground">
            Gerencie clínicas existentes e envie convites para novas clínicas.
          </p>
        </div>
        <CreateInvitationDialog onSubmit={createInvitationMutation.mutate} />
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clínicas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clinics?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Pendentes</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invitations?.filter(inv => inv.status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Profissionais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clinics?.reduce((sum, clinic) => sum + (clinic.total_professionals || 1), 0) || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clínicas Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clinics?.filter(clinic => clinic.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clínicas Existentes */}
      <Card>
        <CardHeader>
          <CardTitle>Clínicas Registradas</CardTitle>
          <CardDescription>
            Lista de todas as clínicas ativas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clinicsLoading ? (
            <div className="text-center py-4">Carregando clínicas...</div>
          ) : clinics?.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nenhuma clínica encontrada. Use o botão "Convidar Nova Clínica" para começar.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Clínica</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Profissionais</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinics?.map((clinic) => (
                  <TableRow key={clinic.id}>
                    <TableCell className="font-medium">{clinic.name}</TableCell>
                    <TableCell>{clinic.responsible}</TableCell>
                    <TableCell>{clinic.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={clinic.status === 'active' ? 'default' : 'secondary'}>
                        {clinic.status === 'active' ? 'Ativa' : clinic.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(clinic.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{clinic.total_professionals || 1}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Lista de Convites */}
      <Card>
        <CardHeader>
          <CardTitle>Convites de Clínica</CardTitle>
          <CardDescription>
            Gerencie convites enviados para novas clínicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? (
            <div className="text-center py-4">Carregando convites...</div>
          ) : invitations?.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nenhum convite encontrado. Use o botão "Convidar Nova Clínica" para enviar convites.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome do Admin</TableHead>
                  <TableHead>Nome da Clínica</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Link do Convite</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations?.map((invitation) => {
                  const inviteLink = `${window.location.origin}/convite-clinica/${invitation.token}`;
                  
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>{invitation.admin_name}</TableCell>
                      <TableCell className="font-medium">{invitation.clinic_name}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(invitation.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(invitation.status)}
                          {getStatusText(invitation.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {inviteLink}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(inviteLink);
                              toast({
                                title: "Link copiado!",
                                description: "O link do convite foi copiado para a área de transferência."
                              });
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(invitation.expires_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invitation.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {invitation.status === 'pending' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                            disabled={cancelInvitationMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Modal para exibir link do convite */}
      <InvitationLinkDialog 
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        invitationLink={invitationLink}
      />
    </div>
  );
}