import { MCPTool } from './mcp-protocol';

/**
 * MCP Tools Registry - Define todas as tools disponíveis conforme especificação MCP
 */
export class MCPToolsRegistry {
  private static tools: MCPTool[] = [
    {
      name: 'create_appointment',
      description: 'Cria uma nova consulta médica no sistema',
      inputSchema: {
        type: 'object',
        properties: {
          contact_id: {
            type: 'number',
            description: 'ID do contato/paciente existente'
          },
          clinic_id: {
            type: 'number',
            description: 'ID da clínica'
          },
          user_id: {
            type: 'number',
            description: 'ID do profissional responsável'
          },
          scheduled_date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'Data do agendamento no formato YYYY-MM-DD'
          },
          scheduled_time: {
            type: 'string',
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
            description: 'Horário do agendamento no formato HH:MM'
          },
          duration_minutes: {
            type: 'number',
            minimum: 15,
            maximum: 480,
            description: 'Duração da consulta em minutos'
          },
          doctor_name: {
            type: 'string',
            description: 'Nome do médico (opcional)'
          },
          specialty: {
            type: 'string',
            description: 'Especialidade médica (opcional)'
          },
          appointment_type: {
            type: 'string',
            description: 'Tipo de consulta (opcional)'
          }
        },
        required: ['contact_id', 'clinic_id', 'user_id', 'scheduled_date', 'scheduled_time', 'duration_minutes']
      }
    },
    {
      name: 'list_appointments',
      description: 'Lista consultas existentes com filtros opcionais',
      inputSchema: {
        type: 'object',
        properties: {
          clinic_id: {
            type: 'number',
            description: 'ID da clínica'
          },
          user_id: {
            type: 'number',
            description: 'ID do profissional (opcional)'
          },
          contact_id: {
            type: 'number',
            description: 'ID do contato/paciente (opcional)'
          },
          date_from: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'Data inicial do filtro (opcional)'
          },
          date_to: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'Data final do filtro (opcional)'
          },
          status: {
            type: 'string',
            enum: ['agendada', 'confirmada', 'realizada', 'faltou', 'cancelada'],
            description: 'Status da consulta (opcional)'
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            description: 'Limite de resultados (padrão: 50)'
          },
          offset: {
            type: 'number',
            minimum: 0,
            description: 'Offset para paginação (padrão: 0)'
          }
        },
        required: ['clinic_id']
      }
    },
    {
      name: 'check_availability',
      description: 'Verifica horários disponíveis para agendamento',
      inputSchema: {
        type: 'object',
        properties: {
          clinic_id: {
            type: 'number',
            description: 'ID da clínica'
          },
          user_id: {
            type: 'number',
            description: 'ID do profissional'
          },
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'Data para verificar disponibilidade'
          },
          duration_minutes: {
            type: 'number',
            minimum: 15,
            maximum: 480,
            description: 'Duração desejada da consulta'
          },
          working_hours_start: {
            type: 'string',
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
            description: 'Horário de início do expediente (padrão: 08:00)'
          },
          working_hours_end: {
            type: 'string',
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
            description: 'Horário de fim do expediente (padrão: 18:00)'
          }
        },
        required: ['clinic_id', 'user_id', 'date', 'duration_minutes']
      }
    },
    {
      name: 'reschedule_appointment',
      description: 'Reagenda uma consulta existente',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: {
            type: 'number',
            description: 'ID da consulta a ser reagendada'
          },
          clinic_id: {
            type: 'number',
            description: 'ID da clínica'
          },
          scheduled_date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            description: 'Nova data do agendamento'
          },
          scheduled_time: {
            type: 'string',
            pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
            description: 'Novo horário do agendamento'
          },
          duration_minutes: {
            type: 'number',
            minimum: 15,
            maximum: 480,
            description: 'Nova duração da consulta (opcional)'
          }
        },
        required: ['appointment_id', 'clinic_id', 'scheduled_date', 'scheduled_time']
      }
    },
    {
      name: 'cancel_appointment',
      description: 'Cancela uma consulta existente',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: {
            type: 'number',
            description: 'ID da consulta a ser cancelada'
          },
          clinic_id: {
            type: 'number',
            description: 'ID da clínica'
          },
          cancelled_by: {
            type: 'string',
            enum: ['paciente', 'dentista'],
            description: 'Quem cancelou a consulta'
          },
          reason: {
            type: 'string',
            description: 'Motivo do cancelamento (opcional)'
          }
        },
        required: ['appointment_id', 'clinic_id', 'cancelled_by']
      }
    },
    {
      name: 'update_appointment_status',
      description: 'Atualiza o status de uma consulta',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: {
            type: 'number',
            description: 'ID da consulta'
          },
          clinic_id: {
            type: 'number',
            description: 'ID da clínica'
          },
          status: {
            type: 'string',
            enum: ['agendada', 'confirmada', 'realizada', 'faltou', 'cancelada'],
            description: 'Novo status da consulta'
          },
          session_notes: {
            type: 'string',
            description: 'Notas da sessão (opcional)'
          }
        },
        required: ['appointment_id', 'clinic_id', 'status']
      }
    },
    {
      name: 'get_next_available_slots',
      description: 'Obtém os próximos horários disponíveis',
      inputSchema: {
        type: 'object',
        properties: {
          clinic_id: {
            type: 'number',
            description: 'ID da clínica'
          },
          user_id: {
            type: 'number',
            description: 'ID do profissional'
          },
          duration_minutes: {
            type: 'number',
            minimum: 15,
            maximum: 480,
            description: 'Duração desejada da consulta'
          },
          days_ahead: {
            type: 'number',
            minimum: 1,
            maximum: 30,
            description: 'Quantos dias à frente buscar (padrão: 7)'
          },
          max_slots: {
            type: 'number',
            minimum: 1,
            maximum: 50,
            description: 'Máximo de slots a retornar (padrão: 10)'
          }
        },
        required: ['clinic_id', 'user_id', 'duration_minutes']
      }
    }
  ];

  /**
   * Retorna todas as tools disponíveis
   */
  static getToolsList(): MCPTool[] {
    return this.tools;
  }

  /**
   * Busca uma tool específica pelo nome
   */
  static getTool(name: string): MCPTool | undefined {
    return this.tools.find(tool => tool.name === name);
  }

  /**
   * Verifica se uma tool existe
   */
  static hasTools(name: string): boolean {
    return this.tools.some(tool => tool.name === name);
  }

  /**
   * Valida argumentos de uma tool contra seu schema
   */
  static validateToolArguments(toolName: string, args: any): { valid: boolean; errors?: string[] } {
    const tool = this.getTool(toolName);
    if (!tool) {
      return { valid: false, errors: [`Tool '${toolName}' não encontrada`] };
    }

    // Validação básica dos argumentos obrigatórios
    const required = tool.inputSchema.required || [];
    const missing = required.filter(field => !(field in args));
    
    if (missing.length > 0) {
      return { 
        valid: false, 
        errors: [`Campos obrigatórios ausentes: ${missing.join(', ')}`] 
      };
    }

    return { valid: true };
  }
}