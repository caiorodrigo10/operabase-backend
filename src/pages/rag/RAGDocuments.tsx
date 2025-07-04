import { useState } from "react";
import { FileText, ExternalLink, Upload, Trash2, RefreshCw, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface RAGDocument {
  id: number;
  title: string;
  content_type: 'text' | 'url' | 'pdf';
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export default function RAGDocuments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar documentos
  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['/api/rag/documents'],
    queryFn: async () => {
      const response = await fetch('/api/rag/documents');
      if (!response.ok) {
        throw new Error('Falha ao carregar documentos');
      }
      return response.json() as Promise<RAGDocument[]>;
    }
  });

  // Mutation para deletar documento
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/rag/documents/${documentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar documento');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Documento deletado",
        description: "Documento removido com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rag/documents'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'pdf':
        return <Upload className="h-4 w-4 text-red-600" />;
      case 'url':
        return <ExternalLink className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Processado</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Processando</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDelete = (documentId: number, title: string) => {
    if (confirm(`Tem certeza que deseja deletar "${title}"?`)) {
      deleteMutation.mutate(documentId);
    }
  };

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">Erro ao carregar documentos</h2>
          <p className="text-gray-600">Não foi possível carregar os documentos RAG</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos RAG</h1>
          <p className="text-gray-600">
            Gerencie seus documentos da base de conhecimento
          </p>
        </div>
        <Link href="/rag/upload">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Documento
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum documento encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              Comece adicionando textos, URLs ou PDFs à sua base de conhecimento
            </p>
            <Link href="/rag/upload">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Documento
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => (
            <Card key={document.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getTypeIcon(document.content_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {document.title}
                        </h3>
                        {getStatusBadge(document.processing_status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="capitalize">{document.content_type}</span>
                        <span>
                          Criado em {new Date(document.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      {document.error_message && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          Erro: {document.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/rag/documents'] })}
                      disabled={document.processing_status === 'processing'}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(document.id, document.title)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}