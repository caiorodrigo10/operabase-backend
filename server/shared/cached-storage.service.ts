import { intelligentCache, CACHE_DOMAINS } from './intelligent-cache.service.js';
import { structuredLogger, LogCategory } from './structured-logger.service.js';
import { tenantContext } from './tenant-context.provider.js';
import type { IStorage } from '../storage.js';

/**
 * Cached Storage Service - Phase 2 Implementation
 * Wraps existing storage with intelligent multi-tenant caching
 * Target: 2-5ms response times for 500-1000+ concurrent users
 */
export class CachedStorageService {
  constructor(private baseStorage: IStorage) {}

  /**
   * Cached contact operations
   */
  async getContacts(clinicId: number, filters?: { status?: string; search?: string }) {
    const filterKey = filters ? `${filters.status || 'all'}:${filters.search || 'none'}` : 'default';
    return await intelligentCache.cacheAside(
      'CONTACTS',
      `list:${filterKey}`,
      () => this.baseStorage.getContacts(clinicId, filters),
      clinicId
    );
  }

  async getContact(contactId: number, clinicId?: number) {
    return await intelligentCache.cacheAside(
      'CONTACTS',
      `detail:${contactId}`,
      () => this.baseStorage.getContact(contactId),
      clinicId
    );
  }

  async createContact(contactData: any) {
    const result = await intelligentCache.writeThrough(
      'CONTACTS',
      `new:${Date.now()}`,
      contactData,
      (data) => this.baseStorage.createContact(data),
      contactData.clinic_id
    );

    // Invalidate related caches
    await intelligentCache.bulkInvalidate('CONTACTS', contactData.clinic_id);

    return result;
  }

  async updateContact(contactId: number, updates: any, clinicId?: number) {
    const result = await intelligentCache.writeThrough(
      'CONTACTS',
      `update:${contactId}`,
      { contactId, updates },
      (data) => this.baseStorage.updateContact(data.contactId, data.updates),
      clinicId
    );

    // Invalidate specific contact and related caches
    await intelligentCache.invalidate('CONTACTS', `detail:${contactId}`, clinicId);
    await intelligentCache.bulkInvalidate('CONTACTS', clinicId);

    return result;
  }

  async updateContactStatus(contactId: number, status: string, clinicId?: number) {
    const result = await this.baseStorage.updateContactStatus(contactId, status);
    
    // Invalidate contact caches
    await intelligentCache.invalidate('CONTACTS', `detail:${contactId}`, clinicId);
    await intelligentCache.bulkInvalidate('CONTACTS', clinicId);

    return result;
  }

  /**
   * Cached appointment operations
   */
  async getAppointments(clinicId: number, limit: number = 100) {
    return await intelligentCache.cacheAside(
      'APPOINTMENTS',
      `list:${limit}`,
      () => this.baseStorage.getAppointments(clinicId, limit),
      clinicId
    );
  }

  async getAppointment(appointmentId: number, clinicId: number) {
    return await intelligentCache.cacheAside(
      'APPOINTMENTS',
      `detail:${appointmentId}`,
      () => this.baseStorage.getAppointment(appointmentId),
      clinicId
    );
  }

  async createAppointment(appointmentData: any) {
    const result = await intelligentCache.writeThrough(
      'APPOINTMENTS',
      `new:${Date.now()}`,
      appointmentData,
      (data) => this.baseStorage.createAppointment(data),
      appointmentData.clinic_id
    );

    // Invalidate appointment and calendar related caches
    await intelligentCache.bulkInvalidate('APPOINTMENTS', appointmentData.clinic_id);
    await intelligentCache.invalidate('ANALYTICS', 'dashboard', appointmentData.clinic_id);

    return result;
  }

