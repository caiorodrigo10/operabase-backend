import { Router } from 'express';
import { createAuthRoutes } from '../../domains/auth/auth.routes';
import { createAppointmentsRoutes } from '../../domains/appointments/appointments.routes';
import { createContactsRoutes } from '../../domains/contacts/contacts.routes';
// Clinics routes are now handled separately in index.ts
import { createCalendarRoutes } from '../../domains/calendar/calendar.routes';
import { createMedicalRecordsRoutes } from '../../domains/medical-records/medical-records.routes';
import { createPipelineRoutes } from '../../domains/pipeline/pipeline.routes';
import { createAnalyticsRoutes } from '../../domains/analytics/analytics.routes';
import { createSettingsRoutes } from '../../domains/settings/settings.routes';
import { createAiTemplatesRoutes } from '../../domains/ai-templates/ai-templates.routes';
import { createAppointmentTagsRoutes } from '../../domains/appointment-tags/appointment-tags.routes';
import { createUserProfileRoutes } from '../../domains/user-profile/user-profile.routes';
import { createLiviaRoutes } from '../../domains/livia/livia.routes';
// Observability routes are now integrated directly in index.ts
import { createLoadTestingRoutes } from './load-testing/load-testing.routes';

export function createApiRouter(storage: any): Router {
  const apiRouter = Router();

  // Health check
  apiRouter.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: 'v1'
    });
  });

  // Auth domain routes
  const authRoutes = createAuthRoutes(storage);
  apiRouter.use('/', authRoutes);

  // Appointments domain routes
  const appointmentsRoutes = createAppointmentsRoutes(storage);
  apiRouter.use('/', appointmentsRoutes);

  // Contacts domain routes
  const contactsRoutes = createContactsRoutes(storage);
  apiRouter.use('/', contactsRoutes);

  // Clinics routes are now handled separately in index.ts with invitation system

  // Calendar domain routes
  const calendarRoutes = createCalendarRoutes(storage);
  apiRouter.use('/', calendarRoutes);

  // Medical Records domain routes
  const medicalRecordsRoutes = createMedicalRecordsRoutes(storage);
  apiRouter.use('/', medicalRecordsRoutes);

  // Pipeline domain routes
  const pipelineRoutes = createPipelineRoutes(storage);
  apiRouter.use('/', pipelineRoutes);

  // Analytics domain routes
  const analyticsRoutes = createAnalyticsRoutes(storage);
  apiRouter.use('/', analyticsRoutes);

  // Settings domain routes
  const settingsRoutes = createSettingsRoutes(storage);
  apiRouter.use('/', settingsRoutes);

  // AI Templates domain routes
  const aiTemplatesRoutes = createAiTemplatesRoutes(storage);
  apiRouter.use('/', aiTemplatesRoutes);

  // Appointment Tags domain routes
  const appointmentTagsRoutes = createAppointmentTagsRoutes(storage);
  apiRouter.use('/', appointmentTagsRoutes);

  // User Profile domain routes
  const userProfileRoutes = createUserProfileRoutes(storage);
  apiRouter.use('/', userProfileRoutes);

  // Livia AI Configuration domain routes
  const liviaRoutes = createLiviaRoutes(storage);
  apiRouter.use('/', liviaRoutes);

  // Observability routes are handled directly in index.ts

  // Load Testing domain routes
  const loadTestingRoutes = createLoadTestingRoutes();
  apiRouter.use('/v1/load-testing', loadTestingRoutes);

  return apiRouter;
}