import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Edit, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { ConfiguracoesLayout } from './index';

interface AnamnesisTemplate {
  id: number;
  name: string;
  description: string;
  question_count: number;
  created_at: string;
  updated_at: string;
}

export default function ConfiguracoesAnamnesisPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    copyFromId: '',
    createFromScratch: true
  });

  // Buscar modelos de anamnese
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/anamneses'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/anamneses', {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Mutation para criar modelo
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/anamneses', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['/api/anamneses'] });
      setIsCreateDialogOpen(false);
      setCreateForm({ name: '', copyFromId: '', createFromScratch: true });
      // Navigate to the edit page of the newly created template
      setLocation(`/configuracoes/anamneses/${newTemplate.id}/editar`);
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      // Show error to user if needed
    }
  });

  const handleCreateTemplate = () => {
    if (!createForm.name.trim()) return;

    const payload = {
      name: createForm.name.trim(),
      description: '',
      copyFromId: createForm.createFromScratch ? null : createForm.copyFromId,
      questions: createForm.createFromScratch ? [] : undefined
    };

    createTemplateMutation.mutate(payload);
  };

  const handleEditTemplate = (templateId: number) => {
    setLocation(`/configuracoes/anamneses/${templateId}/editar`);
  };

  // Mutação para deletar template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`/api/anamneses/${templateId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to delete template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anamneses'] });
    }
  });

  const handleDeleteTemplate = (templateId: number, templateName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o modelo "${templateName}"? Esta ação não pode ser desfeita.`)) {
      deleteTemplateMutation.mutate(templateId);
    }
  };

  if (isLoading) {
    return (
      <ConfiguracoesLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando modelos...</p>
          </div>
        </div>
      </ConfiguracoesLayout>
    );
  }

  return (
    <ConfiguracoesLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">Modelos de anamnese</h1>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Criar modelo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar modelo de anamnese</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">* Nome da Anamnese</Label>
                <Input
                  id="template-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Anamnese de Odontopediatria"
                  className="mt-1"
                />
              </div>
              
              <RadioGroup 
                value={createForm.createFromScratch ? "scratch" : "copy"}
                onValueChange={(value) => setCreateForm(prev => ({ 
                  ...prev, 
                  createFromScratch: value === "scratch",
                  copyFromId: value === "scratch" ? '' : prev.copyFromId
                }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="copy" id="copy-template" />
                  <Label htmlFor="copy-template" className="flex items-center space-x-2">
                    <span>Copiar perguntas da</span>
                    <Select 
                      value={createForm.copyFromId} 
                      onValueChange={(value) => setCreateForm(prev => ({ ...prev, copyFromId: value }))}
                      disabled={createForm.createFromScratch}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Anamnese de Cirurgia e Impl..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template: AnamnesisTemplate) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scratch" id="create-scratch" />
                  <Label htmlFor="create-scratch">Criar um modelo do zero</Label>
                </div>
              </RadioGroup>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateTemplate}
                  disabled={!createForm.name.trim() || createTemplateMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {createTemplateMutation.isPending ? 'Criando...' : 'Continuar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {/* Templates List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Modelos Disponíveis ({templates.length})
              </h2>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-teal-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum modelo encontrado
                </h3>
                <p className="text-gray-500 mb-4">
                  Comece criando seu primeiro modelo de anamnese.
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Modelo
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template: AnamnesisTemplate) => (
                  <div key={template.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500">
                          {template.question_count} pergunta{template.question_count !== 1 ? 's' : ''} • 
                          Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditTemplate(template.id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                        className="text-red-600 hover:text-red-900 hover:border-red-300"
                        disabled={deleteTemplateMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Apagar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Section - Now Horizontal */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">
                  Dúvidas sobre as anamneses?
                </h3>
                <p className="text-sm text-gray-600">
                  Acesse nossos artigos e vídeos e aprenda mais sobre esta funcionalidade.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ConfiguracoesLayout>
  );
}