  async updateAppointment(appointmentId: number, updates: any, clinicId: number) {
    const result = await intelligentCache.writeThrough(
      'APPOINTMENTS',
      `update:${appointmentId}`,
      { appointmentId, updates },
      (data) => this.baseStorage.updateAppointment(data.appointmentId, data.updates),
      clinicId
    );

    // Invalidate appointment caches
    await intelligentCache.invalidate('APPOINTMENTS', `detail:${appointmentId}`, clinicId);
    await intelligentCache.invalidate('APPOINTMENTS', `list:100`, clinicId);

    return result;
  }

  async getAppointmentsByDate(clinicId: number, startDate: Date, endDate: Date) {
    const dateKey = `date:${startDate.toISOString().split('T')[0]}:${endDate.toISOString().split('T')[0]}`;
    
    return await intelligentCache.cacheAside(
      'APPOINTMENTS',
      dateKey,
      () => this.baseStorage.getAppointmentsByDate(clinicId, startDate, endDate),
      clinicId
    );
  }

  /**
   * Cached conversation operations
   */
  async getConversations(clinicId: number, limit: number = 50) {
    return await intelligentCache.cacheAside(
      'CONVERSATIONS',
      `list:${limit}`,
      () => this.baseStorage.getConversations(clinicId, limit),
      clinicId
    );
  }

  async getConversation(conversationId: number, clinicId: number) {
    return await intelligentCache.cacheAside(
      'CONVERSATIONS',
      `detail:${conversationId}`,
      () => this.baseStorage.getConversation(conversationId),
      clinicId
    );
  }

  async createConversation(conversationData: any) {
    const result = await intelligentCache.writeThrough(
      'CONVERSATIONS',
      `new:${Date.now()}`,
      conversationData,
      (data) => this.baseStorage.createConversation(data),
      conversationData.clinic_id
    );

    // Invalidate conversation caches
    await intelligentCache.bulkInvalidate('CONVERSATIONS', conversationData.clinic_id);

    return result;
  }

  async getMessages(conversationId: number, clinicId: number, limit: number = 100) {
    return await intelligentCache.cacheAside(
      'CONVERSATIONS',
      `messages:${conversationId}:${limit}`,
      () => this.baseStorage.getMessages(conversationId, limit),
      clinicId
    );
  }

  async createMessage(messageData: any) {
    const result = await this.baseStorage.createMessage(messageData);

    // Invalidate conversation and message caches
    await intelligentCache.invalidate('CONVERSATIONS', `messages:${messageData.conversation_id}:100`, messageData.clinic_id);
    await intelligentCache.invalidate('CONVERSATIONS', `detail:${messageData.conversation_id}`, messageData.clinic_id);

    return result;
  }

  async updateMessage(messageId: number, updates: any) {
    const result = await this.baseStorage.updateMessage(messageId, updates);

    // Invalidate related caches - we need to get conversation_id from the result
    if (result && result.conversation_id) {
      await intelligentCache.invalidate('CONVERSATIONS', `messages:${result.conversation_id}:100`, updates.clinic_id);
      await intelligentCache.invalidate('CONVERSATIONS', `detail:${result.conversation_id}`, updates.clinic_id);
    }

    return result;
  }

  /**
   * Cached medical records operations
   */
  async getMedicalRecords(clinicId: number, contactId?: number, limit: number = 50) {
    const recordKey = contactId ? `contact:${contactId}:${limit}` : `list:${limit}`;
    
    return await intelligentCache.readThrough(
      'MEDICAL_RECORDS',
      recordKey,
      () => contactId 
        ? this.baseStorage.getMedicalRecordsByContact(contactId, clinicId, limit)
        : this.baseStorage.getMedicalRecords(clinicId, limit),
      clinicId
    );
  }

  async getMedicalRecord(recordId: number, clinicId: number) {
    return await intelligentCache.readThrough(
      'MEDICAL_RECORDS',
      `detail:${recordId}`,
      () => this.baseStorage.getMedicalRecord(recordId),
      clinicId
    );
  }

