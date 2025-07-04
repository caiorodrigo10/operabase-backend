// Temporary types for missing schemas
// These are placeholders until proper schemas are created

export interface ClinicSetting {
  id: number;
  clinic_id: number;
  key: string;
  value: string;
  type: string;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export type InsertClinicSetting = Omit<ClinicSetting, 'id' | 'created_at' | 'updated_at'>;

export interface CalendarIntegration {
  id: number;
  user_id: number;
  clinic_id: number;
  provider: string;
  email: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: Date | null;
  is_active: boolean;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export type InsertCalendarIntegration = Omit<CalendarIntegration, 'id' | 'created_at' | 'updated_at'>;

export interface MedicalRecord {
  id: number;
  appointment_id: number;
  contact_id: number;
  clinic_id: number;
  professional_id: number;
  content: any;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export type InsertMedicalRecord = Omit<MedicalRecord, 'id' | 'created_at' | 'updated_at'>;

// Dummy table exports for compatibility
export const clinic_settings = {} as any;
export const calendar_integrations = {} as any;
export const medical_records = {} as any; 