/**
 * Cache key generation utilities for multi-tenant TaskMed system
 * Provides consistent, tenant-isolated cache key naming
 */

export class CacheKeys {
  /**
   * Contact-related cache keys
   */
  static readonly contacts = {
    list: (clinicId: number, page: number = 1) => 
      `clinic_${clinicId}:contacts:list:page_${page}`,
    
    byId: (clinicId: number, contactId: number) => 
      `clinic_${clinicId}:contacts:${contactId}`,
    
    search: (clinicId: number, query: string, page: number = 1) => 
      `clinic_${clinicId}:contacts:search:${query}:page_${page}`,
    
    byStatus: (clinicId: number, status: string, page: number = 1) => 
      `clinic_${clinicId}:contacts:status_${status}:page_${page}`
  };

  /**
   * Appointment-related cache keys
   */
  static readonly appointments = {
    list: (clinicId: number, page: number = 1) => 
      `clinic_${clinicId}:appointments:list:page_${page}`,
    
    byId: (clinicId: number, appointmentId: number) => 
      `clinic_${clinicId}:appointments:${appointmentId}`,
    
    byDate: (clinicId: number, date: string) => 
      `clinic_${clinicId}:appointments:date_${date}`,
    
    byContact: (clinicId: number, contactId: number) => 
      `clinic_${clinicId}:appointments:contact_${contactId}`,
    
    availability: (clinicId: number, date: string, professionalId?: number) => 
      professionalId ? 
        `clinic_${clinicId}:availability:${date}:prof_${professionalId}` :
        `clinic_${clinicId}:availability:${date}`
  };

  /**
   * Medical records cache keys
   */
  static readonly medicalRecords = {
    list: (clinicId: number, page: number = 1) => 
      `clinic_${clinicId}:records:list:page_${page}`,
    
    byId: (clinicId: number, recordId: number) => 
      `clinic_${clinicId}:records:${recordId}`,
    
    byContact: (clinicId: number, contactId: number) => 
      `clinic_${clinicId}:records:contact_${contactId}`
  };

  /**
   * Pipeline cache keys
   */
  static readonly pipeline = {
    stages: (clinicId: number) => 
      `clinic_${clinicId}:pipeline:stages`,
    
    opportunities: (clinicId: number, stageId?: number) => 
      stageId ? 
        `clinic_${clinicId}:pipeline:opportunities:stage_${stageId}` :
        `clinic_${clinicId}:pipeline:opportunities:all`
  };

  /**
   * Analytics cache keys
   */
  static readonly analytics = {
    metrics: (clinicId: number, type: string, period: string) => 
      `clinic_${clinicId}:analytics:${type}:${period}`,
    
    dashboard: (clinicId: number) => 
      `clinic_${clinicId}:analytics:dashboard`
  };

  /**
   * Settings cache keys
   */
  static readonly settings = {
    clinic: (clinicId: number) => 
      `clinic_${clinicId}:settings:clinic`,
    
    user: (clinicId: number, userId: string) => 
      `clinic_${clinicId}:settings:user_${userId}`
  };

  /**
   * AI templates cache keys
   */
  static readonly aiTemplates = {
    list: (clinicId: number) => 
      `clinic_${clinicId}:ai_templates:list`,
    
    byType: (clinicId: number, type: string) => 
      `clinic_${clinicId}:ai_templates:type_${type}`
  };

  /**
   * User session cache keys
   */
  static readonly userSession = {
    byId: (userId: string) => 
      `user_session:${userId}`,
    
    permissions: (userId: string, clinicId: number) => 
      `user_permissions:${userId}:clinic_${clinicId}`
  };

  /**
   * Get all cache key patterns for a clinic
   */
  static getPatterns(clinicId: number) {
    return {
      contacts: `clinic_${clinicId}:contacts:*`,
      appointments: `clinic_${clinicId}:appointments:*`,
      medical_records: `clinic_${clinicId}:records:*`,
      pipeline: `clinic_${clinicId}:pipeline:*`,
      analytics: `clinic_${clinicId}:analytics:*`,
      settings: `clinic_${clinicId}:settings:*`,
      ai_templates: `clinic_${clinicId}:ai_templates:*`
    };
  }

  /**
   * Get clinic-wide cache pattern
   */
  static getClinicPattern(clinicId: number): string {
    return `clinic_${clinicId}:*`;
  }

  /**
   * Check if a cache key belongs to a specific clinic
   */
  static belongsToClinic(key: string, clinicId: number): boolean {
    return key.startsWith(`clinic_${clinicId}:`) || key.startsWith(`user_session:`) || key.startsWith(`user_permissions:`);
  }

  /**
   * Extract clinic ID from cache key
   */
  static extractClinicId(key: string): number | null {
    const match = key.match(/^clinic_(\d+):/);
    return match ? parseInt(match[1], 10) : null;
  }
}