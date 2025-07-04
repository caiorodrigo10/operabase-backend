import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bot, 
  Clock, 
  MessageSquare, 
  Users, 
  Phone,
  BookOpen,
  Save,
  TestTube,
  ChevronLeft,
  Plus,
  X,
  Search,
  Info,
  Settings,
  Zap
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Mock data for professionals
const mockProfessionals = [
  {
    id: 1,
    name: "Dr. Ana Silva",
    avatar: "/api/placeholder/40/40",
    specialty: "Psicologia",
    initials: "AS"
  },
  {
    id: 2,
    name: "Dr. Carlos Santos",
    avatar: "/api/placeholder/40/40",
    specialty: "Psiquiatria",
    initials: "CS"
  },
  {
    id: 3,
    name: "Dra. Marina Costa",
    avatar: "/api/placeholder/40/40",
    specialty: "Neurologia",
    initials: "MC"
  },
  {
    id: 4,
    name: "Dr. Roberto Lima",
    avatar: "/api/placeholder/40/40",
    specialty: "Cardiologia",
    initials: "RL"
  }
];

// Mock data for WhatsApp numbers
const mockWhatsAppNumbers = [
  { id: 1, number: "+55 11 99999-0001", label: "Recepção Principal", status: "connected" },
  { id: 2, number: "+55 11 99999-0002", label: "Atendimento Urgência", status: "connected" },
  { id: 3, number: "+55 11 99999-0003", label: "Agendamentos", status: "disconnected" }
];

// Mock data for knowledge bases
const mockKnowledgeBases = [
  {
    id: 1,
    name: "Protocolos Clínicos",
    description: "Procedimentos padrão e diretrizes médicas",
    documentsCount: 45,
    connected: true
  },
  {
    id: 2,
    name: "FAQ Pacientes",
    description: "Perguntas frequentes e respostas",
    documentsCount: 128,
    connected: true
  },
  {
    id: 3,
    name: "Base Medicamentos",
    description: "Informações sobre medicamentos e interações",
    documentsCount: 89,
    connected: false
  }
];

