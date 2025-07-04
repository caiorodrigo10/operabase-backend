import { useState } from "react";
import { Search, Filter, FileText, ExternalLink, Upload, Plus, Edit, Trash2, ChevronLeft, X } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface RAGDocument {
  id: number;
  title: string;
  content_type: 'text' | 'url' | 'pdf';
  original_content: string;
  created_at: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  knowledge_base_id?: number;
  metadata?: {
    knowledge_base?: string;
    description?: string;
  };
}

interface KnowledgeItem {
  id: number;
  type: string;
  title: string;
  preview: string;
  date: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  url?: string;
  chunked?: boolean;
  chunkCount?: number;
  originalDocs?: RAGDocument[];
}

export default function ColecaoDetalhe() {
  const { toast } = useToast();
  const [match, params] = useRoute("/base-conhecimento/:id");
  const collectionId = params?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addStep, setAddStep] = useState<"select" | "form">("select");
  const [selectedType, setSelectedType] = useState<"text" | "pdf" | "url" | null>(null);
  const [textContent, setTextContent] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [urlContent, setUrlContent] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [crawlMode, setCrawlMode] = useState<"single" | "domain">("single");
  const [crawledPages, setCrawledPages] = useState<any[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);


  const queryClient = useQueryClient();

  // Status badge component
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-800", text: "Pendente" },
      processing: { color: "bg-blue-100 text-blue-800", text: "Processando" },
      completed: { color: "bg-green-100 text-green-800", text: "Processado" },
      failed: { color: "bg-red-100 text-red-800", text: "Erro" }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  // Query para buscar a base de conhecimento específica
  const { data: knowledgeBase, isLoading: isLoadingKB } = useQuery({
    queryKey: ['/api/rag/knowledge-bases', collectionId],
    queryFn: async () => {
      const response = await fetch('/api/rag/knowledge-bases');
      if (!response.ok) {
        throw new Error('Falha ao carregar bases de conhecimento');
      }
      const knowledgeBases = await response.json();
      return knowledgeBases.find((kb: any) => kb.id === parseInt(collectionId || '0'));
    },
    enabled: !!collectionId
  });

  // Query para buscar documentos da base de conhecimento
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['/api/rag/documents', collectionId],
    queryFn: async () => {
      const response = await fetch('/api/rag/documents');
      if (!response.ok) {
        throw new Error('Falha ao carregar documentos');
      }
      const result = await response.json();
      const allDocuments = result.data || [];
      
      console.log('🔍 Frontend Debug: API Response:', result);
      console.log('🔍 Frontend Debug: All documents received:', allDocuments.length);
      console.log('🔍 Frontend Debug: Looking for knowledge_base_id:', collectionId);
      
      // Filtrar documentos que pertencem a esta base de conhecimento usando knowledge_base_id
      const filteredDocs = allDocuments.filter((doc: any) => {
        const kbIdInDoc = doc.knowledge_base_id?.toString();
        const matches = kbIdInDoc === collectionId;
        console.log(`📄 Document ${doc.id}: knowledge_base_id="${kbIdInDoc}", looking for="${collectionId}", matches=${matches}`);
        return matches;
      });
      
      console.log('✅ Frontend Debug: Filtered documents:', filteredDocs.length);
      return filteredDocs;
    },
    enabled: !!collectionId
  });

  const isLoading = isLoadingKB || isLoadingDocs;

  const collectionData = knowledgeBase ? {
    id: knowledgeBase.id,
    name: knowledgeBase.name,
    description: knowledgeBase.description || `Base de conhecimento ${knowledgeBase.name}`,
    documents: documents
  } : null;

  // Converter documentos para o formato esperado pela interface, agrupando chunks de PDF
  const knowledgeItems: KnowledgeItem[] = (() => {
    if (!collectionData?.documents) return [];
    
    // Agrupar documentos por título base (removendo " - Parte X")
    const groupedDocs = new Map<string, RAGDocument[]>();
    
    collectionData.documents.forEach((doc: RAGDocument) => {
      // Detectar se é um chunk de PDF (título contém " - Parte")
      const baseTitle = doc.title.replace(/ - Parte \d+$/, '');
      
      if (!groupedDocs.has(baseTitle)) {
        groupedDocs.set(baseTitle, []);
      }
      
      // Para documentos não-PDF, verificar se já existe um com mesmo título e tipo
      const existingDocs = groupedDocs.get(baseTitle)!;
      const isDuplicate = existingDocs.some(existingDoc => 
        existingDoc.title === doc.title && 
        existingDoc.content_type === doc.content_type &&
        !doc.title.includes(' - Parte') // Não aplicar para chunks de PDF
      );
      
      if (!isDuplicate) {
        groupedDocs.get(baseTitle)!.push(doc);
      }
    });
    
    // Converter grupos em itens da interface
    return Array.from(groupedDocs.entries()).map(([baseTitle, docs]) => {
      // Se há múltiplos docs com o mesmo título base, é um PDF chunked
      const isChunkedPDF = docs.length > 1 && docs.some(d => d.title.includes(' - Parte'));
      
      if (isChunkedPDF) {
        // Usar o primeiro chunk como representativo, mas mostrar título limpo
        const firstDoc = docs[0];
        const totalLength = docs.reduce((sum, doc) => sum + (doc.original_content?.length || 0), 0);
        
        return {
          id: firstDoc.id,
          type: 'pdf' as const,
          title: baseTitle + '.pdf',
          preview: `PDF com ${docs.length} partes (${totalLength} caracteres)`,
          date: new Date(firstDoc.created_at).toLocaleDateString('pt-BR'),
          processing_status: docs.every(d => d.processing_status === 'completed') ? 'completed' as const : 
                           docs.some(d => d.processing_status === 'failed') ? 'failed' as const : 'processing' as const,
          error_message: docs.find(d => d.error_message)?.error_message,
          chunked: true,
          chunkCount: docs.length,
          originalDocs: docs // Manter referência aos documentos originais
        };
      } else {
        // Documento regular (não chunked)
        const doc = docs[0];
        return {
          id: doc.id,
          type: doc.content_type,
          title: doc.title,
          preview: doc.original_content?.substring(0, 100) + (doc.original_content?.length > 100 ? '...' : ''),
          date: new Date(doc.created_at).toLocaleDateString('pt-BR'),
          processing_status: doc.processing_status,
          error_message: doc.error_message,
          url: doc.content_type === 'url' ? doc.original_content : undefined
        };
      }
    });
  })();

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
    setAddStep("select");
    setSelectedType(null);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setAddStep("select");
    setSelectedType(null);
    setTextContent("");
    setTextTitle("");
    setUrlContent("");
    setUrlTitle("");
    setCrawlMode("single");
    setCrawledPages([]);
    setSelectedPages([]);
    setIsCrawling(false);
    setSelectedFiles([]);
  };

  const handleTypeSelection = (type: "text" | "pdf" | "url") => {
    setSelectedType(type);
    setAddStep("form");
  };

  const handleBackToSelection = () => {
    setAddStep("select");
    setSelectedType(null);
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
      setSelectedFiles(pdfFiles);
      console.log('PDFs selecionados:', pdfFiles.map(f => f.name));
    }
  };

  const handleCrawlPreview = async () => {
    if (!urlContent.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, digite a URL",
        variant: "destructive"
      });
      return;
    }

    setIsCrawling(true);
    setCrawledPages([]);
    setSelectedPages([]);

    try {
      const response = await fetch('/api/rag/crawl/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlContent,
          crawlMode: crawlMode
        })
      });

      if (!response.ok) {
        throw new Error('Falha no crawling');
      }

      const data = await response.json();
      setCrawledPages(data.pages || []);
      
      // Auto-select valid pages for single mode
      if (crawlMode === "single") {
        const validPages = data.pages.filter((p: any) => p.isValid);
        setSelectedPages(validPages.map((p: any) => p.url));
      }

      toast({
        title: "Sucesso",
        description: `${data.pages.length} página(s) encontrada(s)`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao fazer crawling da URL",
        variant: "destructive"
      });
    } finally {
      setIsCrawling(false);
    }
  };

  const handleSaveContent = async () => {
    if (!collectionData) return;

    try {
      let payload;
      
      if (selectedType === "text") {
        if (!textContent.trim()) {
          toast({
            title: "Erro",
            description: "Por favor, digite o conteúdo do texto",
            variant: "destructive"
          });
          return;
        }
        
        payload = {
          knowledge_base: collectionData.name,
          title: textTitle || "Documento de Texto",
          content_type: "text",
          content: textContent
        };
      } else if (selectedType === "url") {
        if (crawlMode === "single") {
          if (!urlContent.trim()) {
            toast({
              title: "Erro",
              description: "Por favor, digite a URL",
              variant: "destructive"
            });
            return;
          }
          
          payload = {
            knowledge_base: collectionData.name,
            title: urlTitle || "Link",
            content_type: "url",
            content: urlContent
          };
        } else {
          // Process crawled pages
          if (selectedPages.length === 0) {
            toast({
              title: "Erro",
              description: "Por favor, selecione pelo menos uma página",
              variant: "destructive"
            });
            return;
          }

          const selectedPagesData = crawledPages
            .filter(page => selectedPages.includes(page.url))
            .map(page => ({
              url: page.url,
              title: page.title,
              content: page.content || page.preview
            }));

          const response = await fetch('/api/rag/crawl/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              selectedPages: selectedPagesData,
              knowledge_base: collectionData.name
            })
          });

          if (!response.ok) {
            throw new Error('Falha ao processar páginas');
          }

          toast({
            title: "Sucesso",
            description: `${selectedPages.length} página(s) adicionada(s) para processamento`,
          });

          handleCloseAddModal();
          queryClient.invalidateQueries({ queryKey: ['/api/rag/documents'] });
          return;
        }
      } else if (selectedType === "pdf") {
        if (selectedFiles.length === 0) {
          toast({
            title: "Erro",
            description: "Por favor, selecione um arquivo PDF",
            variant: "destructive"
          });
          return;
        }

        console.log('📄 Frontend: Iniciando upload de PDF:', {
          collectionId,
          collectionData,
          fileName: selectedFiles[0].name,
          fileSize: selectedFiles[0].size
        });

        // Upload do PDF usando FormData
        const formData = new FormData();
        formData.append('knowledge_base_id', collectionId!); // Non-null assertion já que collectionId é validado
        formData.append('title', selectedFiles[0].name.replace(/\.pdf$/i, ''));
        formData.append('file', selectedFiles[0]);

        console.log('📤 Frontend: Enviando FormData:', {
          knowledge_base_id: collectionId,
          title: selectedFiles[0].name.replace(/\.pdf$/i, ''),
          fileName: selectedFiles[0].name
        });

        const response = await fetch('/api/rag/documents/upload', {
          method: 'POST',
          body: formData
        });

        console.log('📦 Frontend: Resposta do servidor:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Frontend: Erro na resposta:', errorData);
          throw new Error(errorData.error || 'Falha no upload do PDF');
        }

        const result = await response.json();
        console.log('✅ Frontend: Upload bem-sucedido:', result);

        // Invalidar cache e fechar modal
        queryClient.invalidateQueries({ queryKey: ['/api/rag/documents'] });
        handleCloseAddModal();
        
        toast({
          title: "Sucesso",  
          description: "PDF enviado com sucesso!"
        });
        return;
      }

      const response = await fetch('/api/rag/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Falha ao adicionar documento');
      }

      // Invalidar cache e fechar modal
      queryClient.invalidateQueries({ queryKey: ['/api/rag/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/knowledge-bases'] });
      handleCloseAddModal();
      
      toast({
        title: "Sucesso",
        description: "Documento adicionado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao adicionar documento:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar documento",
        variant: "destructive"
      });
    }
  };

  // Mutation para deletar documento (backend automaticamente lida com chunks de PDF)
  const deleteDocumentMutation = useMutation({
    mutationFn: async (item: KnowledgeItem) => {
      const response = await fetch(`/api/rag/documents/${item.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao deletar documento');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rag/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/knowledge-bases'] });
      
      toast({
        title: "Sucesso",
        description: data.message || "Documento removido com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao deletar documento",
        variant: "destructive"
      });
    }
  });

  const [itemToDelete, setItemToDelete] = useState<KnowledgeItem | null>(null);

  const handleDeleteDocument = (item: KnowledgeItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDocument = () => {
    if (itemToDelete) {
      deleteDocumentMutation.mutate(itemToDelete);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };



  const getTypeIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FileText className="h-4 w-4" />;
      case "pdf":
        return <FileText className="h-4 w-4 text-red-600" />;
      case "url":
        return <ExternalLink className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const filteredItems = knowledgeItems.filter((item: KnowledgeItem) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.preview.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === "all" || item.type === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando base de conhecimento...</p>
        </div>
      </div>
    );
  }

  if (!collectionData) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Base de conhecimento não encontrada</p>
        <Link href="/base-conhecimento">
          <Button variant="outline" className="mt-4">
            Voltar às Bases de Conhecimento
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb and Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/base-conhecimento" className="hover:text-gray-700 transition-colors">
            Base de Conhecimento
          </Link>
          <span>›</span>
          <span className="text-gray-900">{collectionData.name}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{collectionData.name}</h1>
            <p className="text-gray-600">{collectionData.description}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleOpenAddModal}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Conhecimento
            </Button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <Card>
        <CardHeader>
          <CardTitle>Itens da Base de Conhecimento</CardTitle>
          <CardDescription>
            Gerencie todo o conteúdo desta base de conhecimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar itens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="text">Textos</SelectItem>
                <SelectItem value="pdf">PDFs</SelectItem>
                <SelectItem value="url">URLs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            {filteredItems.map((item: KnowledgeItem) => (
              <div key={item.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  {getTypeIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 truncate">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-400 font-mono">ID: {item.id}</span>
                      {getStatusBadge(item.processing_status)}
                    </div>
                  </div>
                  {item.processing_status === 'failed' && item.error_message && (
                    <div className="mt-1">
                      <span className="text-xs text-red-600 truncate max-w-xs" title={item.error_message}>
                        Erro: {item.error_message}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteDocument(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum item encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Knowledge Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {addStep === "select" ? (
            <>
              <DialogHeader>
                <DialogTitle>Escolha o tipo de conhecimento</DialogTitle>
                <DialogDescription>
                  Selecione como você gostaria de adicionar informações
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
                {/* Text Option */}
                <div 
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all group"
                  onClick={() => handleTypeSelection("text")}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Texto Livre</h3>
                    <p className="text-sm text-gray-600">
                      Digite ou cole informações diretamente
                    </p>
                  </div>
                </div>

                {/* PDF Option */}
                <div 
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 cursor-pointer transition-all group"
                  onClick={() => handleTypeSelection("pdf")}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 transition-colors">
                      <Upload className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Upload PDF</h3>
                    <p className="text-sm text-gray-600">
                      Importe documentos em formato PDF
                    </p>
                  </div>
                </div>

                {/* URL Option */}
                <div 
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all group"
                  onClick={() => handleTypeSelection("url")}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                      <ExternalLink className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Link/URL</h3>
                    <p className="text-sm text-gray-600">
                      Adicione links de páginas web
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={handleCloseAddModal}>
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedType === "text" && "Adicionar Texto"}
                  {selectedType === "pdf" && "Upload PDF"}
                  {selectedType === "url" && "Adicionar Link"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-6">
                {selectedType === "text" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">
                        Título (opcional)
                      </label>
                      <Input
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        placeholder="Ex: Protocolo de Emergência"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-900">
                        Conteúdo
                      </label>
                      <Textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Digite ou cole informações importantes..."
                        className="min-h-[200px]"
                      />
                    </div>
                  </>
                )}

                {selectedType === "pdf" && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">
                        Arraste e solte arquivos PDF aqui ou
                      </p>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileSelection}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          id="pdf-upload"
                        />
                        <Button variant="outline" className="pointer-events-none">
                          {selectedFiles.length > 0 ? `${selectedFiles.length} arquivo(s) selecionado(s)` : "Selecionar Arquivos"}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-4">
                        Máximo 10MB por arquivo, apenas PDFs
                      </p>
                    </div>
                    
                    {selectedFiles.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Arquivos selecionados:</h4>
                        <div className="space-y-2">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-red-600" />
                                <div>
                                  <p className="font-medium text-gray-900">{file.name}</p>
                                  <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedType === "url" && (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">
                          URL da página
                        </label>
                        <Input
                          value={urlContent}
                          onChange={(e) => setUrlContent(e.target.value)}
                          placeholder="https://exemplo.com/pagina-importante"
                          type="url"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-900">
                          Modo de importação
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="radio"
                              name="crawlMode"
                              value="single"
                              checked={crawlMode === "single"}
                              onChange={(e) => setCrawlMode(e.target.value as "single" | "domain")}
                              className="text-blue-600"
                            />
                            <div>
                              <div className="font-medium text-gray-900">Apenas esta página</div>
                              <div className="text-sm text-gray-500">Extrair conteúdo somente da URL informada</div>
                            </div>
                          </label>
                          
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="radio"
                              name="crawlMode"
                              value="domain"
                              checked={crawlMode === "domain"}
                              onChange={(e) => setCrawlMode(e.target.value as "single" | "domain")}
                              className="text-blue-600"
                            />
                            <div>
                              <div className="font-medium text-gray-900">Todo o site (crawling)</div>
                              <div className="text-sm text-gray-500">Buscar e permitir seleção de todas as páginas internas do domínio</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {crawlMode === "single" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-900">
                            Título (opcional)
                          </label>
                          <Input
                            value={urlTitle}
                            onChange={(e) => setUrlTitle(e.target.value)}
                            placeholder="Ex: Diretrizes Oficiais"
                          />
                        </div>
                      )}

                      {crawlMode === "domain" && (
                        <div className="flex justify-end">
                          <Button 
                            onClick={handleCrawlPreview}
                            disabled={!urlContent.trim() || isCrawling}
                            variant="outline"
                            size="sm"
                          >
                            {isCrawling ? "Buscando páginas..." : "Buscar páginas do site"}
                          </Button>
                        </div>
                      )}

                      {crawledPages.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">
                              Páginas encontradas ({crawledPages.filter(p => p.isValid).length} válidas)
                            </h4>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const allSelected = crawledPages.every(p => p.isValid && selectedPages.includes(p.url));
                                  if (allSelected) {
                                    setSelectedPages([]);
                                  } else {
                                    setSelectedPages(crawledPages.filter(p => p.isValid).map(p => p.url));
                                  }
                                }}
                              >
                                {crawledPages.every(p => p.isValid && selectedPages.includes(p.url)) ? 'Desmarcar todas' : 'Selecionar todas'}
                              </Button>
                            </div>
                          </div>
                          
                          <div className="max-h-60 overflow-y-auto space-y-1 border rounded p-3 bg-gray-50">
                            {crawledPages.map((page, index) => (
                              <div key={index} className={`p-2 border rounded bg-white ${!page.isValid ? 'opacity-50' : ''}`}>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={page.isValid && selectedPages.includes(page.url)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPages(prev => [...prev, page.url]);
                                      } else {
                                        setSelectedPages(prev => prev.filter(url => url !== page.url));
                                      }
                                    }}
                                    disabled={!page.isValid}
                                    className="text-blue-600"
                                  />
                                  <div className="flex-1 min-w-0 flex items-center justify-between">
                                    <div className="truncate">
                                      <span className="font-medium text-gray-900">{page.url}</span>
                                      {page.error && (
                                        <span className="text-xs text-red-600 ml-2">• Erro: {page.error}</span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500 ml-3 flex-shrink-0">
                                      {page.wordCount} palavras
                                    </span>
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBackToSelection}>
                  Voltar
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCloseAddModal}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveContent}
                    disabled={
                      (selectedType === "text" && !textContent.trim()) ||
                      (selectedType === "url" && crawlMode === "single" && !urlContent.trim()) ||
                      (selectedType === "url" && crawlMode === "domain" && selectedPages.length === 0) ||
                      (selectedType === "pdf" && selectedFiles.length === 0)
                    }
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar "{itemToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteDocument}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}