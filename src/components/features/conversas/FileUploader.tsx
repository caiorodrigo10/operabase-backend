/**
 * FASE 3: Componente de Upload de Arquivos para Supabase Storage
 * Interface para upload de arquivos em conversas
 */

import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Paperclip, 
  Upload, 
  X, 
  File, 
  Image, 
  Music, 
  Video,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface FileUploadProps {
  conversationId: string;
  onUploadComplete?: (message: any) => void;
  className?: string;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function FileUploader({ conversationId, onUploadComplete, className }: FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Mutation para upload de arquivo
  const uploadMutation = useMutation({
    mutationFn: async ({ file, fileId }: { file: File; fileId: string }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/conversations-simple/${conversationId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro no upload');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Atualizar status do arquivo para sucesso
      setUploadFiles(prev => prev.map(f => 
        f.id === variables.fileId 
          ? { ...f, status: 'success', progress: 100 }
          : f
      ));

      // Callback de sucesso
      if (onUploadComplete) {
        onUploadComplete(data.message);
      }

      // Invalidar cache das conversas
      queryClient.invalidateQueries(['conversations-simple', conversationId]);
      queryClient.invalidateQueries(['conversations-simple']);

      // Remover arquivo da lista após 2 segundos
      setTimeout(() => {
        setUploadFiles(prev => prev.filter(f => f.id !== variables.fileId));
      }, 2000);
    },
    onError: (error: Error, variables) => {
      // Atualizar status do arquivo para erro
      setUploadFiles(prev => prev.map(f => 
        f.id === variables.fileId 
          ? { ...f, status: 'error', error: error.message }
          : f
      ));
    },
  });

  // Validar arquivo
  const validateFile = (file: File): string | null => {
    // Tamanho máximo: 50MB
    if (file.size > 50 * 1024 * 1024) {
      return 'Arquivo muito grande (máximo 50MB)';
    }

    // Tipos permitidos
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Tipo de arquivo não permitido';
    }

    return null;
  };

  // Processar arquivos selecionados
  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files);
    const newUploadFiles: UploadFile[] = [];

    fileArray.forEach(file => {
      const validation = validateFile(file);
      const fileId = `${Date.now()}-${file.name}`;

      if (validation) {
        newUploadFiles.push({
          file,
          id: fileId,
          progress: 0,
          status: 'error',
          error: validation
        });
      } else {
        newUploadFiles.push({
          file,
          id: fileId,
          progress: 0,
          status: 'pending'
        });
      }
    });

    setUploadFiles(prev => [...prev, ...newUploadFiles]);

    // Iniciar upload dos arquivos válidos
    newUploadFiles
      .filter(f => f.status === 'pending')
      .forEach(uploadFile => {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading' }
            : f
        ));

        uploadMutation.mutate({
          file: uploadFile.file,
          fileId: uploadFile.id
        });
      });
  };

  // Click no input
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  // Remover arquivo da lista
  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Ícone baseado no tipo de arquivo
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  // Status icon
  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Botão de upload */}
      <div
        className={cn(
          "relative",
          isDragOver && "ring-2 ring-blue-500 ring-offset-2"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleButtonClick}
          className="text-gray-500 hover:text-gray-700 flex-shrink-0 w-10 h-10"
          disabled={uploadMutation.isPending}
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.csv"
        />

        {/* Overlay de drag and drop */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center z-10">
            <div className="text-center">
              <Upload className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-blue-600">Solte os arquivos aqui</p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de arquivos em upload */}
      {uploadFiles.length > 0 && (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {uploadFiles.map(uploadFile => (
            <div
              key={uploadFile.id}
              className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg text-sm"
            >
              {getFileIcon(uploadFile.file)}
              
              <div className="flex-1 min-w-0">
                <p className="truncate text-gray-700">
                  {uploadFile.file.name}
                </p>
                
                {uploadFile.status === 'uploading' && (
                  <Progress value={uploadFile.progress} className="h-1 mt-1" />
                )}
                
                {uploadFile.status === 'error' && (
                  <p className="text-red-500 text-xs mt-1">
                    {uploadFile.error}
                  </p>
                )}
                
                {uploadFile.status === 'success' && (
                  <p className="text-green-500 text-xs mt-1">
                    Enviado com sucesso
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-1">
                {getStatusIcon(uploadFile.status)}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadFile.id)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}