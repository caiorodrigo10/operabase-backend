
import { Router } from 'express';
import { AppointmentTagsController } from './appointment-tags.controller';
import { supabaseAuth, supabaseClinicAccess } from '../../supabase-auth-middleware';

export function createAppointmentTagsRoutes(storage: any): Router {
  const router = Router();
  const controller = new AppointmentTagsController(storage);

  // Appointment Tags routes
  router.get('/clinic/:clinicId/appointment-tags', supabaseAuth, supabaseClinicAccess('clinicId'), controller.getAppointmentTags);
  router.post('/clinic/:clinicId/appointment-tags', supabaseAuth, supabaseClinicAccess('clinicId'), controller.createAppointmentTag);
  router.put('/appointment-tags/:id', supabaseAuth, controller.updateAppointmentTag);
  router.delete('/appointment-tags/:id', supabaseAuth, controller.deleteAppointmentTag);

  return router;
}
