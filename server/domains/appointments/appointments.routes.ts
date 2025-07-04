
import { Router } from 'express';
import { AppointmentsController } from './appointments.controller';
import { appointmentLogsMiddleware } from '../../middleware/system-logs.middleware';
import { isAuthenticated } from '../../auth';
import type { IStorage } from '../../storage';

export function createAppointmentsRoutes(storage: IStorage): Router {
  const router = Router();
  const controller = new AppointmentsController(storage);

  // Get appointments with filters
  router.get('/appointments', controller.getAppointments.bind(controller));

  // Get paginated appointments
  router.get('/appointments/paginated', controller.getAppointmentsPaginated.bind(controller));

  // Get appointment by ID
  router.get('/appointments/:id', controller.getAppointmentById.bind(controller));

  // Get appointments by contact
  router.get('/contacts/:contactId/appointments', controller.getAppointmentsByContact.bind(controller));

  // Create appointment (with logging)
  router.post('/appointments', ...appointmentLogsMiddleware, controller.createAppointment.bind(controller));

  // Update appointment (with logging)
  router.put('/appointments/:id', ...appointmentLogsMiddleware, controller.updateAppointment.bind(controller));

  // Update appointment status (with logging)
  router.patch('/appointments/:id', ...appointmentLogsMiddleware, controller.updateAppointmentStatus.bind(controller));

  // Delete appointment (with logging)
  router.delete('/appointments/:id', ...appointmentLogsMiddleware, controller.deleteAppointment.bind(controller));

  // Availability endpoints
  router.post('/appointments/availability/check', controller.checkAvailability.bind(controller));
  router.post('/appointments/availability/find-slots', controller.findAvailableTimeSlots.bind(controller));

  // Admin endpoint to reassign orphaned appointments
  router.post('/clinic/:clinic_id/appointments/reassign', controller.reassignAppointments.bind(controller));

  return router;
}
