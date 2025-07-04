import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Users, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Smartphone,
  Clock,
  Search,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SystemLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action_type: string;
  clinic_id: number;
  actor_id: string;
  actor_type: string;
  actor_name: string;
  related_entity_id?: number;
  old_data?: any;
  new_data?: any;
  source: string;
  created_at: string;
}

interface LogStats {
  total_logs: number;
  by_entity_type: Record<string, number>;
  by_action_type: Record<string, number>;
  by_actor_type: Record<string, number>;
  recent_activity: number;
}

const entityTypeLabels = {
  contact: 'Contato',
  appointment: 'Agendamento',
  medical_record: 'Prontuário',
  anamnesis: 'Anamnese',
  whatsapp_number: 'WhatsApp',
  message: 'Mensagem'
};

const actionTypeLabels = {
  created: 'Criado',
  updated: 'Atualizado',
  deleted: 'Excluído',
  filled: 'Preenchido',
  connected: 'Conectado',
  disconnected: 'Desconectado',
  sent: 'Enviado',
  received: 'Recebido',
  signed: 'Assinado',
  reviewed: 'Revisado'
};

const actorTypeLabels = {
  professional: 'Profissional',
  patient: 'Paciente',
  system: 'Sistema',
  admin: 'Administrador'
};

const entityTypeIcons = {
  contact: Users,
  appointment: Calendar,
  medical_record: FileText,
  anamnesis: FileText,
  whatsapp_number: Smartphone,
  message: MessageSquare
};

function getEntityIcon(entityType: string) {
  const Icon = entityTypeIcons[entityType as keyof typeof entityTypeIcons] || Activity;
  return <Icon className="h-4 w-4" />;
}

function getActionColor(actionType: string) {
  switch (actionType) {
    case 'created':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'updated':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'deleted':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'filled':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'connected':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'disconnected':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

export default function SystemLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState('');

  // Fetch recent logs
  const { data: recentLogs = [], isLoading: logsLoading } = useQuery<SystemLog[]>({
    queryKey: ['/api/system-logs/recent'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch system statistics
  const { data: stats, isLoading: statsLoading } = useQuery<LogStats>({
    queryKey: ['/api/system-logs/stats'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch patient timeline when selected
  const { data: patientTimeline = [], isLoading: timelineLoading } = useQuery<SystemLog[]>({
    queryKey: ['/api/system-logs/patient', selectedPatient],
    enabled: !!selectedPatient
  });

  // Filter logs based on search and filters
  const filteredLogs = (Array.isArray(recentLogs) ? recentLogs : []).filter(log => {
    const matchesSearch = !searchTerm || 
      log.actor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    
    return matchesSearch && matchesEntity && matchesAction;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs do Sistema</h1>
          <p className="text-muted-foreground">
            Auditoria completa e monitoramento de atividades
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="recent">Atividade Recente</TabsTrigger>
          <TabsTrigger value="timeline">Timeline do Paciente</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.total_logs || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Todos os registros de auditoria
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atividade Recente</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.recent_activity || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Últimas 24 horas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tipos de Entidade</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : Object.keys(stats?.by_entity_type || {}).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Diferentes tipos monitorados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : Object.keys(stats?.by_actor_type || {}).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tipos de atores do sistema
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity by Entity Type */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Atividade por Tipo de Entidade</CardTitle>
                <CardDescription>
                  Distribuição de logs por tipo de dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.by_entity_type && Object.entries(stats.by_entity_type).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getEntityIcon(type)}
                        <span className="text-sm font-medium">
                          {entityTypeLabels[type as keyof typeof entityTypeLabels] || type}
                        </span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Atividade por Tipo de Ação</CardTitle>
                <CardDescription>
                  Distribuição de logs por ação realizada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.by_action_type && Object.entries(stats.by_action_type).map(([action, count]) => (
                    <div key={action} className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {actionTypeLabels[action as keyof typeof actionTypeLabels] || action}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={getActionColor(action)}
                      >
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por usuário, ação..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de Entidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Entidades</SelectItem>
                    {Object.entries(entityTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Ações</SelectItem>
                    {Object.entries(actionTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros Avançados
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Logs Recentes</CardTitle>
              <CardDescription>
                Atividades mais recentes do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Carregando logs...
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Nenhum log encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getEntityIcon(log.entity_type)}
                              <span className="text-sm">
                                {entityTypeLabels[log.entity_type as keyof typeof entityTypeLabels] || log.entity_type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getActionColor(log.action_type)}>
                              {actionTypeLabels[log.action_type as keyof typeof actionTypeLabels] || log.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{log.actor_name || 'Sistema'}</div>
                              <div className="text-muted-foreground">
                                {actorTypeLabels[log.actor_type as keyof typeof actorTypeLabels] || log.actor_type}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {actorTypeLabels[log.actor_type as keyof typeof actorTypeLabels] || log.actor_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {log.source}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeline do Paciente</CardTitle>
              <CardDescription>
                Histórico completo de atividades de um paciente específico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="ID do Paciente"
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button 
                    onClick={() => setSelectedPatient('')}
                    variant="outline"
                  >
                    Limpar
                  </Button>
                </div>

                {selectedPatient && (
                  <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                    {timelineLoading ? (
                      <div className="text-center py-8">Carregando timeline...</div>
                    ) : patientTimeline.length === 0 ? (
                      <div className="text-center py-8">Nenhum log encontrado para este paciente</div>
                    ) : (
                      <div className="space-y-4">
                        {patientTimeline.map((log) => (
                          <div key={log.id} className="flex gap-4 pb-4 border-b">
                            <div className="flex-shrink-0">
                              {getEntityIcon(log.entity_type)}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className={getActionColor(log.action_type)}>
                                  {actionTypeLabels[log.action_type as keyof typeof actionTypeLabels] || log.action_type}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {entityTypeLabels[log.entity_type as keyof typeof entityTypeLabels] || log.entity_type}
                                </span>
                              </div>
                              <div className="text-sm">
                                <strong>{log.actor_name || 'Sistema'}</strong> realizou uma ação
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análises Detalhadas</CardTitle>
              <CardDescription>
                Relatórios e métricas avançadas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Análises detalhadas em desenvolvimento...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}