
import { Router } from 'express';
import { CalendarController } from './calendar.controller';
import type { Storage } from '../../storage';

export function createCalendarRoutes(storage: Storage): Router {
  const router = Router();
  const controller = new CalendarController(storage);

  // Get calendar configuration
  router.get('/calendar/config', controller.getCalendarConfig.bind(controller));
  
  // Update calendar sync settings
  router.post('/calendar/sync', controller.updateCalendarSync.bind(controller));
  
  // Get available time slots
  router.get('/calendar/available-slots', controller.getAvailableSlots.bind(controller));
  
  // Get calendar events
  router.get('/calendar/events', controller.getCalendarEvents.bind(controller));

  return router;
}
