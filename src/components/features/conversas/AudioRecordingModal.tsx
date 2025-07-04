import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Send, X, AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';

interface AudioRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (audioFile: File) => void;
  isUploading?: boolean;
}

export function AudioRecordingModal({ 
  isOpen, 
  onClose, 
  onSend, 
  isUploading = false 
}: AudioRecordingModalProps) {
  const {
    isRecording,
    audioBlob,
    duration,
    error,
    isSupported,
    startRecording,
    stopRecording,
    resetRecording,
    getAudioFile
  } = useAudioRecorder();

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Create audio URL when blob is available
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      
      return () => {
        URL.revokeObjectURL(url);
        audio.remove();
      };
    } else {
      setAudioUrl(null);
      setAudioElement(null);
    }
  }, [audioBlob]);

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetRecording();
      setIsPlaying(false);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    }
  }, [isOpen, resetRecording, audioUrl]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handlePlayPause = () => {
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    const audioFile = getAudioFile();
    if (audioFile) {
      // 🎯 ESTRATÉGIA 1: Fechar modal IMEDIATAMENTE para evitar cliques duplos
      onClose();
      
      // 🎯 ESTRATÉGIA 2: Enviar arquivo em background
      onSend(audioFile);
    }
  };

  const handleCancel = () => {
    resetRecording();
    onClose();
  };

  if (!isSupported) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Gravação não suportada
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Seu navegador não suporta gravação de áudio. Por favor, use o botão de anexo para enviar um arquivo de áudio.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Gravar áudio
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center space-y-6">
            {/* Recording indicator */}
            <div className="flex flex-col items-center space-y-2">
              <div 
                className={cn(
                  "w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-300",
                  isRecording 
                    ? "border-red-500 bg-red-50 animate-pulse" 
                    : audioBlob 
                    ? "border-green-500 bg-green-50" 
                    : "border-gray-300 bg-gray-50"
                )}
              >
                <Mic 
                  className={cn(
                    "h-8 w-8 transition-colors",
                    isRecording 
                      ? "text-red-500" 
                      : audioBlob 
                      ? "text-green-500" 
                      : "text-gray-400"
                  )} 
                />
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-mono font-bold">
                  {formatDuration(duration)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isRecording 
                    ? "Gravando..." 
                    : audioBlob 
                    ? "Gravação concluída" 
                    : "Pronto para gravar"
                  }
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              {!audioBlob ? (
                // Recording controls
                <>
                  {!isRecording ? (
                    <Button
                      onClick={handleStartRecording}
                      size="lg"
                      className="rounded-full w-16 h-16 p-0"
                    >
                      <Mic className="h-6 w-6" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopRecording}
                      variant="destructive"
                      size="lg"
                      className="rounded-full w-16 h-16 p-0"
                    >
                      <Square className="h-6 w-6" />
                    </Button>
                  )}
                </>
              ) : (
                // Playback controls
                <>
                  <Button
                    onClick={handlePlayPause}
                    variant="outline"
                    size="lg"
                    className="rounded-full w-12 h-12 p-0"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isUploading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>

          {audioBlob && (
            <Button 
              onClick={handleSend}
              disabled={isUploading}
              className="ml-2"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}