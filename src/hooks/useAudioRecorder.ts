import { useState, useRef, useCallback } from 'react';

interface AudioRecorderState {
  isRecording: boolean;
  audioBlob: Blob | null;
  duration: number;
  error: string | null;
  isSupported: boolean;
}

interface UseAudioRecorderReturn extends AudioRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  getAudioFile: () => File | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    audioBlob: null,
    duration: 0,
    error: null,
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateDuration = useCallback(() => {
    if (startTimeRef.current) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState(prev => ({ ...prev, duration: elapsed }));
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Gravação de áudio não suportada neste navegador' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Try webm first, fallback to mp4
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        
        setState(prev => ({ 
          ...prev, 
          audioBlob: blob, 
          isRecording: false 
        }));

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        setState(prev => ({ 
          ...prev, 
          error: 'Erro durante a gravação', 
          isRecording: false 
        }));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms

      startTimeRef.current = Date.now();
      setState(prev => ({ ...prev, isRecording: true, duration: 0 }));

      // Start duration timer
      durationIntervalRef.current = setInterval(updateDuration, 1000);

    } catch (error) {
      let errorMessage = 'Erro ao acessar o microfone';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permissão negada. Por favor, permita o acesso ao microfone.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Microfone não encontrado.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Gravação não suportada neste navegador.';
        }
      }

      setState(prev => ({ ...prev, error: errorMessage }));
    }
  }, [state.isSupported, updateDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [state.isRecording]);

  const resetRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      stopRecording();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setState({
      isRecording: false,
      audioBlob: null,
      duration: 0,
      error: null,
      isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
    });

    mediaRecorderRef.current = null;
    startTimeRef.current = 0;
    chunksRef.current = [];
  }, [state.isRecording, stopRecording]);

  const getAudioFile = useCallback((): File | null => {
    if (!state.audioBlob) return null;

    const timestamp = Date.now();
    const extension = state.audioBlob.type.includes('webm') ? 'webm' : 
                     state.audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
    
    return new File([state.audioBlob], `gravacao_${timestamp}.${extension}`, {
      type: state.audioBlob.type
    });
  }, [state.audioBlob]);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetRecording,
    getAudioFile
  };
}