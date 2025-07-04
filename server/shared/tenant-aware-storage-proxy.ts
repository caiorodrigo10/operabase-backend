import { tenantContext } from './tenant-context.provider.js';
import type { IStorage } from '../storage.js';

/**
 * Tenant-aware storage proxy that transparently adds clinic_id filtering
 * Maintains complete compatibility with existing IStorage interface
 */
export class TenantAwareStorageProxy implements IStorage {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  // Helper to get clinic_id from tenant context
  private getClinicId(): number {
    try {
      const context = tenantContext.getContext();
      return context?.clinicId || 1; // Default to clinic 1 for now
    } catch (error) {
      return 1; // Fallback to clinic 1
    }
  }

  // User methods (no tenant filtering needed)
  async getUser(id: number) {
    return this.storage.getUser(id);
  }

  async getUserByEmail(email: string) {
    return this.storage.getUserByEmail(email);
  }

  async createUser(user: any) {
    return this.storage.createUser(user);
  }

  async updateUser(id: number, user: any) {
    return this.storage.updateUser(id, user);
  }

  // Clinic methods - validate access
  async getClinic(id: number) {
    const clinicId = this.getClinicId();
    if (id !== clinicId) {
      throw new Error('Access denied: Cannot access clinic');
    }
    return this.storage.getClinic(id);
  }

  async createClinic(clinic: any) {
    return this.storage.createClinic(clinic);
  }

  async updateClinic(id: number, clinic: any) {
    const clinicId = this.getClinicId();
    if (id !== clinicId) {
      throw new Error('Access denied: Cannot update clinic');
    }
    return this.storage.updateClinic(id, clinic);
  }

  // Contact methods - auto-filter by clinic_id
  async getContacts(clinicId?: number, filters?: any) {
    const tenantClinicId = this.getClinicId();
    return this.storage.getContacts(tenantClinicId, filters);
  }

  async getContact(id: number) {
    return this.storage.getContact(id);
  }

  async createContact(contact: any) {
    const clinicId = this.getClinicId();
    return this.storage.createContact({ ...contact, clinic_id: clinicId });
  }

  async updateContact(id: number, contact: any) {
    return this.storage.updateContact(id, contact);
  }

  async updateContactStatus(id: number, status: string) {
    return this.storage.updateContactStatus(id, status);
  }

  // Appointment methods - auto-filter by clinic_id
  async getAppointments(clinicId?: number, filters?: any) {
    const tenantClinicId = this.getClinicId();
    return this.storage.getAppointments(tenantClinicId, filters);
  }

  async getAppointment(id: number) {
    return this.storage.getAppointment(id);
  }

  async createAppointment(appointment: any) {
    const clinicId = this.getClinicId();
    return this.storage.createAppointment({ ...appointment, clinic_id: clinicId });
  }

  async updateAppointment(id: number, appointment: any) {
    return this.storage.updateAppointment(id, appointment);
  }

  async deleteAppointment(id: number) {
    return this.storage.deleteAppointment(id);
  }

  async getAppointmentsByContact(contactId: number) {
    return this.storage.getAppointmentsByContact(contactId);
  }

  async getAppointmentsByDateRange(startDate: Date, endDate: Date) {
    return this.storage.getAppointmentsByDateRange(startDate, endDate);
  }

  // Medical Records methods - auto-filter by clinic_id
  async getMedicalRecords(contactId: number, clinicId?: number) {
    const tenantClinicId = this.getClinicId();
    return this.storage.getMedicalRecords(contactId, clinicId || tenantClinicId);
  }

  async getMedicalRecord(id: number) {
    return this.storage.getMedicalRecord(id);
  }

  async getMedicalRecordByAppointment(appointmentId: number) {
    return this.storage.getMedicalRecordByAppointment(appointmentId);
  }

  async createMedicalRecord(record: any) {
    const clinicId = this.getClinicId();
    return this.storage.createMedicalRecord({ ...record, clinic_id: clinicId });
  }

  async updateMedicalRecord(id: number, updates: any) {
    return this.storage.updateMedicalRecord(id, updates);
  }

  async deleteMedicalRecord(id: number) {
    return this.storage.deleteMedicalRecord(id);
  }

  // Analytics methods - auto-filter by clinic_id
  async createAnalyticsMetric(metric: any) {
    const clinicId = this.getClinicId();
    return this.storage.createAnalyticsMetric({ ...metric, clinic_id: clinicId });
  }

  async getAnalyticsMetrics(clinicId?: number, metricType?: string, dateRange?: any) {
    const tenantClinicId = this.getClinicId();
    return this.storage.getAnalyticsMetrics(tenantClinicId, metricType, dateRange);
  }

  // Settings methods - auto-filter by clinic_id
  async getClinicSettings(clinicId?: number) {
    const tenantClinicId = this.getClinicId();
    return this.storage.getClinicSettings(tenantClinicId);
  }

  async getClinicSetting(clinicId: number, key: string) {
    const tenantClinicId = this.getClinicId();
    return this.storage.getClinicSetting(tenantClinicId, key);
  }

