import { MCPResource } from './mcp-protocol';
import { db } from '../db';
import { contacts } from '../domains/contacts/contacts.schema';
import { appointments } from '../domains/appointments/appointments.schema';
import { users } from '../domains/auth/auth.schema';
import { clinic_users } from '../domains/clinics/clinics.schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { format } from 'date-fns';

/**
 * MCP Resources Registry - Define todos os resources disponíveis conforme especificação MCP
 */
export class MCPResourcesRegistry {
  private static resources: MCPResource[] = [
    {
      uri: 'clinic://contacts',
      name: 'Contatos da Clínica',
      description: 'Lista de todos os contatos/pacientes da clínica',
      mimeType: 'application/json'
    },
    {
      uri: 'clinic://appointments/today',
      name: 'Consultas de Hoje',
      description: 'Consultas agendadas para o dia atual',
      mimeType: 'application/json'
    },
    {
      uri: 'clinic://appointments/week',
      name: 'Consultas da Semana',
      description: 'Consultas agendadas para os próximos 7 dias',
      mimeType: 'application/json'
    },
    {
      uri: 'clinic://professionals',
      name: 'Profissionais da Clínica',
      description: 'Lista de usuários profissionais ativos na clínica',
      mimeType: 'application/json'
    },
    {
      uri: 'clinic://availability/today',
      name: 'Disponibilidade Hoje',
      description: 'Horários disponíveis para agendamento hoje',
      mimeType: 'application/json'
    },
    {
      uri: 'clinic://appointments/pending',
      name: 'Consultas Pendentes',
      description: 'Consultas com status agendada ou confirmada',
      mimeType: 'application/json'
    },
    {
      uri: 'clinic://statistics/summary',
      name: 'Resumo Estatístico',
      description: 'Estatísticas gerais da clínica (consultas, pacientes, etc.)',
      mimeType: 'application/json'
    }
  ];

  /**
   * Retorna todos os resources disponíveis
   */
  static getResourcesList(): MCPResource[] {
    return this.resources;
  }

  /**
   * Busca um resource específico pela URI
   */
  static getResource(uri: string): MCPResource | undefined {
    return this.resources.find(resource => resource.uri === uri);
  }

  /**
   * Verifica se um resource existe
   */
  static hasResource(uri: string): boolean {
    return this.resources.some(resource => resource.uri === uri);
  }

  /**
   * Obtém o conteúdo de um resource específico
   */
  static async getResourceContent(uri: string, clinicId: number): Promise<{
    uri: string;
    mimeType: string;
    text: string;
  }> {
    const resource = this.getResource(uri);
    if (!resource) {
      throw new Error(`Resource '${uri}' não encontrado`);
    }

    let content: any;

    switch (uri) {
      case 'clinic://contacts':
        content = await this.getContacts(clinicId);
        break;
      
      case 'clinic://appointments/today':
        content = await this.getAppointmentsToday(clinicId);
        break;
      
      case 'clinic://appointments/week':
        content = await this.getAppointmentsWeek(clinicId);
        break;
      
      case 'clinic://professionals':
        content = await this.getProfessionals(clinicId);
        break;
      
      case 'clinic://availability/today':
        content = await this.getAvailabilityToday(clinicId);
        break;
      
      case 'clinic://appointments/pending':
        content = await this.getPendingAppointments(clinicId);
        break;
      
      case 'clinic://statistics/summary':
        content = await this.getStatisticsSummary(clinicId);
        break;
      
      default:
        throw new Error(`Conteúdo para resource '${uri}' não implementado`);
    }

    return {
      uri,
      mimeType: resource.mimeType || 'application/json',
      text: JSON.stringify(content, null, 2)
    };
  }

