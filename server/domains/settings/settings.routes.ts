
import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { isAuthenticated } from '../../auth';

export function createSettingsRoutes(storage: any): Router {
  const router = Router();
  const controller = new SettingsController(storage);

  // Settings routes
  router.get('/clinics/:clinicId/settings', isAuthenticated, controller.getClinicSettings);
  router.get('/clinics/:clinicId/settings/:key', isAuthenticated, controller.getClinicSetting);
  router.post('/clinics/:clinicId/settings', isAuthenticated, controller.setClinicSetting);

  return router;
}
