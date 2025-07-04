import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Users, Calendar, BarChart3, MessageCircle, Settings, Eye, EyeOff, Heart } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  clinic_name: z.string().min(2, "Nome da clínica deve ter pelo menos 2 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Landing() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      clinic_name: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo(a), ${data.user.name}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message || "Email ou senha incorretos",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const response = await apiRequest("POST", "/api/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);
      toast({
        title: "Conta criada com sucesso!",
        description: `Bem-vindo(a) ao Taskmed, ${data.user.name}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Erro ao criar conta",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Taskmed</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost"
              onClick={() => setIsLoginMode(!isLoginMode)}
            >
              {isLoginMode ? "Criar Conta" : "Fazer Login"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Hero Content */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Painel Espelho da Livia
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Plataforma completa de gestão para clínicas de saúde com inteligência artificial adaptável, 
              projetada para múltiplas especialidades médicas e de bem-estar.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Conversas Inteligentes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span className="text-sm">Gestão de Contatos</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <span className="text-sm">Agendamentos</span>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                <span className="text-sm">Pipeline de Vendas</span>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium">Segurança</p>
              </div>
              <div className="text-center">
                <Settings className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium">IA Adaptável</p>
              </div>
              <div className="text-center">
                <MessageCircle className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                <p className="text-sm font-medium">WhatsApp API</p>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Forms */}
          <div>
            <Card className="w-full max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  {isLoginMode ? "Entrar na Plataforma" : "Criar Sua Conta"}
                </CardTitle>
                <CardDescription>
                  {isLoginMode 
                    ? "Acesse sua clínica e gerencie seus pacientes" 
                    : "Configure sua clínica em poucos minutos"}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {isLoginMode ? (
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        {...loginForm.register("email")}
                        type="email"
                        placeholder="seu@email.com"
                        disabled={loginMutation.isPending}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Input
                          {...loginForm.register("password")}
                          type={showPassword ? "text" : "password"}
                          placeholder="Sua senha"
                          disabled={loginMutation.isPending}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Entrando..." : "Entrar"}
                    </Button>
                    
                    <div className="text-center">
                      <a 
                        href="/recuperar-senha"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Esqueci minha senha
                      </a>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Seu Nome</Label>
                      <Input
                        {...registerForm.register("name")}
                        placeholder="Dr. João Silva"
                        disabled={registerMutation.isPending}
                      />
                      {registerForm.formState.errors.name && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="clinic_name">Nome da Clínica</Label>
                      <Input
                        {...registerForm.register("clinic_name")}
                        placeholder="Clínica São João"
                        disabled={registerMutation.isPending}
                      />
                      {registerForm.formState.errors.clinic_name && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.clinic_name.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        {...registerForm.register("email")}
                        type="email"
                        placeholder="seu@email.com"
                        disabled={registerMutation.isPending}
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Input
                          {...registerForm.register("password")}
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          disabled={registerMutation.isPending}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Criando conta..." : "Criar Conta"}
                    </Button>
                  </form>
                )}

                <div className="mt-4 text-center">
                  <Button 
                    variant="link" 
                    onClick={() => setIsLoginMode(!isLoginMode)}
                    className="text-sm"
                  >
                    {isLoginMode 
                      ? "Não tem conta? Criar agora" 
                      : "Já tem conta? Fazer login"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Heart className="h-6 w-6 text-blue-400" />
            <span className="text-xl font-bold">Taskmed</span>
          </div>
          <p className="text-gray-400">
            © 2024 Taskmed. Transformando a gestão de clínicas com tecnologia.
          </p>
        </div>
      </footer>
    </div>
  );
}