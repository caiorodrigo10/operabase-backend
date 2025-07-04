import { MCPPrompt } from './mcp-protocol';

/**
 * MCP Prompts Registry - Define todos os prompts versionados conforme especificação MCP
 */
export class MCPPromptsRegistry {
  private static prompts: MCPPrompt[] = [
    {
      name: 'appointment_creation_prompt',
      description: 'Prompt para criação de consultas com extração de dados de linguagem natural',
      arguments: [
        {
          name: 'user_message',
          description: 'Mensagem do usuário contendo informações sobre o agendamento',
          required: true
        },
        {
          name: 'context',
          description: 'Contexto adicional da conversa',
          required: false
        }
      ]
    },
    {
      name: 'appointment_clarification_prompt',
      description: 'Prompt para solicitar informações faltantes sobre agendamentos',
      arguments: [
        {
          name: 'missing_fields',
          description: 'Lista de campos obrigatórios que estão faltando',
          required: true
        },
        {
          name: 'partial_data',
          description: 'Dados já coletados do usuário',
          required: false
        }
      ]
    },
    {
      name: 'availability_suggestion_prompt',
      description: 'Prompt para sugerir horários alternativos quando não há disponibilidade',
      arguments: [
        {
          name: 'requested_datetime',
          description: 'Data e hora solicitadas originalmente',
          required: true
        },
        {
          name: 'available_slots',
          description: 'Lista de horários disponíveis alternativos',
          required: true
        }
      ]
    },
    {
      name: 'appointment_confirmation_prompt',
      description: 'Prompt para confirmação de agendamento criado',
      arguments: [
        {
          name: 'appointment_details',
          description: 'Detalhes completos da consulta agendada',
          required: true
        }
      ]
    },
    {
      name: 'error_handling_prompt',
      description: 'Prompt para tratamento amigável de erros do sistema',
      arguments: [
        {
          name: 'error_type',
          description: 'Tipo do erro encontrado',
          required: true
        },
        {
          name: 'user_action',
          description: 'Ação que o usuário estava tentando realizar',
          required: true
        }
      ]
    }
  ];

  /**
   * Retorna todos os prompts disponíveis
   */
  static getPromptsList(): MCPPrompt[] {
    return this.prompts;
  }

  /**
   * Busca um prompt específico pelo nome
   */
  static getPrompt(name: string): MCPPrompt | undefined {
    return this.prompts.find(prompt => prompt.name === name);
  }

  /**
   * Verifica se um prompt existe
   */
  static hasPrompt(name: string): boolean {
    return this.prompts.some(prompt => prompt.name === name);
  }

  /**
   * Gera o conteúdo de um prompt específico
   */
  static generatePromptContent(name: string, args: Record<string, string>): {
    description?: string;
    messages: Array<{
      role: 'user' | 'assistant';
      content: {
        type: 'text';
        text: string;
      };
    }>;
  } {
    const prompt = this.getPrompt(name);
    if (!prompt) {
      throw new Error(`Prompt '${name}' não encontrado`);
    }

    switch (name) {
      case 'appointment_creation_prompt':
        return this.generateAppointmentCreationPrompt(args);
      
      case 'appointment_clarification_prompt':
        return this.generateAppointmentClarificationPrompt(args);
      
      case 'availability_suggestion_prompt':
        return this.generateAvailabilitySuggestionPrompt(args);
      
      case 'appointment_confirmation_prompt':
        return this.generateAppointmentConfirmationPrompt(args);
      
      case 'error_handling_prompt':
        return this.generateErrorHandlingPrompt(args);
      
      default:
        throw new Error(`Geração de conteúdo para prompt '${name}' não implementada`);
    }
  }

