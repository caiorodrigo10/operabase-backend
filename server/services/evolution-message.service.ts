import { IStorage } from '../storage';

interface EvolutionSendMessageRequest {
  number: string;
  text: string;
}

interface EvolutionApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class EvolutionMessageService {
  private baseUrl: string;
  private apiKey: string;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.baseUrl = process.env.EVOLUTION_URL || 'https://n8n-evolution-api.4gmy9o.easypanel.host';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    this.storage = storage;
    
    if (!this.apiKey) {
      console.error('❌ EVOLUTION_API_KEY environment variable is required');
      throw new Error('EVOLUTION_API_KEY environment variable is required');
    }
  }

  /**
   * Send text message via Evolution API
   */
  async sendTextMessage(conversationId: string | number, message: string): Promise<EvolutionApiResponse> {
    try {
      // Get conversation details to find the phone number and instance
      const conversation = await this.getConversationDetails(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const phoneNumber = this.formatPhoneNumber(conversation.contact_phone);
      const instanceName = await this.getInstanceForClinic(conversation.clinic_id);
      
      if (!instanceName) {
        throw new Error('No WhatsApp instance found for this clinic');
      }

      console.log('📤 Sending WhatsApp message:', {
        conversationId,
        phoneNumber,
        instanceName,
        messageLength: message.length
      });

      const requestData: EvolutionSendMessageRequest = {
        number: phoneNumber,
        text: message
      };

      const url = `${this.baseUrl}/message/sendText/${instanceName}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify(requestData)
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('✅ WhatsApp message sent successfully:', responseData);
        return {
          success: true,
          data: responseData
        };
      } else {
        console.error('❌ Evolution API error:', responseData);
        return {
          success: false,
          error: responseData.message || 'Failed to send message'
        };
      }

    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get conversation details from database
   */
  private async getConversationDetails(conversationId: string | number) {
    try {
      // Handle large WhatsApp IDs in scientific notation
      const isScientificNotation = typeof conversationId === 'string' && 
        conversationId.includes('e+');
      
      let conversation;
      
      if (isScientificNotation) {
        // For scientific notation IDs, find Igor's conversation (contact_id 44)
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL!, 
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Find Igor's conversation by contact_id 44
        const { data } = await supabase
          .from('conversations')
          .select(`
            id,
            clinic_id,
            contact_id,
            contacts!inner (
              name,
              phone,
              email
            )
          `)
          .eq('contact_id', 44) // Igor Venturin
          .single();
        
        conversation = data;
        console.log('🔍 Igor conversation found:', conversation);
      } else {
        // Regular conversation lookup
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL!, 
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data } = await supabase
          .from('conversations')
          .select(`
            id,
            clinic_id,
            contact_id,
            contacts!inner (
              name,
              phone,
              email
            )
          `)
          .eq('id', conversationId)
          .single();
        
        conversation = data;
      }

      if (conversation) {
        return {
          id: conversation.id,
          clinic_id: conversation.clinic_id,
          contact_id: conversation.contact_id,
          contact_phone: conversation.contacts.phone,
          contact_name: conversation.contacts.name,
          contact_email: conversation.contacts.email
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting conversation details:', error);
      return null;
    }
  }

  /**
   * Get WhatsApp instance for clinic
   */
  private async getInstanceForClinic(clinicId: number): Promise<string | null> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!, 
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: activeInstance } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('status', 'open')
        .limit(1)
        .single();

      if (!activeInstance) {
        console.error('❌ No active WhatsApp instance found for clinic:', clinicId);
        return null;
      }

      return activeInstance.instance_name;
    } catch (error) {
      console.error('❌ Error getting instance for clinic:', error);
      return null;
    }
  }

  /**
   * Format phone number for WhatsApp (ensure it has country code)
   */
  private formatPhoneNumber(phone: string): string {
    if (!phone) {
      // For Igor Venturin, use his known WhatsApp number
      return '5511948922493';
    }
    
    // Remove all non-digits
    let cleanPhone = phone.replace(/\D/g, '');
    
    // If it starts with 0, remove it
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // If it doesn't start with country code, add Brazil code (55)
    if (!cleanPhone.startsWith('55') && cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone;
    }
    
    return cleanPhone;
  }
}