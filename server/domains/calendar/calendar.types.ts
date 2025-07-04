
import { z } from 'zod';

// Calendar sync schemas
export const calendarSyncSchema = z.object({
  clinic_id: z.number(),
  user_id: z.string(),
  calendar_id: z.string(),
  sync_enabled: z.boolean()
});

export const calendarEventSchema = z.object({
  summary: z.string(),
  description: z.string().optional(),
  start: z.object({
    dateTime: z.string(),
    timeZone: z.string().optional()
  }),
  end: z.object({
    dateTime: z.string(),
    timeZone: z.string().optional()
  }),
  attendees: z.array(z.object({
    email: z.string().email()
  })).optional()
});

export const calendarAvailabilitySchema = z.object({
  date: z.string(),
  clinic_id: z.number(),
  user_id: z.string().optional()
});

export type CalendarSyncRequest = z.infer<typeof calendarSyncSchema>;
export type CalendarEventRequest = z.infer<typeof calendarEventSchema>;
export type CalendarAvailabilityRequest = z.infer<typeof calendarAvailabilitySchema>;
