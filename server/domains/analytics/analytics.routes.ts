
import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';

export function createAnalyticsRoutes(storage: any): Router {
  const router = Router();
  
  const repository = new AnalyticsRepository(storage);
  const service = new AnalyticsService(repository);
  const controller = new AnalyticsController(service);

  // Main analytics routes
  router.get('/analytics', controller.getAnalyticsData);
  router.post('/analytics', controller.trackEvent);

  // Specific analytics endpoints
  router.get('/analytics/dashboard', controller.getDashboardStats);
  router.get('/analytics/appointments', controller.getAppointmentAnalytics);
  router.get('/analytics/contacts', controller.getContactAnalytics);
  router.get('/analytics/revenue', controller.getRevenueAnalytics);
  router.get('/analytics/pipeline', controller.getPipelineAnalytics);
  router.get('/analytics/performance', controller.getPerformanceAnalytics);

  return router;
}