  async setClinicSetting(setting: any) {
    const clinicId = this.getClinicId();
    return this.storage.setClinicSetting({ ...setting, clinic_id: clinicId });
  }

  // AI Templates methods - auto-filter by clinic_id
  async getAiTemplates(clinicId?: number, templateType?: string) {
    const tenantClinicId = this.getClinicId();
    return this.storage.getAiTemplates(tenantClinicId, templateType);
  }

  async getAiTemplate(id: number) {
    return this.storage.getAiTemplate(id);
  }

  async createAiTemplate(template: any) {
    const clinicId = this.getClinicId();
    return this.storage.createAiTemplate({ ...template, clinic_id: clinicId });
  }

  async updateAiTemplate(id: number, template: any) {
    return this.storage.updateAiTemplate(id, template);
  }

  // Pipeline methods - auto-filter by clinic_id
  async getPipelineStages(clinicId?: number) {
    const tenantClinicId = this.getClinicId();
    return this.storage.getPipelineStages(tenantClinicId);
  }

  async getPipelineStage(id: number) {
    return this.storage.getPipelineStage(id);
  }

  async createPipelineStage(stage: any) {
    const clinicId = this.getClinicId();
    return this.storage.createPipelineStage({ ...stage, clinic_id: clinicId });
  }

  async updatePipelineStage(id: number, stage: any) {
    return this.storage.updatePipelineStage(id, stage);
  }

  async deletePipelineStage(id: number) {
    return this.storage.deletePipelineStage(id);
  }

  async getPipelineOpportunities(clinicId?: number, filters?: any) {
    const tenantClinicId = this.getClinicId();
    return this.storage.getPipelineOpportunities(tenantClinicId, filters);
  }

  async getPipelineOpportunity(id: number) {
    return this.storage.getPipelineOpportunity(id);
  }

  async createPipelineOpportunity(opportunity: any) {
    const clinicId = this.getClinicId();
    return this.storage.createPipelineOpportunity({ ...opportunity, clinic_id: clinicId });
  }

  async updatePipelineOpportunity(id: number, opportunity: any) {
    return this.storage.updatePipelineOpportunity(id, opportunity);
  }

  async moveOpportunityToStage(opportunityId: number, newStageId: number, changedBy?: string, notes?: string) {
    return this.storage.moveOpportunityToStage(opportunityId, newStageId, changedBy, notes);
  }

  // Pipeline History methods
  async getPipelineHistory(opportunityId: number) {
    return this.storage.getPipelineHistory(opportunityId);
  }

  async createPipelineHistory(history: any) {
    return this.storage.createPipelineHistory(history);
  }

  // User-Clinic relationship methods - validate access
  async getUserClinics(userId: number) {
    return this.storage.getUserClinics(userId);
  }

  async getClinicUsers(clinicId: number) {
    const tenantClinicId = this.getClinicId();
    if (clinicId !== tenantClinicId) {
      throw new Error('Access denied: Cannot access clinic users');
    }
    return this.storage.getClinicUsers(clinicId);
  }

  async addUserToClinic(clinicUser: any) {
    const clinicId = this.getClinicId();
    return this.storage.addUserToClinic({ ...clinicUser, clinic_id: clinicId });
  }

  async updateClinicUserRole(clinicId: number, userId: number, role: string, permissions?: any) {
    const tenantClinicId = this.getClinicId();
    if (clinicId !== tenantClinicId) {
      throw new Error('Access denied: Cannot update user role');
    }
    return this.storage.updateClinicUserRole(clinicId, userId, role, permissions);
  }

  async removeUserFromClinic(clinicId: number, userId: number) {
    const tenantClinicId = this.getClinicId();
    if (clinicId !== tenantClinicId) {
      throw new Error('Access denied: Cannot remove user from clinic');
    }
    return this.storage.removeUserFromClinic(clinicId, userId);
  }

  async userHasClinicAccess(userId: number, clinicId: number) {
    return this.storage.userHasClinicAccess(userId, clinicId);
  }

  // Clinic Invitations methods - auto-filter by clinic_id
  async createClinicInvitation(invitation: any) {
    const clinicId = this.getClinicId();
    return this.storage.createClinicInvitation({ ...invitation, clinic_id: clinicId });
  }

  async getClinicInvitation(token: string) {
    return this.storage.getClinicInvitation(token);
  }

  async acceptClinicInvitation(token: string, userId: number) {
    return this.storage.acceptClinicInvitation(token, userId);
  }

  async getClinicInvitations(clinicId: number) {
    const tenantClinicId = this.getClinicId();
    if (clinicId !== tenantClinicId) {
      throw new Error('Access denied: Cannot access clinic invitations');
    }
    return this.storage.getClinicInvitations(clinicId);
  }

  // Appointment Tags methods
  async getAppointmentTags(clinicId: number) {
    const tenantClinicId = this.getClinicId();
    if (clinicId !== tenantClinicId) {
      throw new Error('Access denied: Cannot access appointment tags');
    }
    return this.storage.getAppointmentTags(clinicId);
  }

