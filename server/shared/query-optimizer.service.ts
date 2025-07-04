import { eq, and, inArray, or, ilike, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { contacts } from '../domains/contacts/contacts.schema.js';
import { appointments } from '../domains/appointments/appointments.schema.js';
import { conversations } from '../domains/contacts/contacts.schema.js';
import { medical_records } from '../domains/medical-records/medical-records.schema.js';
import { clinic_users } from '../domains/clinics/clinics.schema.js';

/**
 * Query Optimization Service
 * Eliminates N+1 queries and provides optimized data fetching patterns
 * for multi-tenant healthcare platform
 */
export class QueryOptimizerService {
  
  /**
   * Optimized contact loading with related data in single query batch
   * Eliminates N+1 queries for contact lists with appointments/conversations
   */
  async getContactsWithRelatedData(clinicId: number, limit: number = 100) {
    // Single optimized query using composite index
    const contactsList = await db
      .select()
      .from(contacts)
      .where(eq(contacts.clinic_id, clinicId))
      .orderBy(contacts.last_interaction)
      .limit(limit);

    if (contactsList.length === 0) {
      return [];
    }

    const contactIds = contactsList.map(c => c.id);

    // Batch fetch related data to avoid N+1 queries
    const [appointmentsList, conversationsList] = await Promise.all([
      // Fetch all appointments for these contacts in single query
      db
        .select()
        .from(appointments)
        .where(and(
          inArray(appointments.contact_id, contactIds),
          eq(appointments.clinic_id, clinicId)
        )),
      
      // Fetch all conversations for these contacts in single query
      db
        .select()
        .from(conversations)
        .where(and(
          inArray(conversations.contact_id, contactIds),
          eq(conversations.clinic_id, clinicId)
        ))
    ]);

    // Create lookup maps for O(1) access
    const appointmentsMap = new Map<number, typeof appointmentsList>();
    const conversationsMap = new Map<number, typeof conversationsList>();

    appointmentsList.forEach(apt => {
      if (!appointmentsMap.has(apt.contact_id)) {
        appointmentsMap.set(apt.contact_id, []);
      }
      appointmentsMap.get(apt.contact_id)!.push(apt);
    });

    conversationsList.forEach(conv => {
      if (!conversationsMap.has(conv.contact_id)) {
        conversationsMap.set(conv.contact_id, []);
      }
      conversationsMap.get(conv.contact_id)!.push(conv);
    });

    // Combine data efficiently
    return contactsList.map(contact => ({
      ...contact,
      appointments: appointmentsMap.get(contact.id) || [],
      conversations: conversationsMap.get(contact.id) || [],
      appointmentCount: (appointmentsMap.get(contact.id) || []).length,
      lastAppointment: (appointmentsMap.get(contact.id) || [])
        .sort((a, b) => new Date(b.scheduled_date || 0).getTime() - new Date(a.scheduled_date || 0).getTime())[0] || null
    }));
  }

  /**
   * Optimized appointment loading with contact and medical record data
   * Single batch query to avoid N+1 issues
   */
  async getAppointmentsWithContactData(clinicId: number, limit: number = 100) {
    // Primary appointment query using composite index
    const appointmentsList = await db
      .select()
      .from(appointments)
      .where(eq(appointments.clinic_id, clinicId))
      .orderBy(appointments.scheduled_date)
      .limit(limit);

    if (appointmentsList.length === 0) {
      return [];
    }

    const contactIds = [...new Set(appointmentsList.map(a => a.contact_id))];
    const appointmentIds = appointmentsList.map(a => a.id);

    // Batch fetch related data
    const [contactsList, medicalRecordsList] = await Promise.all([
      db
        .select()
        .from(contacts)
        .where(and(
          inArray(contacts.id, contactIds),
          eq(contacts.clinic_id, clinicId)
        )),
      
      db
        .select()
        .from(medical_records)
        .where(and(
          inArray(medical_records.appointment_id, appointmentIds),
          eq(medical_records.clinic_id, clinicId)
        ))
    ]);

    // Create efficient lookup maps
    const contactsMap = new Map(contactsList.map(c => [c.id, c]));
    const medicalRecordsMap = new Map<number, typeof medicalRecordsList>();

    medicalRecordsList.forEach(record => {
      if (record.appointment_id) {
        if (!medicalRecordsMap.has(record.appointment_id)) {
          medicalRecordsMap.set(record.appointment_id, []);
        }
        medicalRecordsMap.get(record.appointment_id)!.push(record);
      }
    });

    return appointmentsList.map(appointment => ({
      ...appointment,
      contact: contactsMap.get(appointment.contact_id) || null,
      medicalRecords: medicalRecordsMap.get(appointment.id) || []
    }));
  }

  /**
   * Optimized clinic users query with role and permission data
   */
  async getClinicUsersOptimized(clinicId: number) {
    return await db
      .select()
      .from(clinic_users)
      .where(and(
        eq(clinic_users.clinic_id, clinicId),
        eq(clinic_users.is_active, true)
      ));
  }

  /**
   * Optimized search functionality for contacts with indexing
   */
  async searchContactsOptimized(clinicId: number, searchTerm: string, limit: number = 50) {
    const searchPattern = `%${searchTerm}%`;
    
    return await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.clinic_id, clinicId),
        // Using indexed columns for search
        or(
          ilike(contacts.name, searchPattern),
          ilike(contacts.phone, searchPattern),
          ilike(contacts.email, searchPattern)
        )
      ))
      .orderBy(contacts.last_interaction)
      .limit(limit);
  }

  /**
   * Optimized appointment availability checking
   * Uses composite indexes for fast date range queries
   */
  async checkAppointmentAvailability(
    clinicId: number, 
    startDate: Date, 
    endDate: Date,
    userId?: number
  ) {
    const query = db
      .select({
        id: appointments.id,
        scheduled_date: appointments.scheduled_date,
        duration_minutes: appointments.duration_minutes,
        user_id: appointments.user_id,
        status: appointments.status
      })
      .from(appointments)
      .where(and(
        eq(appointments.clinic_id, clinicId),
        gte(appointments.scheduled_date, startDate),
        lte(appointments.scheduled_date, endDate),
        ne(appointments.status, 'cancelada_paciente'),
        ne(appointments.status, 'cancelada_dentista')
      ));

    if (userId) {
      query.where(eq(appointments.user_id, userId));
    }

    return await query.orderBy(appointments.scheduled_date);
  }

  /**
   * Batch insert optimization for bulk operations
   */
  async batchInsertContacts(clinicId: number, contactsData: any[]) {
    const batchSize = 100; // Optimal batch size for PostgreSQL
    const results = [];

    for (let i = 0; i < contactsData.length; i += batchSize) {
      const batch = contactsData.slice(i, i + batchSize);
      const batchWithClinic = batch.map(contact => ({
        ...contact,
        clinic_id: clinicId
      }));

      const batchResult = await db
        .insert(contacts)
        .values(batchWithClinic)
        .returning();

      results.push(...batchResult);
    }

    return results;
  }

  /**
   * Optimized dashboard metrics query
   * Single query for multiple aggregations
   */
  async getDashboardMetrics(clinicId: number) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Single aggregation query using composite indexes
    const [
      totalContacts,
      monthlyAppointments,
      activeConversations,
      recentMedicalRecords
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(eq(contacts.clinic_id, clinicId)),

      db
        .select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(and(
          eq(appointments.clinic_id, clinicId),
          gte(appointments.scheduled_date, startOfMonth),
          lte(appointments.scheduled_date, endOfMonth)
        )),

      db
        .select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(and(
          eq(conversations.clinic_id, clinicId),
          eq(conversations.status, 'active')
        )),

      db
        .select({ count: sql<number>`count(*)` })
        .from(medical_records)
        .where(and(
          eq(medical_records.clinic_id, clinicId),
          gte(medical_records.created_at, startOfMonth)
        ))
    ]);

    return {
      totalContacts: totalContacts[0]?.count || 0,
      monthlyAppointments: monthlyAppointments[0]?.count || 0,
      activeConversations: activeConversations[0]?.count || 0,
      recentMedicalRecords: recentMedicalRecords[0]?.count || 0
    };
  }

  /**
   * Performance monitoring for query optimization
   */
  async getQueryPerformanceMetrics() {
    // Check for slow queries and index usage
    const slowQueries = await db.execute(sql`
      SELECT 
        query,
        mean_time,
        calls,
        total_time,
        stddev_time
      FROM pg_stat_statements 
      WHERE mean_time > 100 
      ORDER BY mean_time DESC 
      LIMIT 10
    `);

    const indexUsage = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('contacts', 'appointments', 'conversations', 'messages', 'medical_records')
      ORDER BY idx_tup_read DESC
    `);

    return {
      slowQueries,
      indexUsage
    };
  }
}

// Singleton instance for application use
export const queryOptimizer = new QueryOptimizerService();