  /**
   * Prompt para criação de consultas
   */
  private static generateAppointmentCreationPrompt(args: Record<string, string>) {
    const userMessage = args.user_message || '';
    const context = args.context || '';

    const now = new Date();
    const saoPauloOffset = -3 * 60;
    const saoPauloTime = new Date(now.getTime() + saoPauloOffset * 60000);
    const today = saoPauloTime.toISOString().split('T')[0];
    const tomorrow = new Date(saoPauloTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return {
      description: 'Prompt para extrair informações de agendamento de linguagem natural',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Sistema: Você é MARA, assistente de agendamento médico. Analise a mensagem do usuário e extraia informações para agendamento.

Contexto atual:
- Data atual: ${today}
- Amanhã: ${tomorrowStr}
- Clínica ID: 1 (fixo)
- User ID: 4 (fixo)

${context ? `Contexto da conversa: ${context}` : ''}

Mensagem do usuário: "${userMessage}"

Responda APENAS com JSON no formato:
{
  "action": "create_appointment",
  "contact_id": 33,
  "scheduled_date": "YYYY-MM-DD",
  "scheduled_time": "HH:MM",
  "duration_minutes": 60,
  "clinic_id": 1,
  "user_id": 4
}

Se informações estiverem faltando, responda:
{
  "action": "clarification",
  "message": "Pergunta específica sobre o que falta",
  "missing_fields": ["campo1", "campo2"]
}`
          }
        }
      ]
    };
  }

  /**
   * Prompt para clarificação de dados
   */
  private static generateAppointmentClarificationPrompt(args: Record<string, string>) {
    const missingFields = args.missing_fields || '';
    const partialData = args.partial_data || '';

    return {
      description: 'Prompt para solicitar informações faltantes',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Sistema: Gere uma mensagem amigável solicitando as informações faltantes para completar o agendamento.

Campos faltando: ${missingFields}
${partialData ? `Dados já coletados: ${partialData}` : ''}

Responda APENAS com JSON:
{
  "action": "clarification",
  "message": "Sua mensagem amigável aqui"
}`
          }
        }
      ]
    };
  }

  /**
   * Prompt para sugestão de disponibilidade
   */
  private static generateAvailabilitySuggestionPrompt(args: Record<string, string>) {
    const requestedDatetime = args.requested_datetime || '';
    const availableSlots = args.available_slots || '';

    return {
      description: 'Prompt para sugerir horários alternativos',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Sistema: O horário solicitado (${requestedDatetime}) não está disponível. 

Horários alternativos disponíveis: ${availableSlots}

Gere uma resposta amigável oferecendo as alternativas.

Responda APENAS com JSON:
{
  "action": "chat_response",
  "message": "Sua resposta com sugestões de horários"
}`
          }
        }
      ]
    };
  }

  /**
   * Prompt para confirmação de agendamento
   */
  private static generateAppointmentConfirmationPrompt(args: Record<string, string>) {
    const appointmentDetails = args.appointment_details || '';

    return {
      description: 'Prompt para confirmar agendamento criado',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Sistema: Agendamento criado com sucesso!

Detalhes: ${appointmentDetails}

Gere uma mensagem de confirmação amigável.

Responda APENAS com JSON:
{
  "action": "chat_response",
  "message": "Sua mensagem de confirmação"
}`
          }
        }
      ]
    };
  }

  /**
   * Prompt para tratamento de erros
   */
  private static generateErrorHandlingPrompt(args: Record<string, string>) {
    const errorType = args.error_type || '';
    const userAction = args.user_action || '';

    return {
      description: 'Prompt para tratamento amigável de erros',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Sistema: Ocorreu um erro ao tentar: ${userAction}

Tipo do erro: ${errorType}

Gere uma resposta amigável explicando o problema e sugerindo uma solução.

Responda APENAS com JSON:
{
  "action": "chat_response",
  "message": "Sua explicação amigável do erro e sugestão"
}`
          }
        }
      ]
    };
  }

  /**
   * Log de uso de prompt para auditoria
   */
  static logPromptUsage(promptName: string, args: Record<string, string>, sessionId?: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      prompt_name: promptName,
      arguments: args,
      session_id: sessionId,
      version: '1.0'
    };

    // Em produção, isso seria enviado para um sistema de logs
    console.log('[MCP Prompt Usage]', JSON.stringify(logEntry));
  }
}