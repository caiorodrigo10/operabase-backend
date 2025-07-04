import { WhatsAppNumber, InsertWhatsAppNumber } from "@shared/schema";

interface EvolutionApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface QRCodeResponse {
  base64: string;
  code: string;
}

interface InstanceInfo {
  instance: {
    instanceName: string;
    status: string;
  };
  hash?: {
    apikey: string;
  };
}

export class EvolutionApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || 'https://n8n-evolution-api.4gmy9o.easypanel.host';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    
    console.log(`🔧 Evolution API Configuration:`);
    console.log(`📍 Base URL: ${this.baseUrl}`);
    console.log(`🔑 API Key: ${this.apiKey ? 'SET' : 'NOT SET'}`);
    
    if (!this.apiKey) {
      console.error('❌ EVOLUTION_API_KEY environment variable is required');
      throw new Error('EVOLUTION_API_KEY environment variable is required');
    }
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any): Promise<EvolutionApiResponse> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`🌐 Making request to: ${method} ${url}`);
      
      if (data) {
        console.log(`📤 Request body:`, JSON.stringify(data, null, 2));
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      console.log(`📥 Response status: ${response.status} ${response.statusText}`);

      let result;
      try {
        result = await response.json();
        console.log(`📄 Response body:`, JSON.stringify(result, null, 2));
      } catch (parseError) {
        const textResult = await response.text();
        console.log(`📄 Response text:`, textResult);
        throw new Error(`Failed to parse JSON response: ${textResult}`);
      }
      
      if (!response.ok) {
        return {
          success: false,
          error: result.message || result.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error(`❌ Request failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate a unique instance name based on clinic and user IDs
   */
  generateInstanceName(clinicId: number, userId: number | string): string {
    const timestamp = Date.now();
    return `clinic_${clinicId}_user_${userId}_${timestamp}`;
  }

  /**
   * Create a new WhatsApp instance
   */
  async createInstance(instanceName: string): Promise<EvolutionApiResponse> {
    const data = {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      rejectCall: true,
      groupsIgnore: true,
      webhook: {
        url: "https://digibrandsflowsn8n.4gmy9o.easypanel.host/webhook/4acb17e9-5fbf-4aad-a722-0339338c5be8",
        events: [
          "MESSAGES_UPSERT",
          "CONNECTION_UPDATE"
        ]
      }
    };

    return this.makeRequest('/instance/create', 'POST', data);
  }

  /**
   * Get QR Code for instance connection
   */
  async getQRCode(instanceName: string): Promise<EvolutionApiResponse> {
    return this.makeRequest(`/instance/connect/${instanceName}`);
  }

  /**
   * Check instance connection status
   */
  async getInstanceStatus(instanceName: string): Promise<EvolutionApiResponse> {
    return this.makeRequest(`/instance/connectionState/${instanceName}`);
  }

  /**
   * Get instance information including phone number
   */
  async getInstanceInfo(instanceName: string): Promise<EvolutionApiResponse> {
    return this.makeRequest(`/instance/fetchInstances?instanceName=${instanceName}`);
  }

  /**
   * Delete an instance
   */
  async deleteInstance(instanceName: string): Promise<EvolutionApiResponse> {
    return this.makeRequest(`/instance/delete/${instanceName}`, 'DELETE');
  }

  /**
   * Start the connection process for a new WhatsApp number
   */
  async startConnection(clinicId: number, userId: number | string): Promise<{
    success: boolean;
    instanceName?: string;
    qrCode?: string;
    error?: string;
  }> {
    const instanceName = this.generateInstanceName(clinicId, userId);
    
    // Create the instance
    const createResult = await this.createInstance(instanceName);
    if (!createResult.success) {
      return {
        success: false,
        error: `Failed to create instance: ${createResult.error}`
      };
    }

    // Get QR Code
    const qrResult = await this.getQRCode(instanceName);
    if (!qrResult.success) {
      // Clean up the created instance
      await this.deleteInstance(instanceName);
      return {
        success: false,
        error: `Failed to get QR code: ${qrResult.error}`
      };
    }

    return {
      success: true,
      instanceName,
      qrCode: qrResult.data?.base64 || qrResult.data?.code
    };
  }

  /**
   * Check if an instance is connected and get phone number
   */
  async checkConnection(instanceName: string): Promise<{
    success: boolean;
    connected: boolean;
    phoneNumber?: string;
    error?: string;
  }> {
    const statusResult = await this.getInstanceStatus(instanceName);
    if (!statusResult.success) {
      return {
        success: false,
        connected: false,
        error: statusResult.error
      };
    }

    const isConnected = statusResult.data?.instance?.state === 'open';
    
    if (!isConnected) {
      return {
        success: true,
        connected: false
      };
    }

    // Get instance info to retrieve phone number
    const infoResult = await this.getInstanceInfo(instanceName);
    if (!infoResult.success) {
      return {
        success: true,
        connected: true,
        error: 'Connected but could not retrieve phone number'
      };
    }

    const phoneNumber = infoResult.data?.[0]?.instance?.owner?.user || 
                       infoResult.data?.instance?.owner?.user;

    return {
      success: true,
      connected: true,
      phoneNumber: phoneNumber ? phoneNumber.replace('@c.us', '') : undefined
    };
  }

  /**
   * Send a test message to verify connection
   */
  async sendTestMessage(instanceName: string, phoneNumber: string): Promise<EvolutionApiResponse> {
    const data = {
      number: phoneNumber,
      text: "✅ WhatsApp conectado com sucesso! Este é um teste de conexão."
    };

    return this.makeRequest(`/message/sendText/${instanceName}`, 'POST', data);
  }

  /**
   * Disconnect and clean up an instance
   */
  async disconnectInstance(instanceName: string): Promise<EvolutionApiResponse> {
    // First try to logout the session
    const logoutResult = await this.makeRequest(`/instance/logout/${instanceName}`, 'DELETE');
    
    // Then delete the instance
    const deleteResult = await this.deleteInstance(instanceName);
    
    if (!deleteResult.success) {
      return deleteResult;
    }

    return {
      success: true,
      data: { logout: logoutResult.success, delete: deleteResult.success }
    };
  }
}

export const evolutionApi = new EvolutionApiService();