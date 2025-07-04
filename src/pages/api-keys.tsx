import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Plus, Trash2, RotateCcw, Activity, Copy } from 'lucide-react';
import { format } from 'date-fns';

interface ApiKey {
  id: number;
  key_name: string;
  api_key_preview: string;
  is_active: boolean;
  permissions: string[];
  last_used_at: string | null;
  usage_count: number;
  expires_at: string | null;
  created_at: string;
}

interface NewApiKeyForm {
  key_name: string;
  permissions: string[];
  expires_at?: string;
}

export default function ApiKeysPage() {
  const [selectedClinicId] = useState(1); // For now, using clinic 1
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newKeyForm, setNewKeyForm] = useState<NewApiKeyForm>({
    key_name: '',
    permissions: ['read', 'write']
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch API Keys
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys', selectedClinicId],
    queryFn: () => apiRequest(`/api/clinic/${selectedClinicId}/api-keys`)
  });

  // Create API Key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: (data: NewApiKeyForm) => 
      apiRequest(`/api/clinic/${selectedClinicId}/api-keys`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (result) => {
      setShowApiKey(result.data.api_key);
      setShowCreateModal(false);
      setNewKeyForm({ key_name: '', permissions: ['read', 'write'] });
      queryClient.invalidateQueries({ queryKey: ['api-keys', selectedClinicId] });
      toast({
        title: "API Key criada com sucesso",
        description: "Copie a chave agora, ela não será mostrada novamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar API Key",
        description: error.message || "Erro interno do servidor",
        variant: "destructive"
      });
    }
  });

  // Revoke API Key mutation
  const revokeApiKeyMutation = useMutation({
    mutationFn: (keyId: number) => 
      apiRequest(`/api/clinic/${selectedClinicId}/api-keys/${keyId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', selectedClinicId] });
      toast({
        title: "API Key revogada",
        description: "A API Key foi desativada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao revogar API Key",
        description: error.message || "Erro interno do servidor",
        variant: "destructive"
      });
    }
  });

  // Renew API Key mutation
  const renewApiKeyMutation = useMutation({
    mutationFn: (keyId: number) => 
      apiRequest(`/api/clinic/${selectedClinicId}/api-keys/${keyId}/renew`, {
        method: 'POST'
      }),
    onSuccess: (result) => {
      setShowApiKey(result.data.api_key);
      queryClient.invalidateQueries({ queryKey: ['api-keys', selectedClinicId] });
      toast({
        title: "API Key renovada",
        description: "Nova chave gerada. Atualize suas integrações.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao renovar API Key",
        description: error.message || "Erro interno do servidor",
        variant: "destructive"
      });
    }
  });

  const handleCreateApiKey = () => {
    if (!newKeyForm.key_name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, forneça um nome para a API Key",
        variant: "destructive"
      });
      return;
    }
    createApiKeyMutation.mutate(newKeyForm);
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setNewKeyForm(prev => ({
        ...prev,
        permissions: [...prev.permissions, permission]
      }));
    } else {
      setNewKeyForm(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permission)
      }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "API Key copiada para a área de transferência",
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-gray-600">Gerencie as chaves de acesso para integrações N8N</p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova API Key</DialogTitle>
              <DialogDescription>
                Crie uma nova chave de acesso para integração com N8N e outras automações.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="key_name">Nome da API Key</Label>
                <Input
                  id="key_name"
                  value={newKeyForm.key_name}
                  onChange={(e) => setNewKeyForm(prev => ({ ...prev, key_name: e.target.value }))}
                  placeholder="Ex: N8N Production, WhatsApp Bot, etc."
                />
              </div>
              
              <div>
                <Label>Permissões</Label>
                <div className="space-y-2 mt-2">
                  {['read', 'write', 'admin'].map(permission => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission}
                        checked={newKeyForm.permissions.includes(permission)}
                        onCheckedChange={(checked) => handlePermissionChange(permission, checked as boolean)}
                      />
                      <Label htmlFor={permission} className="capitalize">
                        {permission === 'read' && 'Leitura (consultas, listagens)'}
                        {permission === 'write' && 'Escrita (criar, atualizar)'}
                        {permission === 'admin' && 'Administração (acesso total)'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateApiKey}
                disabled={createApiKeyMutation.isPending}
              >
                {createApiKeyMutation.isPending ? 'Criando...' : 'Criar API Key'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* API Key Display Modal */}
      {showApiKey && (
        <Dialog open={!!showApiKey} onOpenChange={() => setShowApiKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Criada</DialogTitle>
              <DialogDescription>
                Copie e guarde esta chave em local seguro. Ela não será mostrada novamente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <code className="flex-1 text-sm font-mono">{showApiKey}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(showApiKey)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={() => setShowApiKey(null)}>
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chaves de API Ativas</CardTitle>
          <CardDescription>
            Lista de todas as API Keys criadas para esta clínica
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : !apiKeys?.data?.length ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma API Key encontrada</p>
              <p className="text-sm text-gray-400 mt-2">
                Crie sua primeira API Key para começar a usar integrações
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Key (Prévia)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Último Uso</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.data.map((key: ApiKey) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.key_name}</TableCell>
                    <TableCell className="font-mono text-sm">{key.api_key_preview}</TableCell>
                    <TableCell>
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {key.permissions.map(permission => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.last_used_at 
                        ? format(new Date(key.last_used_at), 'dd/MM/yyyy HH:mm')
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell>{key.usage_count}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => renewApiKeyMutation.mutate(key.id)}
                          disabled={renewApiKeyMutation.isPending}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => revokeApiKeyMutation.mutate(key.id)}
                          disabled={revokeApiKeyMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Documentation Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Documentação de Uso</CardTitle>
          <CardDescription>
            Como usar as API Keys em integrações N8N
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Autenticação no N8N</h4>
              <div className="bg-gray-100 p-3 rounded-lg">
                <code className="text-sm">
                  Authorization: Bearer tk_clinic_1_sua_api_key_aqui
                </code>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Endpoints Disponíveis</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>POST /api/mcp/appointments/availability - Verificar disponibilidade (apenas user_id necessário)</li>
                <li>POST /api/mcp/appointments/create - Criar consulta</li>
                <li>PUT /api/mcp/appointments/status - Atualizar status</li>
                <li>PUT /api/mcp/appointments/cancel - Cancelar consulta</li>
                <li>POST /api/mcp/chat - Chat com IA MARA</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Formato da API Key</h4>
              <p className="text-sm text-gray-600">
                <code>tk_clinic_[CLINIC_ID]_[32_RANDOM_CHARS]</code>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                O clinic_id é extraído automaticamente da API Key para isolamento de dados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}