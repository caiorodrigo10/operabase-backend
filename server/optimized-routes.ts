import { Request, Response } from 'express';
import { performanceOptimizer } from './performance-optimizer.js';
import { isAuthenticated } from './auth.js';

/**
 * Rotas otimizadas com cache e consultas eficientes
 */
export function setupOptimizedRoutes(app: any) {
  
  // Rota otimizada para contatos com paginação
  app.get('/api/contacts/paginated', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinic_id, search, status, page, limit } = req.query;
      
      if (!clinic_id) {
        return res.status(400).json({ error: 'clinic_id é obrigatório' });
      }

      const pagination = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 25,
      };

      const filters = {
        search: search as string,
        status: status as string,
      };

      const result = await performanceOptimizer.getContactsPaginated(
        parseInt(clinic_id as string),
        pagination,
        filters
      );

      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar contatos paginados:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota legacy otimizada para contatos (backward compatibility)
  app.get('/api/contacts/optimized', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinic_id, search, status, limit, offset } = req.query;
      
      if (!clinic_id) {
        return res.status(400).json({ error: 'clinic_id é obrigatório' });
      }

      const filters = {
        search: search as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      };

      const contacts = await performanceOptimizer.getContactsOptimized(
        parseInt(clinic_id as string),
        filters
      );

      res.json(contacts);
    } catch (error) {
      console.error('Erro ao buscar contatos otimizados:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota otimizada para agendamentos com paginação
  app.get('/api/appointments/paginated', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinic_id, start_date, end_date, status, user_id, page, limit } = req.query;
      
      if (!clinic_id) {
        return res.status(400).json({ error: 'clinic_id é obrigatório' });
      }

      const pagination = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 25,
      };

      const filters = {
        startDate: start_date as string,
        endDate: end_date as string,
        status: status as string,
        userId: user_id ? parseInt(user_id as string) : undefined,
      };

      const result = await performanceOptimizer.getAppointmentsPaginated(
        parseInt(clinic_id as string),
        pagination,
        filters
      );

      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar agendamentos paginados:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota legacy para agendamentos (backward compatibility)
  app.get('/api/appointments/optimized', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinic_id, start_date, end_date, status, user_id } = req.query;
      
      if (!clinic_id) {
        return res.status(400).json({ error: 'clinic_id é obrigatório' });
      }

      const filters = {
        startDate: start_date as string,
        endDate: end_date as string,
        status: status as string,
        userId: user_id ? parseInt(user_id as string) : undefined,
      };

      const appointments = await performanceOptimizer.getAppointmentsOptimized(
        parseInt(clinic_id as string),
        filters
      );

      res.json(appointments);
    } catch (error) {
      console.error('Erro ao buscar agendamentos otimizados:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota otimizada para estatísticas do dashboard
  app.get('/api/dashboard/stats', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinic_id } = req.query;
      
      if (!clinic_id) {
        return res.status(400).json({ error: 'clinic_id é obrigatório' });
      }

      const stats = await performanceOptimizer.getDashboardStats(
        parseInt(clinic_id as string)
      );

      res.json(stats);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para invalidar cache específico
  app.post('/api/cache/invalidate', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { operation, clinic_id } = req.body;
      
      if (operation && clinic_id) {
        performanceOptimizer.invalidateCache(operation, clinic_id);
      } else if (clinic_id) {
        performanceOptimizer.invalidateClinicCache(clinic_id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao invalidar cache:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para estatísticas de cache (desenvolvimento)
  app.get('/api/cache/stats', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const stats = performanceOptimizer.getCacheStats();
      res.json(stats);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de cache:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });
}