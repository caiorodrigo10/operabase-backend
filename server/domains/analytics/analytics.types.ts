
import { z } from 'zod';

// Analytics Query Types
export const analyticsQuerySchema = z.object({
  clinic_id: z.number(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  metric_type: z.enum(['appointments', 'contacts', 'revenue', 'conversion']).optional(),
  granularity: z.enum(['day', 'week', 'month', 'year']).default('day'),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

// Analytics Data Types
export interface AnalyticsMetric {
  metric: string;
  value: number;
  period: string;
  comparison?: {
    previous_value: number;
    change_percentage: number;
  };
}

export interface AnalyticsData {
  clinic_id: number;
  period: {
    start_date: string;
    end_date: string;
  };
  metrics: AnalyticsMetric[];
  charts: {
    appointments_over_time: Array<{ date: string; value: number }>;
    contacts_growth: Array<{ date: string; value: number }>;
    revenue_trend: Array<{ date: string; value: number }>;
    conversion_funnel: Array<{ stage: string; count: number; conversion_rate: number }>;
  };
}

export interface DashboardStats {
  total_appointments: number;
  total_contacts: number;
  total_revenue: number;
  conversion_rate: number;
  active_pipelines: number;
  pending_activities: number;
  appointments_today: number;
  appointments_this_week: number;
  appointments_this_month: number;
  new_contacts_this_month: number;
  revenue_this_month: number;
  top_services: Array<{ name: string; count: number }>;
  appointment_status_distribution: Array<{ status: string; count: number }>;
  contact_sources: Array<{ source: string; count: number }>;
}
