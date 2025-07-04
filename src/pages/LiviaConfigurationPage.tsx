import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RefreshCw, Users, BookOpen, MessageSquare, Settings, Phone, Brain, Clock, UserCheck, Shield, Bot, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { 
  useLiviaConfiguration, 
  useWhatsAppNumbers, 
  useProfessionals, 
  useKnowledgeBases,
  useCreateLiviaConfiguration,
  useUpdateLiviaConfiguration
} from '@/hooks/useLiviaConfig';

export default function LiviaConfigurationPage() {
  const [isActive, setIsActive] = useState(true);
  const [generalPrompt, setGeneralPrompt] = useState('');
  const [whatsappNumberId, setWhatsappNumberId] = useState<string>('none');
  const [offDuration, setOffDuration] = useState<number>(30);
  const [offUnit, setOffUnit] = useState<'minutos' | 'horas'>('minutos');
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<number[]>([]);
  const [connectedKnowledgeBaseIds, setConnectedKnowledgeBaseIds] = useState<number[]>([]);

  // Queries
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useLiviaConfiguration();
  const { data: whatsappNumbers, isLoading: whatsappLoading } = useWhatsAppNumbers();
  const { data: professionals, isLoading: professionalsLoading } = useProfessionals();
  const { data: knowledgeBases, isLoading: knowledgeBasesLoading } = useKnowledgeBases();

  // Mutations
  const createMutation = useCreateLiviaConfiguration();
  const updateMutation = useUpdateLiviaConfiguration();

  // Debug logs
  const debugData = {
    config: config || {},
    whatsappNumbers: whatsappNumbers || {},
    professionals: professionals || {},
    knowledgeBases: knowledgeBases || {},
    isLoading: {
      configLoading,
      whatsappLoading,
      professionalsLoading,
      knowledgeBasesLoading
    }
  };

  console.log('🔍 Livia Config Debug - Data:', debugData);

  // Load config data into form when available
  useEffect(() => {
    if (config) {
      setIsActive(config.is_active ?? true);
      setGeneralPrompt(config.general_prompt || '');
      setWhatsappNumberId(config.whatsapp_number_id?.toString() || 'none');
      setOffDuration(config.off_duration || 30);
      setOffUnit(config.off_unit || 'minutos');
      setSelectedProfessionalIds(config.selected_professional_ids || []);
      setConnectedKnowledgeBaseIds(config.connected_knowledge_base_ids || []);
    }
  }, [config]);

  const handleSave = async () => {
    const configData = {
      clinic_id: 1, // Adicionar clinic_id obrigatório
      general_prompt: generalPrompt,
      whatsapp_number_id: whatsappNumberId && whatsappNumberId !== 'none' ? parseInt(whatsappNumberId) : null,
      off_duration: offDuration,
      off_unit: offUnit,
      selected_professional_ids: selectedProfessionalIds,
      connected_knowledge_base_ids: connectedKnowledgeBaseIds,
      is_active: isActive,
    };

    try {
      if (config?.id) {
        await updateMutation.mutateAsync(configData);
      } else {
        await createMutation.mutateAsync(configData);
      }
      refetchConfig();
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  // Debug loading states
  console.log('🔍 Loading states:', {
    configLoading,
    whatsappLoading,
    professionalsLoading,
    knowledgeBasesLoading
  });

  const isLoading = configLoading || whatsappLoading || professionalsLoading || knowledgeBasesLoading;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Carregando configurações da Lívia...</p>
          </div>
        </div>
      </div>
    );
  }

  // Safe array conversion for rendering
  const professionalsList = Array.isArray(professionals) ? professionals : [];
  const knowledgeBasesList = Array.isArray(knowledgeBases) ? knowledgeBases : [];
  const whatsappNumbersList = Array.isArray(whatsappNumbers) ? whatsappNumbers : [];

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Back Button */}
      <div className="mb-4">
        <Link href="/trabalhadores-digitais">
          <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-white/80">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuração da Lívia</h1>
            <p className="text-muted-foreground">Configure sua assistente virtual inteligente</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium">{isActive ? 'Ativa' : 'Inativa'}</span>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configuração
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card className="border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <Label htmlFor="is_active" className="text-base font-medium">Status da Lívia</Label>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
            <Badge 
              variant={isActive ? "default" : "secondary"} 
              className={isActive ? "bg-green-100 text-green-800 border-green-200" : ""}
            >
              {isActive ? 'Assistente Ativa' : 'Assistente Desativada'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuração Geral */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <CardTitle>Prompt Geral</CardTitle>
            </div>
            <CardDescription>
              Defina a personalidade e comportamento da Lívia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="general_prompt" className="text-sm font-medium">Instruções para a Assistente</Label>
              <Textarea
                id="general_prompt"
                placeholder="Você é Lívia, assistente virtual especializada da nossa clínica médica..."
                value={generalPrompt}
                onChange={(e) => setGeneralPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Estas instruções definem como a Lívia se comportará em todas as conversas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Integração WhatsApp */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              <CardTitle>Integração WhatsApp</CardTitle>
            </div>
            <CardDescription>
              Conecte a Lívia a um número do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_number" className="text-sm font-medium">Número do WhatsApp</Label>
              <Select value={whatsappNumberId} onValueChange={setWhatsappNumberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um número conectado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum número selecionado</SelectItem>
                  {whatsappNumbersList.map((number: any) => (
                    <SelectItem key={number.id} value={number.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${number.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {number.phone_number || 'Número não identificado'}
                        <Badge variant="outline" className="ml-auto">
                          {number.status === 'open' ? 'Conectado' : 'Desconectado'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {whatsappNumbersList.length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  Nenhum número WhatsApp conectado encontrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuração de Ausência */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <CardTitle>Configuração de Ausência</CardTitle>
            </div>
            <CardDescription>
              Tempo que a Lívia fica offline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="off_duration" className="text-sm font-medium">Duração</Label>
                <Input
                  id="off_duration"
                  type="number"
                  value={offDuration}
                  onChange={(e) => setOffDuration(parseInt(e.target.value) || 30)}
                  min="1"
                  max="1440"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="off_unit" className="text-sm font-medium">Unidade</Label>
                <Select value={offUnit} onValueChange={(value: 'minutos' | 'horas') => setOffUnit(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutos">Minutos</SelectItem>
                    <SelectItem value="horas">Horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A Lívia ficará offline por {offDuration} {offUnit} quando solicitado
            </p>
          </CardContent>
        </Card>

        {/* Profissionais Atribuídos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <CardTitle>Profissionais Atribuídos</CardTitle>
            </div>
            <CardDescription>
              Selecione os profissionais que a Lívia pode referenciar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {professionalsList.map((professional: any) => (
                <div key={professional.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="font-medium">{professional.name}</p>
                      <p className="text-sm text-muted-foreground">{professional.email}</p>
                    </div>
                  </div>
                  <Switch
                    checked={selectedProfessionalIds.includes(professional.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedProfessionalIds([...selectedProfessionalIds, professional.id]);
                      } else {
                        setSelectedProfessionalIds(selectedProfessionalIds.filter(id => id !== professional.id));
                      }
                    }}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
              ))}
              {professionalsList.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum profissional encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bases de Conhecimento */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-emerald-600" />
              <CardTitle>Bases de Conhecimento</CardTitle>
            </div>
            <CardDescription>
              Conecte bases de conhecimento para a Lívia consultar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {knowledgeBasesList.map((kb: any) => (
                <div key={kb.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="font-medium">{kb.name}</p>
                      <p className="text-sm text-muted-foreground">{kb.description}</p>
                      {kb.documentCount !== undefined && (
                        <Badge variant="outline" className="mt-1">
                          {kb.documentCount} documentos
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={connectedKnowledgeBaseIds.includes(kb.id)}
                    onCheckedChange={async (checked) => {
                      const newConnectedIds = checked 
                        ? [...connectedKnowledgeBaseIds, kb.id]
                        : connectedKnowledgeBaseIds.filter(id => id !== kb.id);
                      
                      setConnectedKnowledgeBaseIds(newConnectedIds);
                      
                      // Auto-salvar quando alterar bases de conhecimento
                      const configData = {
                        clinic_id: 1, // Adicionar clinic_id obrigatório
                        general_prompt: generalPrompt,
                        whatsapp_number_id: whatsappNumberId && whatsappNumberId !== 'none' ? parseInt(whatsappNumberId) : null,
                        off_duration: offDuration,
                        off_unit: offUnit,
                        selected_professional_ids: selectedProfessionalIds,
                        connected_knowledge_base_ids: newConnectedIds,
                        is_active: isActive,
                      };

                      try {
                        if (config?.id) {
                          await updateMutation.mutateAsync(configData);
                        } else {
                          await createMutation.mutateAsync(configData);
                        }
                        refetchConfig();
                      } catch (error) {
                        console.error('Error auto-saving configuration:', error);
                        // Reverter mudança se falhar
                        setConnectedKnowledgeBaseIds(connectedKnowledgeBaseIds);
                      }
                    }}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                </div>
              ))}
              {knowledgeBasesList.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma base de conhecimento encontrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Settings className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium">Resumo da Configuração</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedProfessionalIds.length} profissionais selecionados • {connectedKnowledgeBaseIds.length} bases de conhecimento conectadas
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={refetchConfig} className="border-blue-200 hover:bg-blue-100">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}