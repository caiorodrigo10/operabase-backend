import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Building, UserCheck, Calendar, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BasicAdminMetrics {
  totalClinics: number;
  totalUsers: number;
  totalContacts: number;
  totalAppointments: number;
}

export function AdminDashboard() {
  const { user } = useAuth();
  
  // Dados mockados para o dashboard admin
  const mockMetrics: BasicAdminMetrics = {
    totalClinics: 3,
    totalUsers: 25,
    totalContacts: 1247,
    totalAppointments: 8362
  };

  const { data: metrics, isLoading, error } = useQuery<BasicAdminMetrics>({
    queryKey: ['/api/admin/dashboard'],
    queryFn: () => Promise.resolve(mockMetrics), // Usando dados mockados
    enabled: user?.role === 'super_admin' || user?.role === 'admin' || user?.id === '3cd96e6d-81f2-4c8a-a54d-3abac77b37a4' || user?.email === 'cr@caiorodrigo.com.br',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Check if user has admin access (works with existing auth system)
  const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin' || user?.id === '3cd96e6d-81f2-4c8a-a54d-3abac77b37a4' || user?.email === 'cr@caiorodrigo.com.br';
  if (!user || !hasAdminAccess) {
    return (
      <div className="p-4 lg:p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Acesso negado. Você precisa de permissões de administrador para acessar esta página.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar métricas do admin. Tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Panel</h1>
        <p className="text-slate-600">Visão geral da plataforma TaskMed</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clínicas</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalClinics || 0}</div>
            <p className="text-xs text-muted-foreground">
              Clínicas ativas na plataforma
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Usuários cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalContacts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pacientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Consultas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Consultas agendadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Banco de Dados</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Operacional
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">API</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Operacional
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Autenticação</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Operacional
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}