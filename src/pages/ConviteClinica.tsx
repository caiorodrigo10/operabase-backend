import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useRouter } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Building2, Mail, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

// Schema de validação
const acceptInvitationSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  clinicName: z.string().min(2, 'Nome da clínica é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de senha é obrigatória')
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type AcceptInvitationForm = z.infer<typeof acceptInvitationSchema>;

interface Invitation {
  id: number;
  email: string;
  admin_name: string;
  clinic_name: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export function ConviteClinica() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [acceptanceCompleted, setAcceptanceCompleted] = useState(false);

  console.log('🚀 ConviteClinica component mounted');
  console.log('🎫 Token from useParams:', token);
  console.log('🎫 Token type:', typeof token);
  console.log('🎫 Token length:', token?.length);

  const form = useForm<AcceptInvitationForm>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      name: '',
      email: '',
      clinicName: '',
      password: '',
      confirmPassword: ''
    }
  });

  // Query para buscar dados do convite
  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ['/api/clinics/invitations', token],
    queryFn: async () => {
      console.log('🔍 Buscando convite para token:', token);
      console.log('🌐 Window location:', window.location.href);
      console.log('🌐 Origin:', window.location.origin);
      
      const url = `/api/clinics/invitations/${token}`;
      console.log('📡 Fazendo requisição para:', url);
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response status:', res.status);
      console.log('📡 Response headers:', Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        console.log('❌ Response não OK:', res.status, res.statusText);
        const errorText = await res.text();
        console.log('📄 Corpo do erro:', errorText);
        
        if (res.status === 404) {
          throw new Error('Convite não encontrado ou expirado');
        }
        throw new Error(`Erro ao carregar convite: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      console.log('✅ Dados do convite recebidos:', data);
      console.log('✅ Tipo dos dados:', typeof data);
      console.log('✅ Keys dos dados:', Object.keys(data));
      
      return data;
    },
    enabled: !!token,
    retry: false
  });

  // Mutation para aceitar convite
  const acceptInvitationMutation = useMutation({
    mutationFn: async (data: AcceptInvitationForm) => {
      console.log('📤 Enviando dados para aceitar convite:', data);
      console.log('🎫 Token:', token);
      console.log('🌐 URL base:', window.location.origin);
      
      const payload = {
        name: data.name,
        email: data.email,
        clinicName: data.clinicName,
        password: data.password
      };
      
      const url = `/api/clinics/invitations/${token}/accept`;
      console.log('📡 Fazendo requisição para:', url);
      console.log('📦 Payload:', payload);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      console.log('📡 Response status:', res.status);
      console.log('📡 Response headers:', Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        let errorMessage = 'Erro ao aceitar convite';
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await res.json();
            console.log('❌ Error data (JSON):', errorData);
            errorMessage = errorData.error || errorMessage;
            
            // Se há detalhes de validação, mostrar o primeiro erro mais específico
            if (errorData.details && errorData.details.length > 0) {
              const firstError = errorData.details[0];
              errorMessage = `${firstError.path?.join('.')}: ${firstError.message}` || firstError.message;
            }
          } else {
            const textError = await res.text();
            console.log('❌ Error data (text):', textError);
            errorMessage = textError || errorMessage;
          }
        } catch (parseError) {
          console.log('❌ Failed to parse error response:', parseError);
          errorMessage = `Erro ${res.status}: ${res.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      console.log('✅ Success response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('✅ Convite aceito com sucesso:', data);
      setAcceptanceCompleted(true);
      toast({
        title: "Convite aceito com sucesso!",
        description: `Bem-vindo à ${invitation?.clinic_name}. Sua conta foi criada.`,
      });
      
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (error: any) => {
      console.error('❌ Erro ao aceitar convite:', error);
      toast({
        title: "Erro ao aceitar convite",
        description: error.message || "Ocorreu um erro ao processar o convite.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: AcceptInvitationForm) => {
    acceptInvitationMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando convite...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {error?.message || 'Este convite não é válido ou já expirou.'}
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full mt-4"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptanceCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Convite Aceito!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Sua conta foi criada com sucesso na <strong>{invitation.clinic_name}</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Você será redirecionado para a página de login em alguns segundos...
            </p>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building2 className="w-12 h-12 text-teal-600 mx-auto mb-4" />
          <CardTitle>Convite para Clínica</CardTitle>
          <CardDescription>
            Complete seu cadastro para começar a usar o sistema
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Informações do convite */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-teal-600" />
              <span className="font-medium">Convidado originalmente:</span>
              <span className="text-gray-600">{invitation.email}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span className="font-medium">Válido até:</span>
              <span className="text-gray-600">{format(new Date(invitation.expires_at), "dd/MM/yyyy HH:mm")}</span>
            </div>
          </div>

          {/* Formulário */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seu Nome</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite seu nome completo"
                        {...field}
                      />
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
                    <FormLabel>Seu Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Digite seu email"
                        {...field}
                      />
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
                      <Input
                        placeholder="Digite o nome da sua clínica"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Digite sua senha"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirme sua senha"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={acceptInvitationMutation.isPending}
              >
                {acceptInvitationMutation.isPending ? 'Processando...' : 'Aceitar Convite e Criar Conta'}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Ao aceitar este convite, você concorda com os termos de uso do sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}