
import { Router } from 'express';
import { AiTemplatesController } from './ai-templates.controller';
import { isAuthenticated } from '../../auth';

export function createAiTemplatesRoutes(storage: any): Router {
  const router = Router();
  const controller = new AiTemplatesController(storage);

  // AI Templates routes
  router.get('/clinics/:clinicId/ai-templates', isAuthenticated, controller.getAiTemplates);
  router.get('/ai-templates/:id', isAuthenticated, controller.getAiTemplate);
  router.post('/clinics/:clinicId/ai-templates', isAuthenticated, controller.createAiTemplate);
  router.put('/ai-templates/:id', isAuthenticated, controller.updateAiTemplate);

  return router;
}