  async createMedicalRecord(recordData: any) {
    const result = await intelligentCache.writeThrough(
      'MEDICAL_RECORDS',
      `new:${Date.now()}`,
      recordData,
      (data) => this.baseStorage.createMedicalRecord(data),
      recordData.clinic_id
    );

    // Invalidate medical records caches
    await intelligentCache.bulkInvalidate('MEDICAL_RECORDS', recordData.clinic_id);

    return result;
  }

  async updateMedicalRecord(recordId: number, updates: any, clinicId: number) {
    const result = await intelligentCache.writeThrough(
      'MEDICAL_RECORDS',
      `update:${recordId}`,
      { recordId, updates },
      (data) => this.baseStorage.updateMedicalRecord(data.recordId, data.updates),
      clinicId
    );

    // Invalidate specific record and related caches
    await intelligentCache.invalidate('MEDICAL_RECORDS', `detail:${recordId}`, clinicId);
    
    if (updates.contact_id) {
      await intelligentCache.invalidate('MEDICAL_RECORDS', `contact:${updates.contact_id}:50`, clinicId);
    }

    return result;
  }

  /**
   * Cached clinic and user operations
   */
  async getClinic(clinicId: number) {
    return await intelligentCache.cacheAside(
      'CLINIC_USERS',
      `clinic:${clinicId}`,
      () => this.baseStorage.getClinic(clinicId),
      clinicId
    );
  }

  async getUserClinics(userId: number) {
    // Note: This returns multiple clinics, so we use a global cache key
    return await intelligentCache.cacheAside(
      'CLINIC_USERS',
      `user_clinics:${userId}`,
      () => this.baseStorage.getUserClinics(userId)
    );
  }

  async getClinicUsers(clinicId: number) {
    return await intelligentCache.cacheAside(
      'CLINIC_USERS',
      `users:${clinicId}`,
      () => this.baseStorage.getClinicUsers(clinicId),
      clinicId
    );
  }

  async addUserToClinic(clinicUserData: any) {
    const result = await this.baseStorage.addUserToClinic(clinicUserData);

    // Invalidate clinic user caches
    await intelligentCache.invalidate('CLINIC_USERS', `users:${clinicUserData.clinic_id}`, clinicUserData.clinic_id);
    await intelligentCache.invalidate('CLINIC_USERS', `user_clinics:${clinicUserData.user_id}`);

    return result;
  }

  /**
   * Cached analytics operations
   */
  async getDashboardMetrics(clinicId: number) {
    return await intelligentCache.cacheAside(
      'ANALYTICS',
      'dashboard',
      () => this.generateDashboardMetrics(clinicId),
      clinicId
    );
  }

  async getAnalyticsData(clinicId: number, metricType: string, dateRange: { start: Date, end: Date }) {
    const analyticsKey = `${metricType}:${dateRange.start.toISOString().split('T')[0]}:${dateRange.end.toISOString().split('T')[0]}`;
    
    return await intelligentCache.cacheAside(
      'ANALYTICS',
      analyticsKey,
      () => this.generateAnalyticsData(clinicId, metricType, dateRange),
      clinicId
    );
  }

