
import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { analyticsQuerySchema } from './analytics.types';

export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  getDashboardStats = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.query.clinic_id as string);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: 'clinic_id deve ser um número' });
      }

      const stats = await this.service.getDashboardStats(clinicId);
      res.json(stats);
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  getAnalyticsData = async (req: Request, res: Response) => {
    try {
      const query = {
        clinic_id: parseInt(req.query.clinic_id as string),
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        metric_type: req.query.metric_type as any,
        granularity: (req.query.granularity as any) || 'day',
      };

      const validatedQuery = analyticsQuerySchema.parse(query);
      const data = await this.service.getAnalyticsData(validatedQuery);
      res.json(data);
    } catch (error) {
      console.error('Error getting analytics data:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Parâmetros inválidos', details: error.errors });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  trackEvent = async (req: Request, res: Response) => {
    try {
      const { clinic_id, event_type, data } = req.body;

      if (!clinic_id || !event_type) {
        return res.status(400).json({ error: 'clinic_id e event_type são obrigatórios' });
      }

      await this.service.trackEvent(clinic_id, event_type, data);
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  getAppointmentAnalytics = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.query.clinic_id as string);
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      if (isNaN(clinicId)) {
        return res.status(400).json({ error: 'clinic_id deve ser um número' });
      }

      const analytics = await this.service.getAppointmentAnalytics(clinicId, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting appointment analytics:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  getContactAnalytics = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.query.clinic_id as string);
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      if (isNaN(clinicId)) {
        return res.status(400).json({ error: 'clinic_id deve ser um número' });
      }

      const analytics = await this.service.getContactAnalytics(clinicId, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting contact analytics:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  getRevenueAnalytics = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.query.clinic_id as string);
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      if (isNaN(clinicId)) {
        return res.status(400).json({ error: 'clinic_id deve ser um número' });
      }

      const analytics = await this.service.getRevenueAnalytics(clinicId, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting revenue analytics:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  getPipelineAnalytics = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.query.clinic_id as string);

      if (isNaN(clinicId)) {
        return res.status(400).json({ error: 'clinic_id deve ser um número' });
      }

      const analytics = await this.service.getPipelineAnalytics(clinicId);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting pipeline analytics:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  getPerformanceAnalytics = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.query.clinic_id as string);
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      if (isNaN(clinicId)) {
        return res.status(400).json({ error: 'clinic_id deve ser um número' });
      }

      const analytics = await this.service.getPerformanceAnalytics(clinicId, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting performance analytics:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
}
