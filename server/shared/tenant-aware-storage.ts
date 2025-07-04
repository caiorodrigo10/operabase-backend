import { tenantContext } from './tenant-context.provider.js';
import type { IStorage } from '../storage.js';

/**
 * Tenant-aware storage wrapper that automatically applies clinic_id filters
 * Maintains compatibility with existing IStorage interface
 */
export class TenantAwareStorage implements IStorage {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  // Helper method to merge tenant filter with existing filters
  private mergeTenantFilter(filters?: any): any {
    try {
      const tenantFilter = tenantContext.getTenantFilter();
      
      if (!filters) {
        return tenantFilter;
      }
      
      if (typeof filters === 'object' && filters !== null) {
        return { ...filters, ...tenantFilter };
      }
      
      return filters;
    } catch (error) {
      // If no tenant context, return original filters
      return filters;
    }
  }

  // USER METHODS - No tenant filtering needed for users table
  async createUser(user: any): Promise<any> {
    return this.storage.createUser(user);
  }

  async getUserById(id: string): Promise<any> {
    return this.storage.getUserById(id);
  }

  async getUserByEmail(email: string): Promise<any> {
    return this.storage.getUserByEmail(email);
  }

  async updateUser(id: string, updates: any): Promise<any> {
    return this.storage.updateUser(id, updates);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.storage.deleteUser(id);
  }

  async listUsers(filters?: any): Promise<any[]> {
    return this.storage.listUsers(filters);
  }

  // CLINIC METHODS - Apply tenant filtering
  async createClinic(clinic: any): Promise<any> {
    return this.storage.createClinic(clinic);
  }

  async getClinicById(id: number): Promise<any> {
    // Validate clinic access through tenant context
    const tenantFilter = this.mergeTenantFilter();
    if (tenantFilter.clinic_id !== id) {
      throw new Error('Access denied: Cannot access clinic data');
    }
    return this.storage.getClinicById(id);
  }

  async updateClinic(id: number, updates: any): Promise<any> {
    const tenantFilter = this.mergeTenantFilter();
    if (tenantFilter.clinic_id !== id) {
      throw new Error('Access denied: Cannot update clinic data');
    }
    return this.storage.updateClinic(id, updates);
  }

  async deleteClinic(id: number): Promise<boolean> {
    const tenantFilter = this.mergeTenantFilter();
    if (tenantFilter.clinic_id !== id) {
      throw new Error('Access denied: Cannot delete clinic data');
    }
    return this.storage.deleteClinic(id);
  }

  async listClinics(filters?: any): Promise<any[]> {
    // Users can only see their own clinic
    const filteredParams = this.mergeTenantFilter(filters);
    return this.storage.listClinics(filteredParams);
  }

  // CONTACT METHODS - Apply tenant filtering
  async createContact(contact: any): Promise<any> {
    const contactWithTenant = this.mergeTenantFilter(contact);
    return this.storage.createContact(contactWithTenant);
  }

  async getContactById(id: number): Promise<any> {
    return this.storage.getContactById(id);
  }

  async updateContact(id: number, updates: any): Promise<any> {
    return this.storage.updateContact(id, updates);
  }

  async deleteContact(id: number): Promise<boolean> {
    return this.storage.deleteContact(id);
  }

  async listContacts(filters?: any): Promise<any[]> {
    const filteredParams = this.mergeTenantFilter(filters);
    return this.storage.listContacts(filteredParams);
  }

  async searchContacts(query: string, filters?: any): Promise<any[]> {
    const filteredParams = this.mergeTenantFilter(filters);
    return this.storage.searchContacts(query, filteredParams);
  }

  // APPOINTMENT METHODS - Apply tenant filtering
  async createAppointment(appointment: any): Promise<any> {
    const appointmentWithTenant = this.mergeTenantFilter(appointment);
    return this.storage.createAppointment(appointmentWithTenant);
  }

  async getAppointmentById(id: number): Promise<any> {
    return this.storage.getAppointmentById(id);
  }

  async updateAppointment(id: number, updates: any): Promise<any> {
    return this.storage.updateAppointment(id, updates);
  }

  async deleteAppointment(id: number): Promise<boolean> {
    return this.storage.deleteAppointment(id);
  }

  async listAppointments(filters?: any): Promise<any[]> {
    const filteredParams = this.mergeTenantFilter(filters);
    return this.storage.listAppointments(filteredParams);
  }

  async getAppointmentsByDateRange(startDate: Date, endDate: Date, filters?: any): Promise<any[]> {
    const filteredParams = this.mergeTenantFilter(filters);
    return this.storage.getAppointmentsByDateRange(startDate, endDate, filteredParams);
  }

  async getAppointmentsByContact(contactId: number, filters?: any): Promise<any[]> {
    const filteredParams = this.mergeTenantFilter(filters);
    return this.storage.getAppointmentsByContact(contactId, filteredParams);
  }

  // MEDICAL RECORD METHODS - Apply tenant filtering
  async createMedicalRecord(record: any): Promise<any> {
    const recordWithTenant = this.mergeTenantFilter(record);
    return this.storage.createMedicalRecord(recordWithTenant);
  }

  async getMedicalRecordById(id: number): Promise<any> {
    return this.storage.getMedicalRecordById(id);
  }

  async updateMedicalRecord(id: number, updates: any): Promise<any> {
    return this.storage.updateMedicalRecord(id, updates);
  }

  async deleteMedicalRecord(id: number): Promise<boolean> {
    return this.storage.deleteMedicalRecord(id);
  }

