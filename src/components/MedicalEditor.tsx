import { useState, useRef, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Mic, 
  Sparkles, 
  Lightbulb, 
  ChevronLeft, 
  ChevronRight, 
  Save,
  Send,
  History,
  Plus,
  X
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

interface MedicalEditorProps {
  contactId: string;
  contactName: string;
  onSave?: (content: string, template: string) => void;
  onClose?: () => void;
  initialContent?: string;
  initialTemplate?: string;
}

const templates = [
  { id: "soap", name: "SOAP" },
  { id: "pediatria", name: "Pediatria" },
  { id: "prenatal", name: "Pré-Natal" },
  { id: "psicologia", name: "Psicologia" },
  { id: "livre", name: "Texto Livre" }
];

export function MedicalEditor({ 
  contactId, 
  contactName, 
  onSave, 
  onClose,
  initialContent = "",
  initialTemplate = "livre" 
}: MedicalEditorProps) {
  const { toast } = useToast();
  
  // Estado do editor
  const [content, setContent] = useState(initialContent);
  const [selectedTemplate, setSelectedTemplate] = useState(initialTemplate);
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
      // Em produção, usar Whisper API real
      const simulatedTranscription = "Paciente relata evolução positiva do quadro clínico. Redução significativa dos sintomas. Boa aceitação ao tratamento prescrito.";
      
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
      const suggestions = [
        "Solicitar exames complementares",
        "Avaliar necessidade de ajuste terapêutico",
        "Agendar retorno em 7-14 dias",
        "Orientar sobre sinais de alerta"
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

  // Salvar evolução
  const saveEvolution = async () => {
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
      if (onSave) {
        onSave(content, selectedTemplate);
      }
      
      setHasUnsavedChanges(false);
      
      // Limpar histórico após salvar
      setNoteHistory([]);
      setCurrentHistoryIndex(0);
      setLastAIGeneration(null);
      
      toast({
        title: "Evolução salva",
        description: "Evolução médica salva com sucesso."
      });
      
      if (onClose) {
        onClose();
      }
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar evolução.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Monitorar mudanças no conteúdo
  useEffect(() => {
    setHasUnsavedChanges(content !== initialContent);
  }, [content, initialContent]);

  return (
    <Card className="border border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Nova Evolução - {contactName}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Template:</label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Editor Tools */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
          <Button
            variant={audioState.isRecording ? "destructive" : "outline"}
            size="sm"
            onClick={audioState.isRecording ? stopRecording : startRecording}
            disabled={isOrganizing || isGeneratingSuggestions}
          >
            <Mic className="w-4 h-4 mr-2" />
            {audioState.isRecording ? "Parar" : "Gravar"}
          </Button>

          <Button
            variant="outline"
            size="sm" 
            onClick={organizeWithAI}
            disabled={isOrganizing || !content.trim()}
          >
            <Sparkles className={`w-4 h-4 mr-2 ${isOrganizing ? 'animate-spin' : ''}`} />
            {isOrganizing ? "Organizando..." : "Organizar IA"}
          </Button>

          <Button
            variant="outline" 
            size="sm"
            onClick={generateSuggestions}
            disabled={isGeneratingSuggestions || !content.trim()}
          >
            <Lightbulb className={`w-4 h-4 mr-2 ${isGeneratingSuggestions ? 'animate-pulse' : ''}`} />
            {isGeneratingSuggestions ? "Gerando..." : "Sugestões IA"}
          </Button>

          {/* History Navigation */}
          {noteHistory.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateHistory('prev')}
                disabled={currentHistoryIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Badge variant="outline" className="text-xs">
                {currentHistoryIndex + 1}/{noteHistory.length}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateHistory('next')}
                disabled={currentHistoryIndex === noteHistory.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Text Editor */}
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            placeholder="Digite aqui a evolução do paciente..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-64 resize-none font-mono text-sm"
          />
          
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              Alterações não salvas
            </div>
          )}
        </div>

        {/* AI Generation Indicator */}
        {lastAIGeneration && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
            <Sparkles className="w-3 h-3" />
            Última organização IA: {format(lastAIGeneration, "HH:mm", { locale: ptBR })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          )}
          <Button 
            onClick={saveEvolution} 
            disabled={isSaving || !content.trim()}
            className="bg-medical-blue hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Evolução"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Dialog wrapper component
export function MedicalEditorDialog({ 
  contactId, 
  contactName, 
  children, 
  onSave 
}: { 
  contactId: string;
  contactName: string;
  children: React.ReactNode;
  onSave?: (content: string, template: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editor de Evolução Médica</DialogTitle>
        </DialogHeader>
        <MedicalEditor
          contactId={contactId}
          contactName={contactName}
          onSave={(content, template) => {
            if (onSave) {
              onSave(content, template);
            }
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}