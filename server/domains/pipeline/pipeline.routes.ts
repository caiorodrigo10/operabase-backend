
import { Router } from 'express';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';
import { PipelineRepository } from './pipeline.repository';

export function createPipelineRoutes(storage: any): Router {
  const router = Router();
  
  const repository = new PipelineRepository(storage);
  const service = new PipelineService(repository);
  const controller = new PipelineController(service);

  // Pipeline Stages routes
  router.get('/clinics/:clinicId/pipeline-stages', controller.getStagesByClinic);
  router.get('/pipeline-stages/:id', controller.getStageById);
  router.post('/pipeline-stages', controller.createStage);
  router.put('/pipeline-stages/:id', controller.updateStage);
  router.delete('/pipeline-stages/:id', controller.deleteStage);

  // Pipeline Opportunities routes
  router.get('/pipeline-opportunities', controller.getOpportunitiesByClinic);
  router.get('/pipeline-opportunities/:id', controller.getOpportunityById);
  router.post('/pipeline-opportunities', controller.createOpportunity);
  router.put('/pipeline-opportunities/:id', controller.updateOpportunity);
  router.delete('/pipeline-opportunities/:id', controller.deleteOpportunity);
  router.post('/pipeline-opportunities/:id/move', controller.moveOpportunity);
  router.get('/pipeline-opportunities/:id/history', controller.getOpportunityHistory);
  router.get('/pipeline-opportunities/:id/activities', controller.getOpportunityActivities);

  // Pipeline Activities routes
  router.get('/pipeline-activities', controller.getActivitiesByClinic);
  router.get('/pipeline-activities/:id', controller.getActivityById);
  router.post('/pipeline-activities', controller.createActivity);
  router.put('/pipeline-activities/:id', controller.updateActivity);
  router.delete('/pipeline-activities/:id', controller.deleteActivity);
  router.post('/pipeline-activities/:id/complete', controller.completeActivity);

  return router;
}
