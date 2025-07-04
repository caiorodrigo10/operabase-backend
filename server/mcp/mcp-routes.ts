import { Router, Request, Response } from 'express';
import { MCPToolsRegistry } from './mcp-tools-registry';
import { MCPResourcesRegistry } from './mcp-resources-registry';
import { MCPPromptsRegistry } from './mcp-prompts-registry';
import { appointmentAgent } from './appointment-agent-simple';
import { MCPToolCallRequest, MCPToolCallResponse } from './mcp-protocol';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/mcp/tools/list
 * Retorna lista de todas as tools disponíveis conforme especificação MCP
 */
router.get('/tools/list', async (req: Request, res: Response) => {
  try {
    const tools = MCPToolsRegistry.getToolsList();
    
    res.json({
      tools
    });
  } catch (error) {
    console.error('Erro ao listar tools MCP:', error);
    res.status(500).json({
      error: 'Erro interno ao listar tools'
    });
  }
});

/**
 * POST /api/mcp/tools/call
 * Executa uma tool específica conforme especificação MCP
 */
router.post('/tools/call', async (req: Request, res: Response) => {
  try {
    const { name, arguments: args } = MCPToolCallRequest.parse(req.body);
    
    // Validar se a tool existe
    if (!MCPToolsRegistry.hasTools(name)) {
      return res.status(404).json({
        content: [{
          type: 'text',
          text: `Tool '${name}' não encontrada`
        }],
        isError: true
      } as MCPToolCallResponse);
    }

    // Validar argumentos
    const validation = MCPToolsRegistry.validateToolArguments(name, args);
    if (!validation.valid) {
      return res.status(400).json({
        content: [{
          type: 'text',
          text: `Argumentos inválidos: ${validation.errors?.join(', ')}`
        }],
        isError: true
      } as MCPToolCallResponse);
    }

    // Executar tool específica
    let result;
    switch (name) {
      case 'create_appointment':
        result = await appointmentAgent.createAppointment({
          contact_id: args.contact_id,
          clinic_id: args.clinic_id,
          user_id: args.user_id,
          scheduled_date: args.scheduled_date,
          scheduled_time: args.scheduled_time,
          duration_minutes: args.duration_minutes,
          status: 'agendada',
          payment_status: 'pendente',
          doctor_name: args.doctor_name,
          specialty: args.specialty,
          appointment_type: args.appointment_type
        });
        break;

      case 'list_appointments':
        result = await appointmentAgent.listAppointments(args.clinic_id, {
          userId: args.user_id,
          contactId: args.contact_id,
          status: args.status,
          startDate: args.date_from,
          endDate: args.date_to
        });
        break;

      case 'check_availability':
        result = await appointmentAgent.getAvailableSlots({
          clinic_id: args.clinic_id,
          user_id: args.user_id,
          date: args.date,
          duration_minutes: args.duration_minutes,
          working_hours_start: args.working_hours_start || '08:00',
          working_hours_end: args.working_hours_end || '18:00'
        });
        break;

      case 'reschedule_appointment':
        result = await appointmentAgent.rescheduleAppointment({
          appointment_id: args.appointment_id,
          clinic_id: args.clinic_id,
          scheduled_date: args.scheduled_date,
          scheduled_time: args.scheduled_time,
          duration_minutes: args.duration_minutes
        });
        break;

      case 'cancel_appointment':
        result = await appointmentAgent.updateStatus({
          appointment_id: args.appointment_id,
          clinic_id: args.clinic_id,
          status: 'cancelada',
          session_notes: args.reason
        });
        break;

      case 'update_appointment_status':
        result = await appointmentAgent.updateStatus({
          appointment_id: args.appointment_id,
          clinic_id: args.clinic_id,
          status: args.status,
          session_notes: args.session_notes
        });
        break;

      case 'get_next_available_slots':
        result = await appointmentAgent.getAvailableSlots({
          clinic_id: args.clinic_id,
          user_id: args.user_id,
          date: new Date().toISOString().split('T')[0],
          duration_minutes: args.duration_minutes,
          working_hours_start: '08:00',
          working_hours_end: '18:00'
        });
        break;

      default:
        return res.status(400).json({
          content: [{
            type: 'text',
            text: `Execução da tool '${name}' não implementada`
          }],
          isError: true
        } as MCPToolCallResponse);
    }

    // Retornar resultado no formato MCP
    res.json({
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }],
      isError: false
    } as MCPToolCallResponse);

  } catch (error) {
    console.error('Erro ao executar tool MCP:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        content: [{
          type: 'text',
          text: `Erro de validação: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        }],
        isError: true
      } as MCPToolCallResponse);
    }

    res.status(500).json({
      content: [{
        type: 'text',
        text: 'Erro interno ao executar tool'
      }],
      isError: true
    } as MCPToolCallResponse);
  }
});

/**
 * GET /api/mcp/resources/list
 * Retorna lista de todos os resources disponíveis conforme especificação MCP
 */
router.get('/resources/list', async (req: Request, res: Response) => {
  try {
    const resources = MCPResourcesRegistry.getResourcesList();
    
    res.json({
      resources
    });
  } catch (error) {
    console.error('Erro ao listar resources MCP:', error);
    res.status(500).json({
      error: 'Erro interno ao listar resources'
    });
  }
});

/**
 * POST /api/mcp/resources/read
 * Obtém conteúdo de um resource específico conforme especificação MCP
 */
router.post('/resources/read', async (req: Request, res: Response) => {
  try {
    const { uri } = req.body;
    const clinicId = req.body.clinic_id || 1; // Default para desenvolvimento
    
    if (!uri) {
      return res.status(400).json({
        error: 'URI do resource é obrigatória'
      });
    }

    if (!MCPResourcesRegistry.hasResource(uri)) {
      return res.status(404).json({
        error: `Resource '${uri}' não encontrado`
      });
    }

    const content = await MCPResourcesRegistry.getResourceContent(uri, clinicId);
    
    res.json({
      contents: [content]
    });
  } catch (error) {
    console.error('Erro ao ler resource MCP:', error);
    res.status(500).json({
      error: 'Erro interno ao ler resource'
    });
  }
});

/**
 * GET /api/mcp/prompts/list
 * Retorna lista de todos os prompts disponíveis conforme especificação MCP
 */
router.get('/prompts/list', async (req: Request, res: Response) => {
  try {
    const prompts = MCPPromptsRegistry.getPromptsList();
    
    res.json({
      prompts
    });
  } catch (error) {
    console.error('Erro ao listar prompts MCP:', error);
    res.status(500).json({
      error: 'Erro interno ao listar prompts'
    });
  }
});

/**
 * POST /api/mcp/prompts/get
 * Obtém conteúdo de um prompt específico conforme especificação MCP
 */
router.post('/prompts/get', async (req: Request, res: Response) => {
  try {
    const { name, arguments: args } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Nome do prompt é obrigatório'
      });
    }

    if (!MCPPromptsRegistry.hasPrompt(name)) {
      return res.status(404).json({
        error: `Prompt '${name}' não encontrado`
      });
    }

    const content = MCPPromptsRegistry.generatePromptContent(name, args || {});
    
    // Log de uso do prompt para auditoria
    MCPPromptsRegistry.logPromptUsage(name, args || {}, req.body.session_id);
    
    res.json(content);
  } catch (error) {
    console.error('Erro ao obter prompt MCP:', error);
    res.status(500).json({
      error: 'Erro interno ao obter prompt'
    });
  }
});

/**
 * GET /api/mcp/initialize
 * Endpoint de inicialização MCP que retorna capacidades do servidor
 */
router.get('/initialize', async (req: Request, res: Response) => {
  try {
    res.json({
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {
          listChanged: false
        },
        resources: {
          subscribe: false,
          listChanged: false
        },
        prompts: {
          listChanged: false
        },
        logging: {}
      },
      serverInfo: {
        name: 'TaskMed MCP Server',
        version: '1.0.0',
        description: 'Servidor MCP para sistema de agendamento médico TaskMed'
      }
    });
  } catch (error) {
    console.error('Erro na inicialização MCP:', error);
    res.status(500).json({
      error: 'Erro interno na inicialização'
    });
  }
});

export default router;