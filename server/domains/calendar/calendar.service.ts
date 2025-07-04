
import { CalendarRepository } from './calendar.repository';
import type { CalendarSyncRequest, CalendarEventRequest, CalendarAvailabilityRequest } from './calendar.types';

export class CalendarService {
  constructor(private repository: CalendarRepository) {}

  async getCalendarConfig(clinicId: number, userId: string) {
    return this.repository.getCalendarConfig(clinicId, userId);
  }

  async updateCalendarSync(data: CalendarSyncRequest) {
    return this.repository.updateCalendarConfig(data);
  }

  async getAvailableSlots(data: CalendarAvailabilityRequest) {
    return this.repository.getAvailableSlots(data.date, data.clinic_id, data.user_id);
  }

  async getCalendarEvents(clinicId: number, startDate: string, endDate: string) {
    return this.repository.getCalendarEvents(clinicId, startDate, endDate);
  }
}
