
import type { IStorage } from '../../storage';
import type { CalendarSyncRequest } from './calendar.types';

export class CalendarRepository {
  constructor(private storage: IStorage) {}

  async getCalendarConfig(clinicId: number, userId: string) {
    return this.storage.getCalendarConfig(clinicId, userId);
  }

  async updateCalendarConfig(data: CalendarSyncRequest) {
    return this.storage.updateCalendarConfig(data);
  }

  async getAvailableSlots(date: string, clinicId: number, userId?: string) {
    return this.storage.getAvailableSlots(date, clinicId, userId);
  }

  async getCalendarEvents(clinicId: number, startDate: string, endDate: string) {
    return this.storage.getCalendarEvents(clinicId, startDate, endDate);
  }
}
