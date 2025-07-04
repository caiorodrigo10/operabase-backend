import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PatientTimeline } from "@/components/PatientTimeline";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Mic, 
  Sparkles, 
  Lightbulb, 
  ChevronLeft, 
  ChevronRight, 
  Save,
  Send,
  History
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Note {
  id: string;
  content: string;
  timestamp: Date;
  generatedByAI: boolean;
}

interface AudioVisualization {
  isRecording: boolean;
  volume: number;
}

const templates = [
  { id: "soap", name: "SOAP" },
  { id: "pediatria", name: "Pediatria" },
  { id: "prenatal", name: "Pré-Natal" },
  { id: "psicologia", name: "Psicologia" },
  { id: "livre", name: "Texto Livre" }
];

export function Prontuario() {
  const [, setLocation] = useLocation();
  const { id: contactId } = useParams();
  const { toast } = useToast();
  
  // Buscar dados do contato
  const { data: contact, isLoading: isLoadingContact } = useQuery({
    queryKey: ['/api/contacts', contactId],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}`);
      if (!response.ok) throw new Error('Erro ao carregar contato');
      return response.json();
    },
    enabled: !!contactId
  });
  
  // Estado do editor
  const [content, setContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("livre");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastAIGeneration, setLastAIGeneration] = useState<Date | null>(null);
  
  // Histórico de versões temporárias
  const [noteHistory, setNoteHistory] = useState<Note[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  
  // Estados de áudio
  const [audioState, setAudioState] = useState<AudioVisualization>({
    isRecording: false,
    volume: 0
  });
  
  // Estados de carregamento
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Controle de visualização
  const [activeTab, setActiveTab] = useState<'editor' | 'timeline'>('editor');
  
  // Referências
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Criar nova versão no histórico
  const addToHistory = (content: string, generatedByAI: boolean = false) => {
    const newNote: Note = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
      generatedByAI
    };
    
    const newHistory = [...noteHistory.slice(0, currentHistoryIndex + 1), newNote];
    
    // Manter apenas as últimas 10 versões
    if (newHistory.length > 10) {
      newHistory.shift();
    }
    
    setNoteHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
    
    if (generatedByAI) {
      setLastAIGeneration(new Date());
    }
  };

  // Navegação no histórico
  const navigateHistory = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentHistoryIndex > 0) {
      setCurrentHistoryIndex(currentHistoryIndex - 1);
      setContent(noteHistory[currentHistoryIndex - 1].content);
    } else if (direction === 'next' && currentHistoryIndex < noteHistory.length - 1) {
      setCurrentHistoryIndex(currentHistoryIndex + 1);
      setContent(noteHistory[currentHistoryIndex + 1].content);
    }
  };

  // Iniciar gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setAudioState({ isRecording: true, volume: 0 });
      
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone.",
        variant: "destructive"
      });
    }
  };

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && audioState.isRecording) {
      mediaRecorderRef.current.stop();
      setAudioState({ isRecording: false, volume: 0 });
    }
  };

  // Transcrever áudio com IA
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      // Simulação da transcrição - em produção usar Whisper API
      const simulatedTranscription = "Paciente relata dor abdominal há 3 dias, localizada no quadrante inferior direito. Náuseas ocasionais. Temperatura corporal normal. Sem vômitos. Dor piora com movimento.";
      
      // Adicionar ao conteúdo existente
      const newContent = content + (content ? "\n\n" : "") + simulatedTranscription;
      setContent(newContent);
      setHasUnsavedChanges(true);
      
      toast({
        title: "Transcrição concluída",
        description: "Áudio transcrito com sucesso."
      });
      
    } catch (error) {
      console.error('Erro na transcrição:', error);
      toast({
        title: "Erro",
        description: "Falha na transcrição do áudio.",
        variant: "destructive"
      });
    }
  };

  // Organizar com IA
  const organizeWithAI = async () => {
    if (!content.trim()) {
      toast({
        title: "Aviso",
        description: "Adicione conteúdo antes de organizar com IA.",
        variant: "destructive"
      });
      return;
    }
    
    setIsOrganizing(true);
    
    try {
      // Simulação da organização - em produção usar OpenAI API
      const organizedContent = formatContentByTemplate(content, selectedTemplate);
      
      // Salvar versão atual no histórico antes de substituir
      addToHistory(content);
      
      // Aplicar conteúdo organizado
      setContent(organizedContent);
      addToHistory(organizedContent, true);
      setHasUnsavedChanges(true);
      
      toast({
        title: "Conteúdo organizado",
        description: `Texto reestruturado usando template ${templates.find(t => t.id === selectedTemplate)?.name}.`
      });
      
    } catch (error) {
      console.error('Erro na organização:', error);
      toast({
        title: "Erro",
        description: "Falha ao organizar conteúdo.",
        variant: "destructive"
      });
    } finally {
      setIsOrganizing(false);
    }
  };

  // Gerar sugestões com IA
  const generateSuggestions = async () => {
    if (!content.trim()) {
      toast({
        title: "Aviso",
        description: "Adicione conteúdo antes de gerar sugestões.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGeneratingSuggestions(true);
    
    try {
      // Simulação de sugestões - em produção usar OpenAI API
      const suggestions = [
        "Solicitar hemograma completo",
        "Prescrever dipirona 500mg a cada 6h por 3 dias",
        "Retorno em 5 dias ou se persistirem os sintomas",
        "Orientar dieta leve e repouso"
      ];
      
      toast({
        title: "Sugestões da IA",
        description: suggestions.join(" • "),
      });
      
    } catch (error) {
      console.error('Erro nas sugestões:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar sugestões.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Formatar conteúdo por template
  const formatContentByTemplate = (text: string, template: string): string => {
    switch (template) {
      case "soap":
        return `SUBJETIVO:
${text}

OBJETIVO:
Exame físico a ser preenchido

AVALIAÇÃO:
Impressão diagnóstica

PLANO:
Conduta terapêutica`;
        
      case "pediatria":
        return `HISTÓRIA CLÍNICA PEDIÁTRICA:
${text}

DESENVOLVIMENTO:
- Motor: 
- Cognitivo: 
- Social: 

EXAME FÍSICO:
- Peso/Altura: 
- Sinais vitais: 

CONDUTA:
- Orientações aos pais:
- Retorno:`;

      case "prenatal":
        return `CONSULTA PRÉ-NATAL:
${text}

DADOS OBSTÉTRICOS:
- IG: 
- DUM: 
- DPP: 

EXAME FÍSICO:
- PA: 
- Peso: 
- AU: 
- BCF: 

ORIENTAÇÕES:
- Próxima consulta:`;

      case "psicologia":
        return `SESSÃO DE PSICOLOGIA:

QUEIXA PRINCIPAL:
${text}

OBSERVAÇÕES CLÍNICAS:
- Estado emocional:
- Comportamento:
- Cognição:

INTERVENÇÕES:
- Técnicas utilizadas:

PLANO TERAPÊUTICO:
- Objetivos:
- Próxima sessão:`;

      default:
        return text;
    }
  };

  // Salvar consulta
  const saveConsultation = async () => {
    if (!content.trim()) {
      toast({
        title: "Aviso",
        description: "Adicione conteúdo antes de salvar.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Simulação do salvamento - em produção salvar no banco
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasUnsavedChanges(false);
      
      // Limpar histórico após salvar
      setNoteHistory([]);
      setCurrentHistoryIndex(0);
      setLastAIGeneration(null);
      
      toast({
        title: "Consulta salva",
        description: "Prontuário salvo com sucesso."
      });
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar consulta.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Detectar mudanças no conteúdo
  useEffect(() => {
    if (content !== (noteHistory[currentHistoryIndex]?.content || "")) {
      setHasUnsavedChanges(true);
    }
  }, [content, noteHistory, currentHistoryIndex]);

  if (isLoadingContact) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando prontuário...</p>
        </div>
      </div>
    );
  }

  if (!contact && contactId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Paciente não encontrado</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">O paciente solicitado não foi encontrado.</p>
          <Button onClick={() => setLocation('/contatos')}>
            Voltar aos Contatos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/contatos')}
              className="text-gray-600 dark:text-gray-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {contact?.name || 'Prontuário'}
              </h1>
              {contact && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {contact.age && `${contact.age} anos`} {contact.profession && `• ${contact.profession}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('editor')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'editor'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Editor de Prontuário
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <History className="h-4 w-4" />
              Histórico do Paciente
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar (only shown in editor tab) */}
      {activeTab === 'editor' && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecionar Template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={audioState.isRecording ? stopRecording : startRecording}
                className={audioState.isRecording ? "bg-red-50 border-red-200 text-red-700" : ""}
              >
                <Mic className={`h-4 w-4 mr-2 ${audioState.isRecording ? "text-red-500" : ""}`} />
                {audioState.isRecording ? "Parar" : "Gravar IA"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={organizeWithAI}
                disabled={isOrganizing}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isOrganizing ? "Organizando..." : "Organizar com IA"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={generateSuggestions}
                disabled={isGeneratingSuggestions}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                {isGeneratingSuggestions ? "Gerando..." : "Sugestões da IA"}
              </Button>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateHistory('prev')}
                  disabled={currentHistoryIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateHistory('next')}
                  disabled={currentHistoryIndex === noteHistory.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={saveConsultation}
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Consulta"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Visualization */}
      {activeTab === 'editor' && audioState.isRecording && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-6 py-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="bg-red-400 rounded-full"
                  style={{
                    width: '3px',
                    height: `${Math.random() * 20 + 5}px`,
                    minHeight: '5px'
                  }}
                />
              ))}
            </div>
            <span className="text-sm text-red-700 dark:text-red-300">
              Gravando... Clique em "Parar" para finalizar
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6">
        {activeTab === 'editor' ? (
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Prontuário da Consulta</CardTitle>
                <div className="flex items-center space-x-2">
                  {lastAIGeneration && (
                    <Badge variant="secondary" className="text-xs">
                      Última versão gerada com IA – {format(lastAIGeneration, "HH:mm")}
                    </Badge>
                  )}
                  {hasUnsavedChanges && (
                    <Badge variant="destructive" className="text-xs">
                      Alterações não salvas
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite suas observações da consulta aqui ou use a transcrição por voz..."
                className="min-h-[500px] resize-none text-base leading-relaxed"
              />
            </CardContent>
          </Card>
        ) : (
          <PatientTimeline patientId={contact?.id || 1} />
        )}
      </div>

      {/* Footer */}
      {activeTab === 'editor' && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex justify-center">
            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 mr-2" />
              Enviar instruções ao paciente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}