  /**
   * Dashboard metrics generation (aggregated from multiple sources)
   */
  private async generateDashboardMetrics(clinicId: number) {
    const [contacts, appointments, conversations, medicalRecords] = await Promise.all([
      this.baseStorage.getContacts(clinicId, 1), // Just for count
      this.baseStorage.getAppointments(clinicId, 1), // Just for count
      this.baseStorage.getConversations(clinicId, 1), // Just for count
      this.baseStorage.getMedicalRecords(clinicId, 1) // Just for count
    ]);

    return {
      totalContacts: contacts.length,
      totalAppointments: appointments.length,
      activeConversations: conversations.length,
      totalMedicalRecords: medicalRecords.length,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Analytics data generation
   */
  private async generateAnalyticsData(clinicId: number, metricType: string, dateRange: { start: Date, end: Date }) {
    // Implementation depends on specific metric type
    switch (metricType) {
      case 'appointments_by_status':
        return await this.baseStorage.getAppointmentsByDate(clinicId, dateRange.start, dateRange.end);
      
      case 'contact_activity':
        return await this.baseStorage.getContacts(clinicId, 100);
      
      default:
        return [];
    }
  }

  /**
   * Cache warming for frequently accessed data
   */
  async warmFrequentlyAccessedData(clinicId: number) {
    try {
      const startTime = Date.now();

      // Warm contacts cache
      const contacts = await this.baseStorage.getContacts(clinicId, 100);
      await intelligentCache.warmCache('CONTACTS', [
        { key: 'list:100', value: contacts }
      ], clinicId);

      // Warm recent appointments cache
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const appointments = await this.baseStorage.getAppointmentsByDate(clinicId, today, nextWeek);
      await intelligentCache.warmCache('APPOINTMENTS', [
        { key: `date:${today.toISOString().split('T')[0]}:${nextWeek.toISOString().split('T')[0]}`, value: appointments }
      ], clinicId);

      // Warm dashboard metrics
      const dashboardMetrics = await this.generateDashboardMetrics(clinicId);
      await intelligentCache.warmCache('ANALYTICS', [
        { key: 'dashboard', value: dashboardMetrics }
      ], clinicId);

      const warmingTime = Date.now() - startTime;

      structuredLogger.info(
        LogCategory.PERFORMANCE,
        'cache_warmed_successfully',
        { clinic_id: clinicId, warming_time: warmingTime }
      );

    } catch (error) {
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'cache_warming_failed',
        { clinic_id: clinicId, error: (error as Error).message }
      );
    }
  }

  /**
   * Bulk cache invalidation for clinic data updates
   */
  async invalidateClinicCache(clinicId: number) {
    await Promise.all([
      intelligentCache.bulkInvalidate('CONTACTS', clinicId),
      intelligentCache.bulkInvalidate('APPOINTMENTS', clinicId),
      intelligentCache.bulkInvalidate('CONVERSATIONS', clinicId),
      intelligentCache.bulkInvalidate('MEDICAL_RECORDS', clinicId),
      intelligentCache.bulkInvalidate('ANALYTICS', clinicId)
    ]);

    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'clinic_cache_invalidated',
      { clinic_id: clinicId }
    );
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics() {
    return intelligentCache.getMetrics();
  }

  /**
   * Get tenant-specific cache metrics
   */
  getTenantCacheMetrics(clinicId: number) {
    return intelligentCache.getTenantMetrics(clinicId);
  }

  /**
   * Cache health check
   */
  async getCacheHealthStatus() {
    return await intelligentCache.healthCheck();
  }

  /**
   * Passthrough methods for non-cached operations
   * These operations are either too fast or too infrequent to benefit from caching
   */
  async createUser(userData: any) {
    return await this.baseStorage.createUser(userData);
  }

  async getUser(userId: number) {
    return await this.baseStorage.getUser(userId);
  }

  async updateUser(userId: number, updates: any) {
    return await this.baseStorage.updateUser(userId, updates);
  }

  async deleteContact(contactId: number) {
    const result = await this.baseStorage.deleteContact(contactId);
    
    // Invalidate related caches
    const context = tenantContext.getContext();
    if (context?.clinicId) {
      await intelligentCache.bulkInvalidate('CONTACTS', context.clinicId);
      await intelligentCache.invalidate('ANALYTICS', 'dashboard', context.clinicId);
    }

    return result;
  }

  async deleteAppointment(appointmentId: number) {
    const result = await this.baseStorage.deleteAppointment(appointmentId);
    
    // Invalidate related caches
    const context = tenantContext.getContext();
    if (context?.clinicId) {
      await intelligentCache.bulkInvalidate('APPOINTMENTS', context.clinicId);
      await intelligentCache.invalidate('ANALYTICS', 'dashboard', context.clinicId);
    }

    return result;
  }
}

// Factory function to create cached storage instance
export function createCachedStorage(baseStorage: IStorage): CachedStorageService {
  return new CachedStorageService(baseStorage);
}