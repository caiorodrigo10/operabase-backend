import { useState } from "react";
import { Upload, FileText, Link as LinkIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UploadResponse {
  documentId: number;
  status: string;
  message: string;
}

export default function RAGUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'text' | 'url' | 'pdf'>('text');
  
  // Formulário para texto
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  
  // Formulário para URL
  const [urlTitle, setUrlTitle] = useState("");
  const [urlValue, setUrlValue] = useState("");
  
  // Formulário para PDF
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Mutation para upload de texto
  const uploadTextMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await fetch('/api/rag/documents/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar texto');
      }
      
      return response.json() as Promise<UploadResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "Texto enviado com sucesso",
        description: data.message,
      });
      
      setTextTitle("");
      setTextContent("");
      queryClient.invalidateQueries({ queryKey: ['/api/rag/documents'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar texto",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para upload de URL
  const uploadUrlMutation = useMutation({
    mutationFn: async (data: { title: string; url: string }) => {
      const response = await fetch('/api/rag/documents/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar URL');
      }
      
      return response.json() as Promise<UploadResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "URL enviada com sucesso",
        description: data.message,
      });
      
      setUrlTitle("");
      setUrlValue("");
      queryClient.invalidateQueries({ queryKey: ['/api/rag/documents'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar URL",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para upload de PDF
  const uploadPdfMutation = useMutation({
    mutationFn: async (data: { title: string; file: File }) => {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('file', data.file);
      
      const response = await fetch('/api/rag/documents/pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar PDF');
      }
      
      return response.json() as Promise<UploadResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "PDF enviado com sucesso",
        description: data.message,
      });
      
      setPdfTitle("");
      setPdfFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/rag/documents'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar PDF",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTitle.trim() || !textContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e conteúdo são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    
    uploadTextMutation.mutate({ title: textTitle, content: textContent });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlTitle.trim() || !urlValue.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e URL são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    
    uploadUrlMutation.mutate({ title: urlTitle, url: urlValue });
  };

  const handlePdfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfTitle.trim() || !pdfFile) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e arquivo PDF são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    
    uploadPdfMutation.mutate({ title: pdfTitle, file: pdfFile });
  };

  const tabs = [
    { id: 'text', label: 'Texto', icon: FileText },
    { id: 'url', label: 'URL', icon: LinkIcon },
    { id: 'pdf', label: 'PDF', icon: Upload },
  ] as const;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload de Documentos RAG</h1>
        <p className="text-gray-600">
          Adicione documentos à base de conhecimento para busca semântica
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Documento
          </CardTitle>
          <CardDescription>
            Escolha o tipo de conteúdo que deseja adicionar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Conteúdo das Tabs */}
          {activeTab === 'text' && (
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div>
                <Label htmlFor="text-title">Título</Label>
                <Input
                  id="text-title"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="Digite um título para o texto"
                  required
                />
              </div>
              <div>
                <Label htmlFor="text-content">Conteúdo</Label>
                <Textarea
                  id="text-content"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Cole ou digite o texto aqui..."
                  rows={8}
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={uploadTextMutation.isPending}
                className="w-full"
              >
                {uploadTextMutation.isPending ? 'Enviando...' : 'Adicionar Texto'}
              </Button>
            </form>
          )}

          {activeTab === 'url' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <Label htmlFor="url-title">Título</Label>
                <Input
                  id="url-title"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  placeholder="Digite um título para a URL"
                  required
                />
              </div>
              <div>
                <Label htmlFor="url-value">URL</Label>
                <Input
                  id="url-value"
                  type="url"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="https://exemplo.com/artigo"
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={uploadUrlMutation.isPending}
                className="w-full"
              >
                {uploadUrlMutation.isPending ? 'Enviando...' : 'Adicionar URL'}
              </Button>
            </form>
          )}

          {activeTab === 'pdf' && (
            <form onSubmit={handlePdfSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pdf-title">Título</Label>
                <Input
                  id="pdf-title"
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                  placeholder="Digite um título para o PDF"
                  required
                />
              </div>
              <div>
                <Label htmlFor="pdf-file">Arquivo PDF</Label>
                <div className="flex flex-col gap-2">
                  <input
                    id="pdf-file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                  {pdfFile && (
                    <p className="text-sm text-gray-600">
                      Arquivo selecionado: {pdfFile.name}
                    </p>
                  )}
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={uploadPdfMutation.isPending}
                className="w-full"
              >
                {uploadPdfMutation.isPending ? 'Enviando...' : 'Enviar PDF'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}