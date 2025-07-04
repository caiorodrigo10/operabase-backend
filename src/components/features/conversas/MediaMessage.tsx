import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  FileIcon, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileText,
  Play,
  Pause,
  Download,
  ZoomIn,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaMessageProps {
  media_type: string; // Accept any string (file_type from database)
  media_url: string;
  media_filename?: string;
  media_size?: number;
  media_duration?: number;
  media_thumbnail?: string;
  className?: string;
}

function getMediaTypeFromMimeType(mimeType: string): 'image' | 'video' | 'audio' | 'audio_file' | 'document' {
  // Primeiro, verificar se é um tipo de mensagem direto
  if (mimeType === 'audio_file') return 'audio_file'; // Áudio de arquivo upload
  if (mimeType === 'audio_voice') return 'audio'; // Áudio de voz WhatsApp
  
  // Verificar variações de áudio comuns do WhatsApp
  if (mimeType === 'audio/mp4' || mimeType === 'audio/mpeg' || mimeType === 'audio/ogg' || mimeType === 'audio/wav') {
    return 'audio';
  }
  
  // Depois verificar MIME types tradicionais
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio'; // Áudio genérico do WhatsApp
  return 'document';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getFileIcon(filename?: string) {
  if (!filename) return <FileIcon className="w-8 h-8" />;
  
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'pdf':
      return <FileText className="w-8 h-8 text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="w-8 h-8 text-blue-500" />;
    case 'xls':
    case 'xlsx':
      return <FileText className="w-8 h-8 text-green-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <FileImage className="w-8 h-8 text-purple-500" />;
    case 'mp4':
    case 'avi':
    case 'mov':
      return <FileVideo className="w-8 h-8 text-orange-500" />;
    case 'mp3':
    case 'wav':
    case 'ogg':
      return <FileAudio className="w-8 h-8 text-indigo-500" />;
    default:
      return <FileIcon className="w-8 h-8 text-gray-500" />;
  }
}

export function MediaMessage({ 
  media_type, 
  media_url, 
  media_filename, 
  media_size, 
  media_duration,
  media_thumbnail,
  className 
}: MediaMessageProps) {
  // Convert MIME type to media category
  const actualMediaType = getMediaTypeFromMimeType(media_type);
  

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [showTranscription, setShowTranscription] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element when media_url changes
  useEffect(() => {
    if (media_url && (actualMediaType === 'audio' || actualMediaType === 'audio_file')) {
      // Initialize audio player for Supabase Storage files
      
      // Create audio element
      const audio = new Audio();
      audio.preload = 'metadata';
      // Remove CORS restriction for Supabase signed URLs
      // audio.crossOrigin = 'anonymous';
      
      // Set up event listeners
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setProgress(0);
      };

      const handleError = (e: any) => {
        setIsPlaying(false);
        // Continue with standard audio player regardless of codec issues
      };

      const handleCanPlay = () => {
        // Audio is ready to play
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('canplay', handleCanPlay);
      
      // Set source and load
      audio.src = media_url;
      audioRef.current = audio;
      

      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.pause();
        audio.src = '';
        audioRef.current = null;
      };
    }
  }, [media_url, actualMediaType]);

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    // Simulate transcription process
    setTimeout(() => {
      setTranscription("Olá doutor, estava pensando sobre o que conversamos na última consulta e gostaria de saber se posso continuar tomando o medicamento no mesmo horário ou se preciso fazer algum ajuste na dosagem.");
      setIsTranscribing(false);
      setShowTranscription(true);
    }, 2000);
  };

  const handlePlayPause = async () => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    const newTime = (percentage / 100) * audioRef.current.duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(percentage);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (actualMediaType === 'image') {
    return (
      <div className={cn("max-w-[200px]", className)}>
        <Dialog>
          <DialogTrigger asChild>
            <div className="relative group cursor-pointer">
              <img
                src={media_url}
                alt={media_filename || "Imagem"}
                className="w-full h-auto max-h-[150px] object-cover rounded-lg border"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] p-2">
            <img
              src={media_url}
              alt={media_filename || "Imagem"}
              className="w-full h-auto max-h-full object-contain"
            />
            {media_filename && (
              <p className="text-sm text-gray-600 text-center mt-2">{media_filename}</p>
            )}
          </DialogContent>
        </Dialog>
        {media_filename && (
          <p className="text-xs text-gray-500 mt-1 truncate">{media_filename}</p>
        )}
        {media_size && (
          <p className="text-xs text-gray-400">{formatFileSize(media_size)}</p>
        )}
      </div>
    );
  }

  if (actualMediaType === 'video') {
    return (
      <div className={cn("max-w-[250px]", className)}>
        <div className="relative">
          <video
            src={media_url}
            poster={media_thumbnail}
            controls
            className="w-full h-auto max-h-[150px] rounded-lg border"
            preload="metadata"
          >
            Seu navegador não suporta reprodução de vídeo.
          </video>
          {media_duration && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {formatDuration(media_duration)}
            </div>
          )}
        </div>
        {media_filename && (
          <p className="text-xs text-gray-500 mt-1 truncate">{media_filename}</p>
        )}
        {media_size && (
          <p className="text-xs text-gray-400">{formatFileSize(media_size)}</p>
        )}
      </div>
    );
  }

  if (actualMediaType === 'audio' || actualMediaType === 'audio_file') {
    const isAudioFile = actualMediaType === 'audio_file';
    
    return (
      <div className={cn("min-w-[200px] max-w-[280px]", className)}>
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 rounded-full hover:bg-blue-600 text-white bg-[#0f766e]"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Áudio
              </div>
              <div className="text-xs text-gray-500">
                {formatDuration(currentTime)} / {formatDuration(duration || media_duration)}
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1 cursor-pointer" onClick={handleSeek}>
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {/* Indicador para áudio de arquivo */}
          {isAudioFile && (
            <div className="mt-2">
              <span className="text-xs text-gray-500 italic">Áudio encaminhado</span>
            </div>
          )}
        </div>
        
        {/* Transcription Section */}
        <div className="mt-2 space-y-2">
          {!showTranscription && !transcription && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTranscribe}
              disabled={isTranscribing}
              className="h-7 px-3 text-xs hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950 text-[#ffffff]"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Transcrevendo...
                </>
              ) : (
                <>
                  <FileText className="w-3 h-3 mr-1" />
                  Transcrever
                </>
              )}
            </Button>
          )}
          
          {showTranscription && transcription && (
            <div className="bg-blue-50 dark:bg-blue-950/50 p-2 rounded border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Transcrição:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTranscription(false)}
                  className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  ×
                </Button>
              </div>
              <p className="text-xs text-blue-900 dark:text-blue-100 leading-relaxed">
                {transcription}
              </p>
            </div>
          )}
        </div>
        
        {media_size && (
          <p className="text-xs text-gray-400 mt-1">{formatFileSize(media_size)}</p>
        )}
      </div>
    );
  }

  if (actualMediaType === 'document') {
    return (
      <div className={cn("min-w-[200px] max-w-[250px]", className)}>
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {getFileIcon(media_filename)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {media_filename || "Documento"}
              </div>
              {media_size && (
                <div className="text-xs text-gray-500">{formatFileSize(media_size)}</div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}