import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { X, Upload, FileIcon, Image, Video, Music, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpload } from '@/hooks/useUpload';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onUploadSuccess?: (result: any) => void;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

// Tipos MIME permitidos
const allowedTypes = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/mov', 'video/avi', 'video/webm',
  'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a',
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
  if (file.type.startsWith('audio/')) return <Music className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function FileUploadModal({ isOpen, onClose, conversationId, onUploadSuccess }: FileUploadModalProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [caption, setCaption] = useState('');
  const [sendToWhatsApp, setSendToWhatsApp] = useState(true);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  
  // ETAPA 5.3: Transition state management to prevent button flicker
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStage, setTransitionStage] = useState<'idle' | 'optimistic' | 'fetching' | 'complete'>('idle');
  
  const uploadMutation = useUpload();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => {
      // Validar tamanho
      if (file.size > 50 * 1024 * 1024) { // 50MB
        alert(`Arquivo ${file.name} é muito grande. Máximo: 50MB`);
        return null;
      }
      
      // Validar tipo
      if (!allowedTypes.includes(file.type)) {
        alert(`Tipo de arquivo não suportado: ${file.type}`);
        return null;
      }

      const fileWithPreview: FileWithPreview = Object.assign(file, {
        id: Math.random().toString(36).substr(2, 9),
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      });
      
      return fileWithPreview;
    }).filter(Boolean) as FileWithPreview[];

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: status !== 'idle',
    maxFiles: 1 // Um arquivo por vez por enquanto
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Cleanup URLs
      prev.forEach(f => {
        if (f.preview && f.id === fileId) {
          URL.revokeObjectURL(f.preview);
        }
      });
      return updated;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    // ETAPA 5.3: Start transition state management
    setIsTransitioning(true);
    setTransitionStage('optimistic');

    console.log('📤 ETAPA 5.3: Starting upload with transition management');
    console.log('📤 FileUploadModal: Starting upload with conversationId:', conversationId);
    console.log('📤 FileUploadModal: conversationId type:', typeof conversationId);
    console.log('📤 FileUploadModal: conversationId length:', conversationId?.length);

    setStatus('uploading');
    setProgress(0);
    
    try {
      const file = files[0];
      
      // Simular progresso de upload (0-50%)
      for (let p = 0; p <= 50; p += 10) {
        setProgress(p);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setStatus('processing');
      
      // ETAPA 5.3: Mark transition to fetching stage
      setTransitionStage('fetching');
      
      console.log('📤 FileUploadModal: Calling uploadMutation with:', {
        conversationId,
        fileName: file.name,
        fileSize: file.size,
        caption: caption.trim() || undefined,
        sendToWhatsApp
      });
      
      const uploadResult = await uploadMutation.mutateAsync({
        conversationId,
        file,
        caption: caption.trim() || undefined,
        sendToWhatsApp
      });
      
      // ETAPA 5.3: Wait for cache replacement to complete before completing transition
      console.log('🔄 ETAPA 5.3: Upload successful, waiting for cache stabilization...');
      setTimeout(() => {
        setTransitionStage('complete');
        setIsTransitioning(false);
        console.log('✅ ETAPA 5.3: Transition completed - attachment fully stable');
      }, 1500); // Give time for cache replacement to complete
      
      // Progresso final (50-100%)
      for (let p = 51; p <= 100; p += 10) {
        setProgress(p);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setStatus('success');
      setResult(uploadResult);
      
      onUploadSuccess?.(uploadResult);
      
      // Fechar modal após 2 segundos
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('error');
      setResult({ error: error instanceof Error ? error.message : 'Erro no upload' });
      // Reset transition on error
      setIsTransitioning(false);
      setTransitionStage('idle');
    }
  };

  const handleClose = () => {
    // Cleanup object URLs
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    setFiles([]);
    setCaption('');
    setSendToWhatsApp(true);
    setStatus('idle');
    setProgress(0);
    setResult(null);
    
    // ETAPA 5.3: Reset transition state
    setIsTransitioning(false);
    setTransitionStage('idle');
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Arquivo</DialogTitle>
          <DialogDescription>
            Envie imagens, vídeos, áudios ou documentos para a conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status de upload */}
          {status !== 'idle' && (
            <div className="space-y-2">
              {status === 'uploading' && (
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-blue-500 animate-pulse" />
                  <span className="text-sm text-blue-600">Enviando arquivo...</span>
                </div>
              )}
              {status === 'processing' && (
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-orange-500 animate-pulse" />
                  <span className="text-sm text-orange-600">Processando...</span>
                </div>
              )}
              {status === 'success' && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    {result?.data?.whatsapp?.sent ? 'Enviado com sucesso!' : 'Arquivo salvo (WhatsApp indisponível)'}
                  </span>
                </div>
              )}
              {status === 'error' && (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">
                    {result?.error || 'Erro no upload'}
                  </span>
                </div>
              )}
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Área de Drop */}
          {status === 'idle' && (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {isDragActive 
                  ? "Solte os arquivos aqui..."
                  : "Arraste arquivos aqui ou clique para selecionar"
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Imagens, vídeos, áudios ou documentos (máx. 50MB)
              </p>
            </div>
          )}

          {/* Lista de arquivos */}
          {files.length > 0 && status === 'idle' && (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center space-x-3 p-2 border rounded-lg">
                  {file.preview ? (
                    <img src={file.preview} alt="" className="h-10 w-10 object-cover rounded" />
                  ) : (
                    <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                      {getFileIcon(file)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Caption */}
          {status === 'idle' && (
            <div>
              <Textarea
                placeholder="Adicione uma mensagem (opcional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          )}

          {/* Configurações */}
          {status === 'idle' && (
            <div className="flex items-center space-x-2">
              <Switch
                id="whatsapp-send"
                checked={sendToWhatsApp}
                onCheckedChange={setSendToWhatsApp}
              />
              <Label htmlFor="whatsapp-send" className="text-sm">
                Enviar via WhatsApp
              </Label>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={status === 'uploading' || status === 'processing'}
            >
              {status === 'success' ? 'Fechar' : 'Cancelar'}
            </Button>
            {status === 'idle' && (
              <Button 
                onClick={handleUpload} 
                disabled={files.length === 0 || isTransitioning}
                className="min-w-[100px]"
              >
                {isTransitioning && transitionStage === 'optimistic' && 'Enviando...'}
                {isTransitioning && transitionStage === 'fetching' && 'Processando...'}
                {isTransitioning && transitionStage === 'complete' && 'Enviado'}
                {!isTransitioning && 'Enviar'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}