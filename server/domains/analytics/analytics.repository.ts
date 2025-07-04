
import type { AnalyticsQuery } from './analytics.types';

export class AnalyticsRepository {
  constructor(private storage: any) {}

  async getDashboardStats(clinicId: number) {
    return this.storage.getDashboardStats(clinicId);
  }

  async getAnalyticsData(query: AnalyticsQuery) {
    return this.storage.getAnalyticsData(query);
  }

  async getAppointmentMetrics(clinicId: number, startDate?: string, endDate?: string) {
    return this.storage.getAppointmentMetrics(clinicId, startDate, endDate);
  }

  async getContactMetrics(clinicId: number, startDate?: string, endDate?: string) {
    return this.storage.getContactMetrics(clinicId, startDate, endDate);
  }

  async getRevenueMetrics(clinicId: number, startDate?: string, endDate?: string) {
    return this.storage.getRevenueMetrics(clinicId, startDate, endDate);
  }

  async getPipelineMetrics(clinicId: number) {
    return this.storage.getPipelineMetrics(clinicId);
  }

  async getConversionMetrics(clinicId: number, startDate?: string, endDate?: string) {
    return this.storage.getConversionMetrics(clinicId, startDate, endDate);
  }

  async getPerformanceMetrics(clinicId: number, startDate?: string, endDate?: string) {
    return this.storage.getPerformanceMetrics(clinicId, startDate, endDate);
  }

  async createAnalyticsEvent(clinicId: number, eventType: string, data: any) {
    return this.storage.createAnalyticsEvent(clinicId, eventType, data);
  }
}
