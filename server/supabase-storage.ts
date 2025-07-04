import { supabaseAdmin } from './supabase-client.js';
import type { IStorage } from './storage.js';
import type { 
  User, InsertUser,
  Clinic, InsertClinic,
  Contact, InsertContact,
  Conversation, InsertConversation,
  Message, InsertMessage,
  Appointment, InsertAppointment,
  MedicalRecord, InsertMedicalRecord,
  PipelineStage, InsertPipelineStage,
  PipelineOpportunity, InsertPipelineOpportunity,
  Customer, InsertCustomer,
  Charge, InsertCharge,
  CalendarIntegration, InsertCalendarIntegration
} from '../shared/schema.js';

export class SupabaseStorage implements IStorage {
  // Users
  async createUser(data: InsertUser): Promise<User> {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar usuário: ${error.message}`);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar usuário: ${error.message}`);
    }
    return user || undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar usuário: ${error.message}`);
    }
    return user || undefined;
  }

  // Clinics
  async createClinic(data: InsertClinic): Promise<Clinic> {
    const { data: clinic, error } = await supabaseAdmin
      .from('clinics')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar clínica: ${error.message}`);
    return clinic;
  }

  async getClinicById(id: number): Promise<Clinic | null> {
    const { data: clinic, error } = await supabaseAdmin
      .from('clinics')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar clínica: ${error.message}`);
    }
    return clinic || null;
  }

  async getClinics(): Promise<Clinic[]> {
    const { data: clinics, error } = await supabaseAdmin
      .from('clinics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao listar clínicas: ${error.message}`);
    return clinics || [];
  }

  // Contacts
  async createContact(data: InsertContact): Promise<Contact> {
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar contato: ${error.message}`);
    return contact;
  }

  async getContactById(id: number): Promise<Contact | null> {
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar contato: ${error.message}`);
    }
    return contact || null;
  }

  async getContactsByClinic(clinicId: number): Promise<Contact[]> {
    const { data: contacts, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('last_interaction', { ascending: false });

    if (error) throw new Error(`Erro ao listar contatos: ${error.message}`);
    return contacts || [];
  }

  async updateContact(id: number, data: Partial<InsertContact>): Promise<Contact> {
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar contato: ${error.message}`);
    return contact;
  }

  async deleteContact(id: number): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao deletar contato: ${error.message}`);
    return true;
  }

  // Appointments
  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar agendamento: ${error.message}`);
    return appointment;
  }

  async getAppointmentsByContact(contactId: number): Promise<Appointment[]> {
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('contact_id', contactId)
      .order('scheduled_date', { ascending: false });

    if (error) throw new Error(`Erro ao listar agendamentos: ${error.message}`);
    return appointments || [];
  }

  async getAppointmentsByClinic(clinicId: number): Promise<Appointment[]> {
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('scheduled_date', { ascending: false });

    if (error) throw new Error(`Erro ao listar agendamentos: ${error.message}`);
    return appointments || [];
  }

  async updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment> {
    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar agendamento: ${error.message}`);
    return appointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao deletar agendamento: ${error.message}`);
    return true;
  }

  // Medical Records
  async createMedicalRecord(data: InsertMedicalRecord): Promise<MedicalRecord> {
    const { data: record, error } = await supabaseAdmin
      .from('medical_records')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar prontuário: ${error.message}`);
    return record;
  }

  async getMedicalRecordsByContact(contactId: number): Promise<MedicalRecord[]> {
    const { data: records, error } = await supabaseAdmin
      .from('medical_records')
      .select('*')
      .eq('contact_id', contactId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao listar prontuários: ${error.message}`);
    return records || [];
  }

  async updateMedicalRecord(id: number, data: Partial<InsertMedicalRecord>): Promise<MedicalRecord> {
    const { data: record, error } = await supabaseAdmin
      .from('medical_records')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar prontuário: ${error.message}`);
    return record;
  }

  async deleteMedicalRecord(id: number): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('medical_records')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new Error(`Erro ao deletar prontuário: ${error.message}`);
    return true;
  }

  // Pipeline Stages
  async createPipelineStage(data: InsertPipelineStage): Promise<PipelineStage> {
    const { data: stage, error } = await supabaseAdmin
      .from('pipeline_stages')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar estágio: ${error.message}`);
    return stage;
  }

  async getPipelineStagesByClinic(clinicId: number): Promise<PipelineStage[]> {
    const { data: stages, error } = await supabaseAdmin
      .from('pipeline_stages')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('order_position', { ascending: true });

    if (error) throw new Error(`Erro ao listar estágios: ${error.message}`);
    return stages || [];
  }

  // Pipeline Opportunities
  async createPipelineOpportunity(data: InsertPipelineOpportunity): Promise<PipelineOpportunity> {
    const { data: opportunity, error } = await supabaseAdmin
      .from('pipeline_opportunities')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar oportunidade: ${error.message}`);
    return opportunity;
  }

  async getPipelineOpportunitiesByClinic(clinicId: number): Promise<PipelineOpportunity[]> {
    const { data: opportunities, error } = await supabaseAdmin
      .from('pipeline_opportunities')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao listar oportunidades: ${error.message}`);
    return opportunities || [];
  }

  // Financial - Customers
  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar cliente: ${error.message}`);
    return customer;
  }

  async getCustomersByClinic(clinicId: number): Promise<Customer[]> {
    const { data: customers, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao listar clientes: ${error.message}`);
    return customers || [];
  }

  // Financial - Charges
  async createCharge(data: InsertCharge): Promise<Charge> {
    const { data: charge, error } = await supabaseAdmin
      .from('charges')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar cobrança: ${error.message}`);
    return charge;
  }

  async getChargesByClinic(clinicId: number): Promise<Charge[]> {
    const { data: charges, error } = await supabaseAdmin
      .from('charges')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao listar cobranças: ${error.message}`);
    return charges || [];
  }

  // Calendar Integrations
  async createCalendarIntegration(data: InsertCalendarIntegration): Promise<CalendarIntegration> {
    const { data: integration, error } = await supabaseAdmin
      .from('calendar_integrations')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar integração: ${error.message}`);
    return integration;
  }

  async getCalendarIntegrationsByUser(userId: number): Promise<CalendarIntegration[]> {
    const { data: integrations, error } = await supabaseAdmin
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao listar integrações: ${error.message}`);
    return integrations || [];
  }

  // Conversations e Messages (implementações básicas)
  async createConversation(data: InsertConversation): Promise<Conversation> {
    const { data: conversation, error } = await supabaseAdmin
      .from('conversations')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar conversa: ${error.message}`);
    return conversation;
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar mensagem: ${error.message}`);
    return message;
  }

  async getConversationsByContact(contactId: number): Promise<Conversation[]> {
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao listar conversas: ${error.message}`);
    return conversations || [];
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (error) throw new Error(`Erro ao listar mensagens: ${error.message}`);
    return messages || [];
  }
}