export function LiviaConfig() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingPrompt, setIsTestingPrompt] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Configuration state
  const [config, setConfig] = useState({
    generalPrompt: `Você é Livia, assistente virtual especializada da nossa clínica médica. Seja sempre empática, profissional e prestativa.

Suas principais responsabilidades:
- Responder dúvidas sobre procedimentos e horários
- Auxiliar no agendamento de consultas
- Fornecer informações gerais sobre a clínica
- Identificar situações de urgência

Mantenha um tom acolhedor e use linguagem simples. Em caso de dúvidas médicas específicas, sempre oriente a procurar um profissional.`,
    
    whatsappNumber: "1",
    
    offTime: {
      duration: 30,
      unit: "minutos"
    },
    
    selectedProfessionals: [1, 2],
    
    connectedKnowledgeBases: [1, 2]
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSaving(false);
    toast({
      title: "Configurações salvas!",
      description: "As configurações da Livia foram atualizadas com sucesso.",
    });
  };

  const handleTestPrompt = async () => {
    setIsTestingPrompt(true);
    // Simulate prompt testing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTestingPrompt(false);
    toast({
      title: "Teste concluído",
      description: "O prompt foi testado e está funcionando corretamente.",
    });
  };

  const toggleProfessional = (professionalId: number) => {
    setConfig(prev => ({
      ...prev,
      selectedProfessionals: prev.selectedProfessionals.includes(professionalId)
        ? prev.selectedProfessionals.filter(id => id !== professionalId)
        : [...prev.selectedProfessionals, professionalId]
    }));
  };

  const toggleKnowledgeBase = (baseId: number) => {
    setConfig(prev => ({
      ...prev,
      connectedKnowledgeBases: prev.connectedKnowledgeBases.includes(baseId)
        ? prev.connectedKnowledgeBases.filter(id => id !== baseId)
        : [...prev.connectedKnowledgeBases, baseId]
    }));
  };

  const filteredProfessionals = mockProfessionals.filter(prof =>
    prof.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        {/* Header */}
        <div className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Link href="/trabalhadores-digitais">
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full bg-white/70 hover:bg-white shadow-sm">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Configurações da Livia
                </h1>
                <p className="text-gray-600 mt-1">
                  Configure o comportamento da sua assistente virtual
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6"
            >
              {isSaving ? (
                <>
                  <Settings className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>

          {/* Configuration Sections */}
          <div className="space-y-8 max-w-6xl mx-auto">
            
            {/* General AI Prompt */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-purple-600" />
                  </div>
                  Prompt Geral da IA
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Configure o comportamento, personalidade e instruções principais da Livia
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="generalPrompt" className="text-sm font-medium">
                    Instruções para a IA
                  </Label>
                  <Textarea
                    id="generalPrompt"
                    value={config.generalPrompt}
                    onChange={(e) => setConfig(prev => ({ ...prev, generalPrompt: e.target.value }))}
                    placeholder="Digite as instruções de comportamento, tom de voz, restrições e ações esperadas da IA..."
                    className="min-h-32 mt-2 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Exemplo: "Seja sempre empática e profissional. Use linguagem simples e acolhedora..."
                  </p>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    onClick={handleTestPrompt}
                    disabled={isTestingPrompt}
                    className="hover:bg-purple-50 border-purple-200"
                  >
                    {isTestingPrompt ? (
                      <>
                        <Settings className="w-4 h-4 mr-2 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4 mr-2" />
                        Testar Prompt
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Number Selection */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  Número de WhatsApp
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Selecione o número de WhatsApp que a Livia utilizará para comunicação
                </p>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="whatsappNumber" className="text-sm font-medium">
                    Número vinculado
                  </Label>
                  <Select 
                    value={config.whatsappNumber} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, whatsappNumber: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione um número de WhatsApp" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockWhatsAppNumbers.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum número cadastrado
                        </SelectItem>
                      ) : (
                        mockWhatsAppNumbers.map((number) => (
                          <SelectItem key={number.id} value={number.id.toString()}>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-green-600" />
                              <span>{number.number}</span>
                              <Badge 
                                variant={number.status === 'connected' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {number.status === 'connected' ? 'Conectado' : 'Desconectado'}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Off Time Settings */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  Tempo de "Off" após envio manual
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Durante esse período, a IA não responderá mensagens automaticamente após um membro da equipe enviar uma mensagem manual.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Configure quanto tempo a IA ficará inativa após uma resposta manual da equipe
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label htmlFor="offDuration" className="text-sm font-medium">
                      Duração
                    </Label>
                    <Input
                      id="offDuration"
                      type="number"
                      min="1"
                      value={config.offTime.duration}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        offTime: { ...prev.offTime, duration: parseInt(e.target.value) || 1 }
                      }))}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="offUnit" className="text-sm font-medium">
                      Unidade
                    </Label>
                    <Select 
                      value={config.offTime.unit} 
                      onValueChange={(value) => setConfig(prev => ({ 
                        ...prev, 
                        offTime: { ...prev.offTime, unit: value }
                      }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutos">Minutos</SelectItem>
                        <SelectItem value="horas">Horas</SelectItem>
                        <SelectItem value="dias">Dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professionals Access */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/60 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  Profissionais / Agenda com acesso
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Selecione quais profissionais a Livia pode acessar para informações de agenda
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar profissionais..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Professionals Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProfessionals.map((professional) => (
                    <div
                      key={professional.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                        config.selectedProfessionals.includes(professional.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleProfessional(professional.id)}
                    >
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={professional.avatar} alt={professional.name} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                              {professional.initials}
                            </AvatarFallback>
                          </Avatar>
                          <Checkbox
                            checked={config.selectedProfessionals.includes(professional.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 border-2 border-white shadow-md"
                            onCheckedChange={() => {}}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{professional.name}</h4>
                          <p className="text-xs text-gray-500">{professional.specialty}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500">
                  {config.selectedProfessionals.length} profissional(is) selecionado(s)
                </p>
              </CardContent>
            </Card>

            {/* Knowledge Base Connection */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/60 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                    </div>
                    Conectar Base de Conhecimento
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Conecte bases de conhecimento para enriquecer as respostas da Livia
                  </p>
                </div>
                
                <Dialog open={showKnowledgeModal} onOpenChange={setShowKnowledgeModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="hover:bg-emerald-50 border-emerald-200">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Base
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Adicionar Base de Conhecimento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {mockKnowledgeBases.map((base) => (
                        <div
                          key={base.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            config.connectedKnowledgeBases.includes(base.id)
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleKnowledgeBase(base.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{base.name}</h4>
                              <p className="text-xs text-gray-500 mt-1">{base.description}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {base.documentsCount} documentos
                              </p>
                            </div>
                            <Checkbox
                              checked={config.connectedKnowledgeBases.includes(base.id)}
                              onCheckedChange={() => {}}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {/* Connected Knowledge Bases */}
                <div className="space-y-3">
                  {config.connectedKnowledgeBases.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">Nenhuma base de conhecimento conectada</p>
                      <p className="text-xs mt-1">Clique em "Adicionar Base" para começar</p>
                    </div>
                  ) : (
                    mockKnowledgeBases
                      .filter(base => config.connectedKnowledgeBases.includes(base.id))
                      .map((base) => (
                        <div
                          key={base.id}
                          className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{base.name}</h4>
                              <p className="text-xs text-gray-600">{base.documentsCount} documentos</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleKnowledgeBase(base.id)}
                            className="text-gray-500 hover:text-red-500 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}