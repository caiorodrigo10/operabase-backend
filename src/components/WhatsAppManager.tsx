import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { WhatsAppNumber } from '@shared/schema';
import { MessageCircle, Plus, QrCode, Smartphone, Trash2, Power, PowerOff, User, RotateCcw } from 'lucide-react';

interface WhatsAppManagerProps {
  clinicId: number;
  userId: string;
}

export function WhatsAppManager({ clinicId, userId }: WhatsAppManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedQR, setSelectedQR] = useState<{ qrCode: string; instanceName: string; numberId?: number } | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  
  // QR Code timeout states
  const [qrExpired, setQrExpired] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // QR timeout functions
  const startQRTimeout = () => {
    console.log('⏰ Starting QR timeout countdown (30 seconds)');
    setQrExpired(false);
    setCountdown(30);
    
    const timer = setTimeout(() => {
      console.log('⚠️ QR Code expired after 30 seconds');
      setQrExpired(true);
    }, 30000);
    
    setTimeoutId(timer);
  };

  const resetQRTimeout = () => {
    console.log('🔄 Resetting QR timeout');
    setQrExpired(false);
    setCountdown(30);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    
    // Start new timeout if QR is still active
    if (selectedQR) {
      startQRTimeout();
    }
  };

  const clearQRTimeout = () => {
    console.log('🧹 Clearing QR timeout');
    setQrExpired(false);
    setCountdown(30);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

  // Query to fetch WhatsApp numbers with conditional polling
  const { data: whatsappNumbers = [], isLoading } = useQuery({
    queryKey: ['/api/whatsapp/numbers', clinicId],
    queryFn: () => fetch(`/api/whatsapp/numbers/${clinicId}`).then(res => res.json()) as Promise<WhatsAppNumber[]>,
    refetchInterval: pollingEnabled ? 3000 : false, // Poll every 3 seconds when enabled
    refetchIntervalInBackground: false
  });

  // Query to fetch clinic professionals
  const { data: professionals = [] } = useQuery({
    queryKey: [`/api/clinic/${clinicId}/professionals`],
  });

  // Ensure professionals is always an array
  const professionalsArray = Array.isArray(professionals) ? professionals : [];

  // Mutation to update professional assignment
  const updateProfessionalMutation = useMutation({
    mutationFn: ({ numberId, userId }: { numberId: number; userId: number | null }) =>
      apiRequest(`/api/whatsapp/numbers/${numberId}/professional`, 'PUT', { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/numbers', clinicId] });
      toast({
        title: "Profissional atualizado",
        description: "Atribuição do profissional foi atualizada com sucesso",
      });
    },
    onError: (error) => {
      console.error('Error updating professional assignment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a atribuição do profissional",
        variant: "destructive",
      });
    },
  });

  // Enable polling when there are connecting instances, disable when all connected/disconnected
  useEffect(() => {
    const hasConnectingInstances = whatsappNumbers.some(number => number.status === 'connecting');
    const shouldPoll = hasConnectingInstances || selectedQR !== null;
    console.log('🔄 Polling enabled:', shouldPoll, { hasConnectingInstances, hasSelectedQR: selectedQR !== null });
    setPollingEnabled(shouldPoll);
  }, [whatsappNumbers, selectedQR]);

  // QR countdown effect
  useEffect(() => {
    if (selectedQR && !qrExpired && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [selectedQR, qrExpired, countdown]);

  // Auto-close QR dialog when instance becomes connected
  useEffect(() => {
    console.log('🔍 Checking for connected instances:', {
      selectedQR,
      whatsappNumbers,
      hasSelectedQR: !!selectedQR,
      numbersCount: whatsappNumbers.length
    });
    
    if (selectedQR && whatsappNumbers.length > 0) {
      // Check by instance name if numberId is not available
      const connectedNumber = selectedQR.numberId 
        ? whatsappNumbers.find(number => number.id === selectedQR.numberId && number.status === 'open')
        : whatsappNumbers.find(number => number.instance_name === selectedQR.instanceName && number.status === 'open');
      
      console.log('🔍 Found connected number:', connectedNumber);
      
      if (connectedNumber) {
        console.log('✅ Closing QR dialog - WhatsApp connected!');
        
        // Clear timeout when connected
        clearQRTimeout();
        
        // Force refetch to update the UI immediately
        queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/numbers/${clinicId}`] });
        
        toast({
          title: "WhatsApp conectado!",
          description: `Número ${connectedNumber.phone_number || 'conectado'} conectado com sucesso`,
        });
        
        // Close dialog after brief delay to show success message
        setTimeout(() => {
          setSelectedQR(null);
        }, 1500);
      }
    }
  }, [whatsappNumbers, selectedQR, toast]);

  // Mutation to regenerate QR code
  const regenerateQRMutation = useMutation({
    mutationFn: () => apiRequest(`/api/whatsapp/regenerate-qr`, 'POST', { 
      instanceName: selectedQR?.instanceName 
    }),
    onSuccess: async (response) => {
      const data = await response.json();
      console.log('✅ QR Code regenerated successfully:', data);
      
      // Update existing QR code
      setSelectedQR(prev => prev ? {
        ...prev,
        qrCode: data.qrCode
      } : null);
      
      // Reset timeout states
      resetQRTimeout();
      
      toast({
        title: "QR Code atualizado",
        description: "Escaneie o novo código para conectar"
      });
    },
    onError: (error: any) => {
      console.error('❌ Error regenerating QR code:', error);
      toast({
        title: "Erro ao gerar novo QR",
        description: error.message || "Não foi possível gerar novo QR Code",
        variant: "destructive"
      });
    }
  });

  // Mutation to reconnect existing instance
  const reconnectMutation = useMutation({
    mutationFn: (instanceName: string) => apiRequest(`/api/whatsapp/reconnect`, 'POST', { 
      instanceName 
    }),
    onSuccess: async (response) => {
      const data = await response.json();
      console.log('✅ Instance reconnection initiated:', data);
      
      // Set up QR code for reconnection
      setSelectedQR({
        qrCode: data.qrCode,
        instanceName: data.instanceName,
        numberId: data.numberId,
        timestamp: data.timestamp
      });
      
      // Start QR timeout countdown
      resetQRTimeout();
      
      // Invalidate query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/numbers/${clinicId}`] });
      
      toast({
        title: "Reconectando WhatsApp",
        description: `Escaneie o QR Code para reconectar o número ${data.previousPhone || 'anterior'}`
      });
    },
    onError: (error: any) => {
      console.error('❌ Error reconnecting WhatsApp:', error);
      toast({
        title: "Erro na reconexão",
        description: error.message || "Não foi possível iniciar a reconexão",
        variant: "destructive"
      });
    }
  });

  // Mutation to start connection
  const startConnectionMutation = useMutation({
    mutationFn: () => apiRequest(`/api/whatsapp/connect`, 'POST', { clinicId, userId: parseInt(userId) }),
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Conexão iniciada",
        description: "Escaneie o QR Code para conectar seu WhatsApp"
      });
      
      // Show QR code dialog and start timeout
      setSelectedQR({
        qrCode: data.qrCode,
        instanceName: data.instanceName,
        numberId: data.id
      });
      
      // Start QR timeout
      startQRTimeout();
      
      // Refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/numbers', clinicId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na conexão",
        description: error.message || "Não foi possível iniciar a conexão",
        variant: "destructive"
      });
    }
  });

  // Mutation to disconnect number
  const disconnectMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/whatsapp/disconnect/${id}`, 'POST'),
    onSuccess: () => {
      toast({
        title: "WhatsApp desconectado",
        description: "Número desconectado com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/numbers', clinicId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desconectar",
        description: error.message || "Não foi possível desconectar o número",
        variant: "destructive"
      });
    }
  });

  // Mutation to delete number
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/whatsapp/numbers/${id}`, 'DELETE'),
    onSuccess: async (response) => {
      const data = await response.json();
      
      // Base success message
      let description = "Número WhatsApp removido com sucesso";
      
      // Check for Livia warnings
      if (data.warnings && data.warnings.length > 0) {
        description = data.warnings.join(". ");
        
        // Show additional toast for Livia warning
        setTimeout(() => {
          toast({
            title: "Atenção - Lívia desvinculada",
            description: "Configure um novo número WhatsApp para a Lívia nas configurações",
            variant: "destructive"
          });
        }, 2000);
      }
      
      toast({
        title: "Número removido",
        description
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/numbers', clinicId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover",
        description: error.message || "Não foi possível remover o número",
        variant: "destructive"
      });
    }
  });

  // Mutation to cleanup unclaimed instances
  const cleanupUnclaimedMutation = useMutation({
    mutationFn: (instanceName: string) => apiRequest(`/api/whatsapp/cleanup/${instanceName}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/numbers', clinicId] });
    },
    onError: (error: any) => {
      console.error('Failed to cleanup unclaimed instance:', error);
      // Don't show error toast for cleanup failures
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-green-500"><Power className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'connecting':
        return <Badge variant="secondary"><QrCode className="w-3 h-3 mr-1" />Conectando</Badge>;
      case 'close':
      case 'disconnected':
        return <Badge variant="destructive"><PowerOff className="w-3 h-3 mr-1" />Desconectado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return 'Não identificado';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              WhatsApp Business
            </CardTitle>
            <CardDescription>
              Gerencie seus números WhatsApp conectados à clínica
            </CardDescription>
          </div>
          <Button 
            onClick={() => startConnectionMutation.mutate()}
            disabled={startConnectionMutation.isPending}
            className="flex items-center gap-2 bg-[#0f766e] hover:bg-[#0f766e]/90"
          >
            <Plus className="w-4 h-4" />
            Adicionar Número
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {!isLoading && whatsappNumbers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum número conectado</p>
            <p className="text-sm">Clique em "Adicionar Número" para conectar seu WhatsApp</p>
          </div>
        )}

        {whatsappNumbers.length > 0 && (
          <div className="space-y-4">
            {whatsappNumbers.map((number) => (
              <div key={number.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Smartphone className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-medium">{formatPhoneNumber(number.phone_number)}</p>
                      <p className="text-sm text-muted-foreground">
                        Conectado em: {number.connected_at 
                          ? new Date(number.connected_at).toLocaleString() 
                          : 'Não conectado'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(number.status)}
                    
                    {number.status === 'disconnected' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          console.log('🔄 Reconnecting instance:', number.instance_name);
                          reconnectMutation.mutate(number.instance_name);
                        }}
                        disabled={reconnectMutation.isPending}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {reconnectMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    
                    {number.status === 'open' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <PowerOff className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Desconectar WhatsApp</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja desconectar este número? Você precisará escanear o QR Code novamente para reconectar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => disconnectMutation.mutate(number.id)}
                              disabled={disconnectMutation.isPending}
                            >
                              Desconectar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover número</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover este número WhatsApp? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteMutation.mutate(number.id)}
                            disabled={deleteMutation.isPending}
                            className="bg-[#0f766e] hover:bg-[#0d5a56]"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                
              </div>
            ))}
          </div>
        )}

        {/* QR Code Dialog */}
        <Dialog open={!!selectedQR} onOpenChange={(open) => {
          if (!open && selectedQR) {
            // Clear timeout when closing dialog
            clearQRTimeout();
            
            // Check if this instance was never connected, and if so, clean it up
            setTimeout(() => {
              const wasConnected = whatsappNumbers.some(num => 
                num.instance_name === selectedQR.instanceName && num.status === 'connected'
              );
              
              if (!wasConnected) {
                console.log('🧹 Cleaning up unclaimed QR instance:', selectedQR.instanceName);
                cleanupUnclaimedMutation.mutate(selectedQR.instanceName);
              }
            }, 1000); // Give a second for any pending webhook updates
          }
          setSelectedQR(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedQR?.numberId ? 'Reconectar WhatsApp' : 'Conectar WhatsApp'}
              </DialogTitle>
              <DialogDescription>
                {selectedQR?.numberId 
                  ? 'Escaneie o QR Code com seu WhatsApp para reconectar este número'
                  : 'Escaneie o QR Code com seu WhatsApp para conectar'
                }
              </DialogDescription>
            </DialogHeader>
            
            {selectedQR && (
              <div className="flex flex-col items-center space-y-4">
                {/* Connection Status Indicator */}
                {(() => {
                  const connectedNumber = selectedQR.numberId 
                    ? whatsappNumbers.find(number => number.id === selectedQR.numberId && number.status === 'open')
                    : whatsappNumbers.find(number => number.instance_name === selectedQR.instanceName && number.status === 'open');
                  
                  if (connectedNumber) {
                    return (
                      <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg w-full">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div className="text-green-700 font-medium">
                          Conectado! Número: {connectedNumber.phone_number}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center space-x-2 p-4 bg-blue-50 border border-blue-200 rounded-lg w-full">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="text-blue-700 font-medium">
                          Aguardando conexão...
                        </div>
                      </div>
                    );
                  }
                })()}

                {/* QR Code Container with expiration overlay */}
                <div className="relative p-4 bg-white rounded-lg">
                  <img 
                    src={selectedQR.qrCode} 
                    alt="QR Code WhatsApp" 
                    className={`w-64 h-64 ${qrExpired ? 'filter blur-sm opacity-50' : ''}`}
                  />
                  
                  {/* Expiration overlay with regenerate button */}
                  {qrExpired && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                      <div className="text-center text-white">
                        <p className="mb-4 font-medium">QR Code expirado</p>
                        <Button 
                          onClick={() => {
                            console.log('🔄 User clicked regenerate QR button');
                            regenerateQRMutation.mutate();
                          }}
                          disabled={regenerateQRMutation.isPending}
                          className="bg-white text-black hover:bg-gray-100"
                        >
                          {regenerateQRMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 mr-2 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                              Gerando...
                            </>
                          ) : (
                            'Gerar Novo QR Code'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Countdown and instructions */}
                <div className="text-center text-sm text-muted-foreground">
                  {!qrExpired && (
                    <div className="mb-2">
                      <p className={`font-medium ${countdown <= 10 ? 'text-orange-500' : 'text-blue-600'}`}>
                        Código válido por: {countdown}s
                      </p>
                      {countdown <= 10 && (
                        <p className="text-orange-500 text-xs">
                          Código expirando em breve...
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <p>1. Abra o WhatsApp no seu celular</p>
                    <p>2. Toque em Menu → Dispositivos conectados</p>
                    <p>3. Toque em "Conectar um dispositivo"</p>
                    <p>4. Aponte seu celular para esta tela para capturar o código</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}