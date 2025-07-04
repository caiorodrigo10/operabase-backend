
import { AnalyticsRepository } from './analytics.repository';
import type { AnalyticsQuery, AnalyticsData, DashboardStats } from './analytics.types';

export class AnalyticsService {
  constructor(private repository: AnalyticsRepository) {}

  async getDashboardStats(clinicId: number): Promise<DashboardStats> {
    try {
      const stats = await this.repository.getDashboardStats(clinicId);
      
      // If storage doesn't have this method, calculate manually
      if (!stats) {
        return this.calculateDashboardStats(clinicId);
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return this.calculateDashboardStats(clinicId);
    }
  }

  private async calculateDashboardStats(clinicId: number): Promise<DashboardStats> {
    // Calculate basic stats from existing data
    const today = new Date().toISOString().split('T')[0];
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);

    const appointmentMetrics = await this.repository.getAppointmentMetrics(
      clinicId, 
      thisMonthStart.toISOString().split('T')[0], 
      today
    );
    const contactMetrics = await this.repository.getContactMetrics(
      clinicId, 
      thisMonthStart.toISOString().split('T')[0], 
      today
    );
    const revenueMetrics = await this.repository.getRevenueMetrics(
      clinicId, 
      thisMonthStart.toISOString().split('T')[0], 
      today
    );
    const pipelineMetrics = await this.repository.getPipelineMetrics(clinicId);

    return {
      total_appointments: appointmentMetrics?.total || 0,
      total_contacts: contactMetrics?.total || 0,
      total_revenue: revenueMetrics?.total || 0,
      conversion_rate: 0, // Calculate based on pipeline data
      active_pipelines: pipelineMetrics?.active || 0,
      pending_activities: pipelineMetrics?.pending_activities || 0,
      appointments_today: appointmentMetrics?.today || 0,
      appointments_this_week: appointmentMetrics?.this_week || 0,
      appointments_this_month: appointmentMetrics?.this_month || 0,
      new_contacts_this_month: contactMetrics?.this_month || 0,
      revenue_this_month: revenueMetrics?.this_month || 0,
      top_services: appointmentMetrics?.top_services || [],
      appointment_status_distribution: appointmentMetrics?.status_distribution || [],
      contact_sources: contactMetrics?.sources || [],
    };
  }

  async getAnalyticsData(query: AnalyticsQuery): Promise<AnalyticsData> {
    try {
      const data = await this.repository.getAnalyticsData(query);
      
      if (!data) {
        return this.buildAnalyticsData(query);
      }
      
      return data;
    } catch (error) {
      console.error('Error getting analytics data:', error);
      return this.buildAnalyticsData(query);
    }
  }

  private async buildAnalyticsData(query: AnalyticsQuery): Promise<AnalyticsData> {
    const { clinic_id, start_date, end_date, metric_type } = query;
    
    // Get metrics based on type
    const appointmentMetrics = await this.repository.getAppointmentMetrics(clinic_id, start_date, end_date);
    const contactMetrics = await this.repository.getContactMetrics(clinic_id, start_date, end_date);
    const revenueMetrics = await this.repository.getRevenueMetrics(clinic_id, start_date, end_date);
    const conversionMetrics = await this.repository.getConversionMetrics(clinic_id, start_date, end_date);

    return {
      clinic_id,
      period: {
        start_date: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: end_date || new Date().toISOString().split('T')[0],
      },
      metrics: [
        {
          metric: 'appointments',
          value: appointmentMetrics?.total || 0,
          period: 'current',
        },
        {
          metric: 'contacts',
          value: contactMetrics?.total || 0,
          period: 'current',
        },
        {
          metric: 'revenue',
          value: revenueMetrics?.total || 0,
          period: 'current',
        },
        {
          metric: 'conversion_rate',
          value: conversionMetrics?.rate || 0,
          period: 'current',
        },
      ],
      charts: {
        appointments_over_time: appointmentMetrics?.over_time || [],
        contacts_growth: contactMetrics?.growth || [],
        revenue_trend: revenueMetrics?.trend || [],
        conversion_funnel: conversionMetrics?.funnel || [],
      },
    };
  }

  async trackEvent(clinicId: number, eventType: string, data: any) {
    try {
      await this.repository.createAnalyticsEvent(clinicId, eventType, data);
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      // Don't throw error to avoid breaking main flows
    }
  }

  async getAppointmentAnalytics(clinicId: number, startDate?: string, endDate?: string) {
    return this.repository.getAppointmentMetrics(clinicId, startDate, endDate);
  }

  async getContactAnalytics(clinicId: number, startDate?: string, endDate?: string) {
    return this.repository.getContactMetrics(clinicId, startDate, endDate);
  }

  async getRevenueAnalytics(clinicId: number, startDate?: string, endDate?: string) {
    return this.repository.getRevenueMetrics(clinicId, startDate, endDate);
  }

  async getPipelineAnalytics(clinicId: number) {
    return this.repository.getPipelineMetrics(clinicId);
  }

  async getPerformanceAnalytics(clinicId: number, startDate?: string, endDate?: string) {
    return this.repository.getPerformanceMetrics(clinicId, startDate, endDate);
  }
}
