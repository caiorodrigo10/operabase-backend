import { useState } from "react";
import { Plus, BookOpen, ExternalLink, FileText, Calendar, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface RAGDocument {
  id: number;
  title: string;
  content_type: 'text' | 'url' | 'pdf';
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  metadata?: {
    knowledge_base?: string;
    description?: string;
    created_by?: string;
  };
}

interface Collection {
  id: number;
  name: string;
  description: string;
  itemCount: number;
  lastUpdated: string;
  documents: RAGDocument[];
}

export default function BasesConhecimento() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [knowledgeBaseToDelete, setKnowledgeBaseToDelete] = useState<string | null>(null);
  const [knowledgeBaseIdToDelete, setKnowledgeBaseIdToDelete] = useState<number | null>(null);

  // Função para agrupar documentos PDF chunks (mesma lógica do ColecaoDetalhe.tsx)
  const groupDocuments = (documents: any[], knowledgeBaseId: number) => {
    const filteredDocs = documents.filter(doc => 
      parseInt(doc.knowledge_base_id) === knowledgeBaseId || 
      doc.metadata?.knowledge_base_id === knowledgeBaseId
    );
    
    // Agrupar documentos por base filename para PDFs chunked
    const grouped = new Map();
    
    for (const doc of filteredDocs) {
      if (doc.content_type === 'pdf_chunk') {
        // Extrair nome base do título removendo " - Parte X"
        const baseTitle = doc.title.replace(/ - Parte \d+$/, '');
        
        if (!grouped.has(baseTitle)) {
          grouped.set(baseTitle, {
            id: `grouped_${baseTitle}`,
            title: baseTitle,
            content_type: 'pdf',
            chunked: true,
            chunkCount: 0,
            totalLength: 0,
            processing_status: 'completed',
            created_at: doc.created_at,
            originalDocs: []
          });
        }
        
        const group = grouped.get(baseTitle);
        group.chunkCount++;
        group.totalLength += doc.content_full_length || 0;
        group.originalDocs.push(doc);
        
        // Usar a data mais recente
        if (new Date(doc.created_at) > new Date(group.created_at)) {
          group.created_at = doc.created_at;
        }
      } else {
        // Documento individual - agrupar por título para evitar duplicados
        const existingDoc = Array.from(grouped.values()).find(item => 
          item.title === doc.title && item.content_type === doc.content_type
        );
        
        if (!existingDoc) {
          grouped.set(doc.id, {
            ...doc,
            chunked: false,
            chunkCount: 1
          });
        }
      }
    }
    
    return Array.from(grouped.values());
  };

  // Query para buscar bases de conhecimento
  const { data: knowledgeBases = [], isLoading } = useQuery({
    queryKey: ['/api/rag/knowledge-bases'],
    queryFn: async () => {
      const response = await fetch('/api/rag/knowledge-bases');
      if (!response.ok) {
        throw new Error('Falha ao carregar bases de conhecimento');
      }
      return response.json();
    }
  });

  // Query para buscar todos os documentos para calcular contadores
  const { data: allDocuments = [] } = useQuery({
    queryKey: ['/api/rag/documents'],
    queryFn: async () => {
      const response = await fetch('/api/rag/documents');
      if (!response.ok) {
        throw new Error('Falha ao carregar documentos');
      }
      const result = await response.json();
      return result.data || [];
    }
  });

  // Mutation para criar nova base de conhecimento
  const createKnowledgeBaseMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      console.log('🔍 Frontend - Sending data:', { name, description });
      
      const response = await fetch('/api/rag/knowledge-bases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
      });
      
      console.log('📊 Frontend - Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ Frontend - Error response:', errorData);
        throw new Error(errorData.error || 'Falha ao criar base de conhecimento');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rag/knowledge-bases'] });
      setIsCreateModalOpen(false);
      setNewCollectionName("");
      setNewCollectionDescription("");
      toast({
        title: "Sucesso",
        description: "Base de conhecimento criada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar base de conhecimento",
        variant: "destructive"
      });
    }
  });

  // Mutation para deletar base de conhecimento
  const deleteKnowledgeBaseMutation = useMutation({
    mutationFn: async (knowledgeBaseId: number) => {
      const response = await fetch(`/api/rag/knowledge-bases/${knowledgeBaseId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao deletar base de conhecimento');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rag/knowledge-bases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/documents'] });
      toast({
        title: "Sucesso",
        description: `Base de conhecimento deletada com sucesso. ${data.deletedDocuments} documentos removidos.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao deletar base de conhecimento",
        variant: "destructive"
      });
    }
  });

  // Transformar bases de conhecimento em collections para compatibilidade
  const collections: Collection[] = knowledgeBases.map((base: any) => {
    // Calcular contador de itens agrupados para esta base
    const groupedItems = groupDocuments(allDocuments, base.id);
    const itemCount = groupedItems.length;
    

    
    return {
      id: base.id,
      name: base.name,
      description: base.description || `Base de conhecimento ${base.name}`,
      itemCount: itemCount,
      lastUpdated: base.lastUpdated ? new Date(base.lastUpdated).toLocaleDateString('pt-BR') : "Sem dados",
      documents: [] // Documents são carregados separadamente na página de detalhes
    };
  });

  // Mutation para criar nova coleção (simulado por enquanto)
  const createCollectionMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      // Por enquanto, só mostrar toast
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Base de conhecimento criada",
        description: `${data.name} foi criada com sucesso.`,
      });
      setIsCreateModalOpen(false);
      setNewCollectionName("");
      setNewCollectionDescription("");
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando bases de conhecimento...</p>
        </div>
      </div>
    );
  }

  // Mostrar todas as coleções (bases de conhecimento)
  const visibleCollections = collections;

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    
    createKnowledgeBaseMutation.mutate({
      name: newCollectionName,
      description: newCollectionDescription
    });
  };

  const handleDeleteKnowledgeBase = (knowledgeBaseId: number, knowledgeBaseName: string) => {
    setKnowledgeBaseToDelete(knowledgeBaseName);
    setKnowledgeBaseIdToDelete(knowledgeBaseId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteKnowledgeBase = () => {
    if (knowledgeBaseIdToDelete) {
      deleteKnowledgeBaseMutation.mutate(knowledgeBaseIdToDelete);
      setDeleteDialogOpen(false);
      setKnowledgeBaseToDelete(null);
      setKnowledgeBaseIdToDelete(null);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-3 w-3 text-red-600" />;
      case "url":
        return <ExternalLink className="h-3 w-3 text-blue-600" />;
      default:
        return <FileText className="h-3 w-3 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bases de Conhecimento</h1>
          <p className="text-gray-600">
            Organize informações em bases de conhecimento temáticas
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Base de Conhecimento
        </Button>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collection) => (
          <Link key={collection.id} href={`/base-conhecimento/${collection.id}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg group-hover:text-blue-700 transition-colors">
                        {collection.name}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                      <span className="font-mono text-xs">ID: {collection.id}</span>
                      <Badge variant="secondary" className="text-xs">
                        {collection.itemCount} itens
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2 text-sm">
                      {collection.description}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteKnowledgeBase(collection.id, collection.name);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Last Updated */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    Atualizado em {collection.lastUpdated}
                  </div>

                  {/* Preview Items */}
                  {collection.documents.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">Documentos recentes:</p>
                      <div className="space-y-1">
                        {collection.documents.slice(0, 2).map((doc, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                            {getItemIcon(doc.content_type)}
                            <span className="truncate flex-1">{doc.title}</span>
                            <Badge 
                              variant={doc.processing_status === 'completed' ? 'default' : 'secondary'}
                              className="text-xs px-1 py-0"
                            >
                              {doc.processing_status === 'completed' ? 'OK' : doc.processing_status}
                            </Badge>
                          </div>
                        ))}
                        {collection.itemCount > 2 && (
                          <div className="text-xs text-gray-500 pl-5">
                            +{collection.itemCount - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {collections.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma base de conhecimento
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Comece criando sua primeira base de conhecimento para organizar informações por tema ou especialidade.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Base
          </Button>
        </div>
      )}

      {/* Create Collection Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Base de Conhecimento</DialogTitle>
            <DialogDescription>
              Organize informações relacionadas em uma base temática
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Nome da base *
              </label>
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Ex: Protocolos de Atendimento"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">
                Descrição (opcional)
              </label>
              <Textarea
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                placeholder="Descreva o tipo de informação que será armazenada..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim()}
            >
              Criar Base
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Base de Conhecimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a base de conhecimento "{knowledgeBaseToDelete}"? 
              Esta ação é irreversível e removerá todos os documentos, chunks e embeddings associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteKnowledgeBase}
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