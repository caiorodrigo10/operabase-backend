import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Trash2, Settings, AlertCircle, RefreshCw } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppManager } from '@/components/WhatsAppManager';
import { useAuth } from '@/hooks/useAuth';
import { ConfiguracoesLayout } from './index';

export default function IntegracoesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [syncPreference, setSyncPreference] = useState("one-way");
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<number | null>(null);
  const [showLinkedCalendarDialog, setShowLinkedCalendarDialog] = useState(false);
  const [showConflictCalendarDialog, setShowConflictCalendarDialog] = useState(false);

  // Calendar integrations query
  const { data: calendarIntegrationsRaw, isLoading: calendarIntegrationsLoading } = useQuery({
    queryKey: ['/api/calendar/integrations'],
    staleTime: 30000,
  });

  const typedCalendarIntegrations = (calendarIntegrationsRaw as any[]) || [];

  // Calendar mutations
  const connectCalendarMutation = useMutation({
    mutationFn: () => apiRequest('/api/calendar/connect/google', { method: 'POST' }),
    onSuccess: (data: any) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      console.error('Calendar connection failed:', error);
      toast({
        title: "Erro na conexão",
        description: "Não foi possível conectar com o Google Calendar. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const syncCalendarMutation = useMutation({
    mutationFn: (integrationId: number) => 
      apiRequest(`/api/calendar/integrations/${integrationId}/sync`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/integrations'] });
      toast({
        title: "Sincronização iniciada",
        description: "A sincronização do calendário foi iniciada com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Calendar sync failed:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar o calendário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteCalendarMutation = useMutation({
    mutationFn: (integrationId: number) => 
      apiRequest(`/api/calendar/integrations/${integrationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/integrations'] });
      toast({
        title: "Calendário desconectado",
        description: "A integração do calendário foi removida com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Calendar deletion failed:', error);
      toast({
        title: "Erro ao desconectar",
        description: "Não foi possível remover a integração. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const syncFromGoogleMutation = useMutation({
    mutationFn: () => apiRequest('/api/calendar/sync-from-google', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Sincronização concluída",
        description: "Eventos importados do Google Calendar com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Sync from Google failed:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível importar eventos do Google Calendar.",
        variant: "destructive",
      });
    },
  });

  const forceRefreshMutation = useMutation({
    mutationFn: () => apiRequest('/api/calendar/force-refresh', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/integrations'] });
      toast({
        title: "Atualização concluída",
        description: "Calendário atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Force refresh failed:', error);
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar o calendário.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleSyncCalendar = (integrationId: number) => {
    syncCalendarMutation.mutate(integrationId);
  };

  const handleDisconnectCalendar = (integrationId: number) => {
    deleteCalendarMutation.mutate(integrationId);
  };

  const handleEditSyncPreferences = (integrationId: number, currentPreference: string) => {
    setSelectedIntegrationId(integrationId);
    setSyncPreference(currentPreference || "one-way");
    setShowSyncDialog(true);
  };

  const handleOpenLinkedCalendarDialog = (integrationId: number) => {
    setSelectedIntegrationId(integrationId);
    setShowLinkedCalendarDialog(true);
  };

  const handleOpenConflictCalendarDialog = (integrationId: number) => {
    setSelectedIntegrationId(integrationId);
    setShowConflictCalendarDialog(true);
  };

  return (
    <ConfiguracoesLayout>
      <div className="space-y-6">
      {/* WhatsApp Manager */}
      <WhatsAppManager clinicId={1} userId={user?.id || '5'} />

      {/* Calendar Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Integrações de Calendário</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Conecte suas contas de calendário para sincronização automática
              </p>
            </div>
            <Button 
              onClick={() => setShowProviderDialog(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Conectar Calendário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {typedCalendarIntegrations.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum calendário conectado</h3>
                <p className="text-slate-600 mb-4">
                  Conecte seu Google Calendar para sincronizar agendamentos automaticamente.
                </p>
                <Button 
                  onClick={() => setShowProviderDialog(true)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Conectar Primeiro Calendário
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {typedCalendarIntegrations.map((integration: any) => (
                  <div key={integration.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-slate-800">Google Calendar</h3>
                            <Badge variant={integration.is_active ? "default" : "secondary"}>
                              {integration.is_active ? "Conectado" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">{integration.email}</p>
                          {integration.last_sync && (
                            <p className="text-xs text-slate-500">
                              Última sinc: {new Date(integration.last_sync).toLocaleString('pt-BR')}
                            </p>
                          )}
                          {integration.sync_errors && (
                            <p className="text-xs text-red-500">
                              Erro: {integration.sync_errors}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncCalendar(integration.id)}
                          disabled={syncCalendarMutation.isPending}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${syncCalendarMutation.isPending ? 'animate-spin' : ''}`} />
                          Sincronizar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSyncPreferences(integration.id, integration.sync_preference)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configurar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnectCalendar(integration.id)}
                          className="text-slate-500 hover:text-red-600"
                          disabled={deleteCalendarMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {integration.is_active && (
                      <div className="mt-4 space-y-4">
                        <Separator />
                        
                        <div>
                          <h4 className="font-medium text-slate-800 mb-3">Configuração do Calendário</h4>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                                  <Calendar className="w-5 h-5 text-teal-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">Calendário Vinculado</p>
                                  <p className="text-xs text-slate-600">Sincronizar agendamentos com seu calendário vinculado</p>
                                  {integration.calendar_id && (
                                    <div className="mt-1 space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                                        <span className="text-xs font-medium text-teal-700">{integration.email}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Calendar className="w-3 h-3 text-slate-500" />
                                        <span className="text-xs text-slate-600">Calendário Principal</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {integration.calendar_id && (
                                  <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200">
                                    Calendário Vinculado
                                  </Badge>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleOpenLinkedCalendarDialog(integration.id)}
                                >
                                  {integration.calendar_id ? "Editar" : "Configurar"}
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <AlertCircle className="w-5 h-5 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">Calendários de Conflito</p>
                                  <p className="text-xs text-slate-600">Adicionar calendários adicionais para verificar conflitos de agendamento duplo</p>
                                  {integration.calendar_id && (
                                    <div className="mt-1 flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                                      <span className="text-xs font-medium text-teal-700">{integration.email}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {integration.calendar_id && (
                                  <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                                    Detectando Conflitos
                                  </Badge>
                                )}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleOpenConflictCalendarDialog(integration.id)}
                                >
                                  Editar
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div className="flex items-center space-x-3">
                                <Settings className="w-5 h-5 text-slate-600" />
                                <div>
                                  <p className="font-medium text-sm">Preferências de Sincronização</p>
                                  <p className="text-xs text-slate-600">Configurar como sincronizar eventos</p>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditSyncPreferences(integration.id, integration.sync_preference)}
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Configurar
                              </Button>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div className="flex items-center space-x-3">
                                <RefreshCw className="w-5 h-5 text-green-600" />
                                <div>
                                  <p className="font-medium text-sm">Atualizar Eventos</p>
                                  <p className="text-xs text-slate-600">Forçar sincronização imediata com Google Calendar</p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => syncFromGoogleMutation.mutate()}
                                  disabled={syncFromGoogleMutation.isPending}
                                >
                                  {syncFromGoogleMutation.isPending ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                  )}
                                  Sincronizar
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => forceRefreshMutation.mutate()}
                                  disabled={forceRefreshMutation.isPending}
                                >
                                  {forceRefreshMutation.isPending ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" className="text-[#0f766e] border-teal-200 hover:bg-teal-50">
                            <Settings className="w-4 h-4 mr-2" />
                            Configurações Avançadas
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Provider Selection Dialog */}
      <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar Calendário</DialogTitle>
            <DialogDescription>
              Escolha um provedor de calendário para conectar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div 
              className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              onClick={() => {
                setShowProviderDialog(false);
                connectCalendarMutation.mutate();
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium">Google Calendar</p>
                  <p className="text-sm text-slate-600">Conectar com Google Calendar</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync Preferences Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preferências de Sincronização</DialogTitle>
            <DialogDescription>
              Configure como os eventos devem ser sincronizados entre os calendários
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <RadioGroup value={syncPreference} onValueChange={setSyncPreference}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="one-way" id="one-way" />
                <Label htmlFor="one-way">Sincronização unidirecional (TaskMed → Calendário)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="two-way" id="two-way" />
                <Label htmlFor="two-way">Sincronização bidirecional</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => setShowSyncDialog(false)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </ConfiguracoesLayout>
  );
}