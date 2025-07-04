interface EvolutionMediaPayload {
  number: string;
  mediatype: 'image' | 'video' | 'document' | 'audio';
  mimetype: string;
  media: string;
  fileName?: string;
  caption?: string;
  delay?: number;
  presence?: 'composing' | 'recording';
}

interface EvolutionAudioPayload {
  number: string;
  audio: string;
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
  quoted?: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message: any;
  };
}

interface EvolutionResponse {
  key?: {
    id: string;
    remoteJid: string;
    fromMe: boolean;
  };
  message?: any;
  messageTimestamp?: string;
  status?: string;
}

export class EvolutionAPIService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_URL || '';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    
    if (!this.baseUrl || !this.apiKey) {
      console.warn('⚠️ Evolution API not configured properly');
    }
  }

  async sendMedia(instanceId: string, payload: EvolutionMediaPayload): Promise<EvolutionResponse> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Evolution API not configured');
    }

    console.log(`📡 Sending media via Evolution API to instance ${instanceId}:`);
    console.log('📡 Full payload received:', JSON.stringify(payload, null, 2));
    console.log('📡 Payload details:', {
      hasNumber: !!payload?.number,
      number: payload?.number,
      mediatype: payload?.mediatype,
      mimetype: payload?.mimetype,
      hasCaption: !!payload?.caption
    });

    try {
      const response = await fetch(`${this.baseUrl}/message/sendMedia/${instanceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Evolution API error ${response.status}:`, errorText);
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      const result: EvolutionResponse = await response.json();
      console.log('✅ Evolution API response:', {
        messageId: result.key?.id,
        status: result.status
      });

      return result;

    } catch (error) {
      console.error('❌ Evolution API request failed:', error);
      throw error;
    }
  }

  async sendWhatsAppAudio(instanceId: string, payload: EvolutionAudioPayload): Promise<EvolutionResponse> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Evolution API not configured');
    }

    console.log(`🎤 Sending WhatsApp audio via Evolution API to instance ${instanceId}:`);
    console.log('🎤 Audio payload received:', JSON.stringify(payload, null, 2));
    console.log('🎤 Audio payload details:', {
      hasNumber: !!payload?.number,
      number: payload?.number,
      hasAudio: !!payload?.audio,
      audioLength: payload?.audio?.length || 0,
      delay: payload?.delay
    });

    try {
      const response = await fetch(`${this.baseUrl}/message/sendWhatsAppAudio/${instanceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Evolution API audio error ${response.status}:`, errorText);
        throw new Error(`Evolution API audio error: ${response.status} - ${errorText}`);
      }

      const result: EvolutionResponse = await response.json();
      console.log('✅ Evolution API audio response:', {
        messageId: result.key?.id,
        status: result.status,
        messageTimestamp: result.messageTimestamp
      });

      return result;

    } catch (error) {
      console.error('❌ Evolution API audio request failed:', error);
      throw error;
    }
  }

  async sendText(instanceId: string, number: string, text: string): Promise<EvolutionResponse> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Evolution API not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/message/sendText/${instanceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify({
          number,
          text
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Evolution API text send failed:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!(this.baseUrl && this.apiKey);
  }
}