  /**
   * Obtém contatos da clínica
   */
  private static async getContacts(clinicId: number) {
    const contactsList = await db.select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone
    })
    .from(contacts)
    .where(eq(contacts.clinic_id, clinicId))
    .orderBy(contacts.name);

    return {
      resource: 'contacts',
      clinic_id: clinicId,
      count: contactsList.length,
      data: contactsList,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Obtém consultas de hoje
   */
  private static async getAppointmentsToday(clinicId: number) {
    const today = format(new Date(), 'yyyy-MM-dd');

    const appointmentsList = await db.select()
      .from(appointments)
      .where(eq(appointments.clinic_id, clinicId));

    return {
      resource: 'appointments_today',
      clinic_id: clinicId,
      date: format(today, 'yyyy-MM-dd'),
      count: appointmentsList.length,
      data: appointmentsList,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Obtém consultas da semana
   */
  private static async getAppointmentsWeek(clinicId: number) {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const appointmentsList = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.clinic_id, clinicId),
        sql`${appointments.scheduled_date} >= ${today.toISOString()}`,
        sql`${appointments.scheduled_date} <= ${nextWeek.toISOString()}`
      ))
      .orderBy(appointments.scheduled_date);

    return {
      resource: 'appointments_week',
      clinic_id: clinicId,
      period: {
        start: format(today, 'yyyy-MM-dd'),
        end: format(nextWeek, 'yyyy-MM-dd')
      },
      count: appointmentsList.length,
      data: appointmentsList,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Obtém profissionais da clínica
   */
  private static async getProfessionals(clinicId: number) {
    const professionalsList = await db.select({
      user_id: clinic_users.user_id,
      name: users.name,
      email: users.email,
      role: clinic_users.role,
      is_professional: clinic_users.is_professional,
      is_active: clinic_users.is_active,
      joined_at: clinic_users.joined_at
    })
    .from(clinic_users)
    .innerJoin(users, eq(clinic_users.user_id, users.id))
    .where(and(
      eq(clinic_users.clinic_id, clinicId),
      eq(clinic_users.is_active, true),
      eq(clinic_users.is_professional, true)
    ))
    .orderBy(users.name);

    return {
      resource: 'professionals',
      clinic_id: clinicId,
      count: professionalsList.length,
      data: professionalsList,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Obtém disponibilidade de hoje
   */
  private static async getAvailabilityToday(clinicId: number) {
    // Esta é uma implementação simplificada
    // Idealmente, integraria com o sistema de disponibilidade real
    const today = format(new Date(), 'yyyy-MM-dd');
    
    return {
      resource: 'availability_today',
      clinic_id: clinicId,
      date: today,
      message: 'Disponibilidade baseada em consultas existentes',
      working_hours: {
        start: '08:00',
        end: '18:00'
      },
      note: 'Para disponibilidade detalhada, use a tool check_availability',
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Obtém consultas pendentes
   */
  private static async getPendingAppointments(clinicId: number) {
    const pendingList = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.clinic_id, clinicId),
        eq(appointments.status, 'agendada')
      ))
      .orderBy(appointments.scheduled_date);

    return {
      resource: 'pending_appointments',
      clinic_id: clinicId,
      count: pendingList.length,
      data: pendingList,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Obtém resumo estatístico
   */
  private static async getStatisticsSummary(clinicId: number) {
    // Contagem básica de entidades
    const [contactsCount, appointmentsCount, professionalsCount] = await Promise.all([
      db.select().from(contacts).where(eq(contacts.clinic_id, clinicId)),
      db.select().from(appointments).where(eq(appointments.clinic_id, clinicId)),
      db.select()
        .from(clinic_users)
        .where(and(
          eq(clinic_users.clinic_id, clinicId),
          eq(clinic_users.is_active, true),
          eq(clinic_users.is_professional, true)
        ))
    ]);

    return {
      resource: 'statistics_summary',
      clinic_id: clinicId,
      statistics: {
        total_contacts: contactsCount.length,
        total_appointments: appointmentsCount.length,
        active_professionals: professionalsCount.length
      },
      generated_at: new Date().toISOString()
    };
  }
}