  async getAppointmentTag(id: number) {
    return this.storage.getAppointmentTag(id);
  }

  async createAppointmentTag(tag: any) {
    const clinicId = this.getClinicId();
    const tagWithClinic = { ...tag, clinic_id: clinicId };
    return this.storage.createAppointmentTag(tagWithClinic);
  }

  async updateAppointmentTag(id: number, updates: any) {
    return this.storage.updateAppointmentTag(id, updates);
  }

  async deleteAppointmentTag(id: number) {
    return this.storage.deleteAppointmentTag(id);
  }

  // WhatsApp webhook methods - pass through without tenant filtering
  async updateWhatsAppConnectionFromWebhook(instanceName: string, updateData: any): Promise<boolean> {
    return this.storage.updateWhatsAppConnectionFromWebhook(instanceName, updateData);
  }

  async getWhatsAppNumbers(clinicId?: number) {
    const tenantClinicId = this.getClinicId();
    return this.storage.getWhatsAppNumbers(clinicId || tenantClinicId);
  }

  async getWhatsAppNumber(id: number) {
    return this.storage.getWhatsAppNumber(id);
  }

  async getWhatsAppNumberByPhone(phone: string, clinicId?: number) {
    const tenantClinicId = this.getClinicId();
    return this.storage.getWhatsAppNumberByPhone(phone, clinicId || tenantClinicId);
  }

  async getWhatsAppNumberByInstance(instanceName: string) {
    return this.storage.getWhatsAppNumberByInstance(instanceName);
  }

  async createWhatsAppNumber(whatsappNumber: any) {
    const clinicId = this.getClinicId();
    const numberWithClinic = { ...whatsappNumber, clinic_id: clinicId };
    return this.storage.createWhatsAppNumber(numberWithClinic);
  }

  async updateWhatsAppNumber(id: number, updates: any) {
    return this.storage.updateWhatsAppNumber(id, updates);
  }

  async updateWhatsAppNumberStatus(id: number, status: string, connectedAt?: Date) {
    return this.storage.updateWhatsAppNumberStatus(id, status, connectedAt);
  }

  async deleteWhatsAppNumber(id: number) {
    return this.storage.deleteWhatsAppNumber(id);
  }

  // Upload system methods - pass through without tenant filtering
  async getUserProfile(userId: string): Promise<{ clinic_id: number } | undefined> {
    return this.storage.getUserProfile(userId);
  }
  
  async createMessage(message: any): Promise<any> {
    return this.storage.createMessage(message);
  }

  async updateMessage(messageId: number, updates: any): Promise<any> {
    return this.storage.updateMessage(messageId, updates);
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

  // Livia Configuration methods with tenant isolation
  async getLiviaConfiguration(clinicId: number): Promise<any> {
    const tenantClinicId = this.getClinicId();
    
    // Validate tenant access
    if (clinicId !== tenantClinicId) {
      throw new Error('Access denied: Cannot access Livia configuration for different clinic');
    }
    
    return this.storage.getLiviaConfiguration(clinicId);
  }

  async createLiviaConfiguration(config: any): Promise<any> {
    const tenantClinicId = this.getClinicId();
    
    // Force tenant isolation
    const configWithTenant = {
      ...config,
      clinic_id: tenantClinicId
    };
    
    return this.storage.createLiviaConfiguration(configWithTenant);
  }

  async updateLiviaConfiguration(clinicId: number, updates: any): Promise<any> {
    const tenantClinicId = this.getClinicId();
    
    // Validate tenant access
    if (clinicId !== tenantClinicId) {
      throw new Error('Access denied: Cannot update Livia configuration for different clinic');
    }
    
    return this.storage.updateLiviaConfiguration(clinicId, updates);
  }

  async deleteLiviaConfiguration(clinicId: number): Promise<boolean> {
    const tenantClinicId = this.getClinicId();
    
    // Validate tenant access
    if (clinicId !== tenantClinicId) {
      throw new Error('Access denied: Cannot delete Livia configuration for different clinic');
    }
    
    return this.storage.deleteLiviaConfiguration(clinicId);
  }

  async getLiviaConfigurationForN8N(clinicId: number): Promise<any> {
    const tenantClinicId = this.getClinicId();
    
    // Validate tenant access
    if (clinicId !== tenantClinicId) {
      throw new Error('Access denied: Cannot access Livia configuration for different clinic');
    }
    
    return this.storage.getLiviaConfigurationForN8N(clinicId);
  }

  // Password Reset Token methods (no tenant filtering needed - global user functionality)
  async createPasswordResetToken(token: any) {
    return this.storage.createPasswordResetToken(token);
  }

  async getPasswordResetToken(token: string) {
    return this.storage.getPasswordResetToken(token);
  }

  async markPasswordResetTokenAsUsed(id: number) {
    return this.storage.markPasswordResetTokenAsUsed(id);
  }

  // Pass through any additional methods without modification
  [key: string]: any;
}