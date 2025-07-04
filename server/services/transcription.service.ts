import OpenAI from 'openai';

class TranscriptionService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    try {
      console.log('🔤 Iniciando transcrição Whisper...', { 
        filename, 
        size: audioBuffer.length,
        sizeKB: Math.round(audioBuffer.length / 1024)
      });
      
      // Verificar se o buffer não está vazio
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Buffer de áudio está vazio');
      }
      
      // Criar File object para Whisper API
      const audioFile = new File([audioBuffer], filename, { 
        type: 'audio/webm;codecs=opus' 
      });
      
      console.log('📤 Enviando para Whisper API...', {
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileType: audioFile.type
      });
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt', // Português brasileiro
        response_format: 'text',
        prompt: 'Este é um áudio de um profissional de saúde enviando uma mensagem para um paciente via WhatsApp.' // Context para melhor transcrição
      });
      
      console.log('✅ Transcrição Whisper completada:', {
        originalLength: audioBuffer.length,
        transcriptionLength: transcription.length,
        preview: transcription.substring(0, 100) + (transcription.length > 100 ? '...' : '')
      });
      
      return transcription;
      
    } catch (error: any) {
      console.error('❌ Erro na transcrição Whisper:', {
        message: error.message,
        type: error.constructor.name,
        filename,
        bufferSize: audioBuffer?.length || 0
      });
      throw new Error(`Falha na transcrição: ${error.message}`);
    }
  }
}

export default TranscriptionService;