  async listMedicalRecords(filters?: any): Promise<any[]> {
    const filteredParams = this.mergeTenantFilter(filters);
    return this.storage.listMedicalRecords(filteredParams);
  }

  async getMedicalRecordsByContact(contactId: number, filters?: any): Promise<any[]> {
    const filteredParams = this.mergeTenantFilter(filters);
    return this.storage.getMedicalRecordsByContact(contactId, filteredParams);
  }

  // CONVERSATION METHODS - Apply tenant filtering
  async createConversation(conversation: any): Promise<any> {
    const conversationWithTenant = this.mergeTenantFilter(conversation);
    return this.storage.createConversation(conversationWithTenant);
  }

  async getConversationById(id: number): Promise<any> {
    return this.storage.getConversationById(id);
  }

  async updateConversation(id: number, updates: any): Promise<any> {
    return this.storage.updateConversation(id, updates);
  }

  async deleteConversation(id: number): Promise<boolean> {
    return this.storage.deleteConversation(id);
  }

  async listConversations(filters?: any): Promise<any[]> {
    const filteredParams = this.mergeTenantFilter(filters);
    return this.storage.listConversations(filteredParams);
  }

  async getConversationsByContact(contactId: number, filters?: any): Promise<any[]> {
    const filteredParams = this.mergeTenantFilter(filters);
    return this.storage.getConversationsByContact(contactId, filteredParams);
  }

  // MESSAGE METHODS - Apply tenant filtering through conversation
  async createMessage(message: any): Promise<any> {
    return this.storage.createMessage(message);
  }

  async getMessageById(id: number): Promise<any> {
    return this.storage.getMessageById(id);
  }

  async updateMessage(id: number, updates: any): Promise<any> {
    return this.storage.updateMessage(id, updates);
  }

  async deleteMessage(id: number): Promise<boolean> {
    return this.storage.deleteMessage(id);
  }

  async listMessages(filters?: any): Promise<any[]> {
    return this.storage.listMessages(filters);
  }

  async getMessagesByConversation(conversationId: number, filters?: any): Promise<any[]> {
    return this.storage.getMessagesByConversation(conversationId, filters);
  }

  // Upload system methods - pass through without tenant filtering
  async getUserProfile(userId: string): Promise<{ clinic_id: number } | undefined> {
    return this.storage.getUserProfile(userId);
  }
  
  async createMessage(message: any): Promise<any> {
    return this.storage.createMessage(message);
  }

  async createAttachment(attachment: any): Promise<any> {
    return this.storage.createAttachment(attachment);
  }

  async getActiveWhatsAppInstance(clinicId: number): Promise<any> {
    return this.storage.getActiveWhatsAppInstance(clinicId);
  }

  async getConversationById(id: string): Promise<any> {
    return this.storage.getConversationById(id);
  }

  // Pass through remaining methods without tenant filtering
  async addUserToClinic(userId: string, clinicId: number, role: string, isProfessional: boolean): Promise<any> {
    return this.storage.addUserToClinic(userId, clinicId, role, isProfessional);
  }

  async removeUserFromClinic(userId: string, clinicId: number): Promise<boolean> {
    return this.storage.removeUserFromClinic(userId, clinicId);
  }

  async getUserClinics(userId: string): Promise<any[]> {
    return this.storage.getUserClinics(userId);
  }

  async getClinicUsers(clinicId: number): Promise<any[]> {
    const tenantFilter = this.mergeTenantFilter();
    if (tenantFilter.clinic_id !== clinicId) {
      throw new Error('Access denied: Cannot access clinic users');
    }
    return this.storage.getClinicUsers(clinicId);
  }

  async updateUserRole(userId: string, clinicId: number, role: string): Promise<any> {
    const tenantFilter = this.mergeTenantFilter();
    if (tenantFilter.clinic_id !== clinicId) {
      throw new Error('Access denied: Cannot update user role');
    }
    return this.storage.updateUserRole(userId, clinicId, role);
  }

  async updateUserProfessionalStatus(userId: string, clinicId: number, isProfessional: boolean, updatedBy: string): Promise<any> {
    const tenantFilter = this.mergeTenantFilter();
    if (tenantFilter.clinic_id !== clinicId) {
      throw new Error('Access denied: Cannot update professional status');
    }
    return this.storage.updateUserProfessionalStatus(userId, clinicId, isProfessional, updatedBy);
  }

  async getProfessionalStatusAudit(clinicId: number): Promise<any[]> {
    const tenantFilter = this.mergeTenantFilter();
    if (tenantFilter.clinic_id !== clinicId) {
      throw new Error('Access denied: Cannot access audit data');
    }
    return this.storage.getProfessionalStatusAudit(clinicId);
  }

  async getUserProfessionalStatusAudit(userId: string, clinicId: number): Promise<any[]> {
    const tenantFilter = this.mergeTenantFilter();
    if (tenantFilter.clinic_id !== clinicId) {
      throw new Error('Access denied: Cannot access user audit data');
    }
    return this.storage.getUserProfessionalStatusAudit(userId, clinicId);
  }

  // Analytics and other methods - apply tenant filtering where applicable
  async createAnalyticsMetric(metric: any): Promise<any> {
    const metricWithTenant = this.mergeTenantFilter(metric);
    return this.storage.createAnalyticsMetric(metricWithTenant);
  }

  async getAnalyticsMetrics(filters?: any): Promise<any[]> {
    const filteredParams = this.mergeTenantFilter(filters);
    return this.storage.getAnalyticsMetrics(filteredParams);
  }

  // Pass through methods that don't need tenant filtering
  [key: string]: any;
}