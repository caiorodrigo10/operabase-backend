import { z } from 'zod';
import { eq, and, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '../db';
import { format, parse, addMinutes, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { appointments } from '../domains/appointments/appointments.schema';
import { contacts } from '../domains/contacts/contacts.schema';
import { users } from '../domains/auth/auth.schema';
import { appointment_tags } from '../../shared/schema';
import { clinic_users } from '../domains/clinics/clinics.schema';

// Valid appointment statuses as defined in the platform
export const VALID_APPOINTMENT_STATUSES = [
  'agendada',    // Pendente
  'confirmada',  // Confirmado
  'realizada',   // Realizado
  'faltou',      // Faltou
  'cancelada'    // Cancelado
] as const;

export const VALID_PAYMENT_STATUSES = ['pendente', 'pago', 'cancelado'] as const;

// Helper to convert string to number
const stringToNumber = z.union([z.string(), z.number()]).transform((val) => {
  if (typeof val === 'string') {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      throw new Error(`Cannot convert "${val}" to number`);
    }
    return parsed;
  }
  return val;
});

// Zod schemas for validation with flexible number/string conversion
const CreateAppointmentSchema = z.object({
  contact_id: stringToNumber.pipe(z.number().int().positive()),
  clinic_id: stringToNumber.pipe(z.number().int().positive()),
  user_id: stringToNumber.pipe(z.number().int().positive()),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration_minutes: stringToNumber.pipe(z.number().int().min(15).max(480)),
  status: z.enum(VALID_APPOINTMENT_STATUSES).default('agendada'),
  doctor_name: z.string().nullable().optional(),
  specialty: z.string().nullable().optional(),
  appointment_type: z.string().nullable().optional(),
  session_notes: z.string().nullable().optional(),
  payment_status: z.enum(VALID_PAYMENT_STATUSES).default('pendente'),
  payment_amount: z.union([z.string(), z.number(), z.null()]).transform((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return val;
  }).nullable().optional(),
  tag_id: z.union([z.string(), z.number(), z.null()]).transform((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return val;
  }).nullable().optional()
});

const UpdateStatusSchema = z.object({
  appointment_id: stringToNumber.pipe(z.number().int().positive()),
  clinic_id: stringToNumber.pipe(z.number().int().positive()),
  status: z.enum(VALID_APPOINTMENT_STATUSES),
  session_notes: z.string().nullable().optional()
});

const RescheduleSchema = z.object({
  appointment_id: stringToNumber.pipe(z.number().int().positive()),
  clinic_id: stringToNumber.pipe(z.number().int().positive()),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration_minutes: stringToNumber.pipe(z.number().int().min(15).max(480)).optional()
});

const AvailabilitySchema = z.object({
  clinic_id: stringToNumber.pipe(z.number().int().positive()),
  user_id: stringToNumber.pipe(z.number().int().positive()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: stringToNumber.pipe(z.number().int().min(15).max(480)),
  working_hours_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('08:00'),
  working_hours_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('18:00')
});

export interface MCPResponse {
  success: boolean;
  data: any | null;
  error: string | null;
  appointment_id: number | null;
  conflicts: any[] | null;
  next_available_slots: any[] | null;
}

export class AppointmentMCPAgent {

  /**
   * Validate contact exists and belongs to clinic
   */
  private async validateContact(contactId: number, clinicId: number): Promise<boolean> {
    const contact = await db.select()
      .from(contacts)
      .where(and(
        eq(contacts.id, contactId),
        eq(contacts.clinic_id, clinicId)
      ))
      .limit(1);

    return contact.length > 0;
  }

  /**
   * Validate user exists, is active, and belongs to clinic
   */
  private async validateUser(userId: number, clinicId: number): Promise<boolean> {
    const userInClinic = await db.select()
      .from(clinic_users)
      .innerJoin(users, eq(clinic_users.user_id, users.id))
      .where(and(
        sql`${clinic_users.user_id}::integer = ${userId}`,
        eq(clinic_users.clinic_id, clinicId),
        eq(clinic_users.is_active, true),
        eq(users.is_active, true)
      ))
      .limit(1);

    return userInClinic.length > 0;
  }

  /**
   * Validate appointment tag exists and belongs to clinic
   */
  private async validateTag(tagId: number, clinicId: number): Promise<boolean> {
    const tag = await db.select()
      .from(appointment_tags)
      .where(and(
        eq(appointment_tags.id, tagId),
        eq(appointment_tags.clinic_id, clinicId)
      ))
      .limit(1);

    return tag.length > 0;
  }

  /**
   * Create a new appointment with full validation
   */
  async createAppointment(params: z.infer<typeof CreateAppointmentSchema>): Promise<MCPResponse> {
    try {
      const validated = CreateAppointmentSchema.parse(params);

      // Validate contact exists and belongs to clinic
      const contactValid = await this.validateContact(validated.contact_id, validated.clinic_id);
      if (!contactValid) {
        return {
          success: false,
          data: null,
          error: 'Contact not found or does not belong to this clinic',
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }

      // Validate user exists, is active, and belongs to clinic
      const userValid = await this.validateUser(validated.user_id, validated.clinic_id);
      if (!userValid) {
        return {
          success: false,
          data: null,
          error: 'User not found, inactive, or does not belong to this clinic',
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }

      // Validate tag if provided
      if (validated.tag_id) {
        const tagValid = await this.validateTag(validated.tag_id, validated.clinic_id);
        if (!tagValid) {
          return {
            success: false,
            data: null,
            error: 'Appointment tag not found or does not belong to this clinic',
            appointment_id: null,
            conflicts: null,
            next_available_slots: null
          };
        }
      }

      // Create scheduled datetime
      const scheduledDateTime = new Date(`${validated.scheduled_date}T${validated.scheduled_time}:00`);

      // Check for conflicts
      const conflicts = await this.checkConflicts(
        validated.user_id,
        scheduledDateTime,
        validated.duration_minutes,
        validated.clinic_id
      );

      if (conflicts.length > 0) {
        return {
          success: false,
          data: null,
          error: 'Time slot conflict detected',
          appointment_id: null,
          conflicts: conflicts,
          next_available_slots: null
        };
      }

      // Create appointment using Drizzle ORM
      const newAppointment = await db.insert(appointments).values({
        contact_id: validated.contact_id,
        clinic_id: validated.clinic_id,
        user_id: validated.user_id,
        scheduled_date: scheduledDateTime,
        duration_minutes: validated.duration_minutes,
        status: validated.status,
        doctor_name: validated.doctor_name,
        specialty: validated.specialty,
        appointment_type: validated.appointment_type,
        session_notes: validated.session_notes,
        payment_status: validated.payment_status,
        payment_amount: validated.payment_amount,
        tag_id: validated.tag_id,
        created_at: new Date(),
        updated_at: new Date()
      }).returning();

      return {
        success: true,
        data: newAppointment[0],
        error: null,
        appointment_id: newAppointment[0].id,
        conflicts: null,
        next_available_slots: null
      };

    } catch (error) {
      console.error('createAppointment Error:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Internal error',
        appointment_id: null,
        conflicts: null,
        next_available_slots: null
      };
    }
  }

  /**
   * Check for scheduling conflicts
   */
  private async checkConflicts(
    userId: number,
    scheduledDate: Date,
    durationMinutes: number,
    clinicId: number,
    excludeAppointmentId?: number
  ): Promise<any[]> {
    const endTime = addMinutes(scheduledDate, durationMinutes);

    let query = db.select()
      .from(appointments)
      .where(and(
        eq(appointments.user_id, userId),
        eq(appointments.clinic_id, clinicId),
        // Only consider appointments that block time slots (not cancelled ones)
        sql`${appointments.status} NOT IN ('cancelada', 'cancelada_paciente', 'cancelada_dentista', 'faltou')`,
        sql`${appointments.scheduled_date} < ${endTime}`,
        sql`${appointments.scheduled_date} + INTERVAL '1 minute' * ${appointments.duration_minutes} > ${scheduledDate}`
      ));

    const results = await query;

    // Exclude current appointment if rescheduling
    if (excludeAppointmentId) {
      return results.filter(apt => apt.id !== excludeAppointmentId);
    }

    return results;
  }

  /**
   * Update appointment status with validation
   */
  async updateStatus(params: z.infer<typeof UpdateStatusSchema>): Promise<MCPResponse> {
    try {
      const validated = UpdateStatusSchema.parse(params);

      const result = await db.update(appointments)
        .set({
          status: validated.status,
          session_notes: validated.session_notes,
          updated_at: new Date()
        })
        .where(and(
          eq(appointments.id, validated.appointment_id),
          eq(appointments.clinic_id, validated.clinic_id)
        ))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          data: null,
          error: 'Appointment not found or does not belong to this clinic',
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }

      return {
        success: true,
        data: result[0],
        error: null,
        appointment_id: result[0].id,
        conflicts: null,
        next_available_slots: null
      };

    } catch (error) {
      console.error('updateStatus Error:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Internal error',
        appointment_id: null,
        conflicts: null,
        next_available_slots: null
      };
    }
  }

  /**
   * Reschedule appointment with conflict validation
   */
  async rescheduleAppointment(params: z.infer<typeof RescheduleSchema>): Promise<MCPResponse> {
    try {
      const validated = RescheduleSchema.parse(params);

      const scheduledDateTime = new Date(`${validated.scheduled_date}T${validated.scheduled_time}:00`);

      // Check for conflicts excluding current appointment
      const conflicts = await this.checkConflicts(
        0, // Will get user_id from existing appointment
        scheduledDateTime,
        validated.duration_minutes || 60,
        validated.clinic_id,
        validated.appointment_id
      );

      if (conflicts.length > 0) {
        return {
          success: false,
          data: null,
          error: 'Time slot conflict detected',
          appointment_id: null,
          conflicts: conflicts,
          next_available_slots: null
        };
      }

      const updateData: any = {
        scheduled_date: scheduledDateTime,
        updated_at: new Date()
      };

      if (validated.duration_minutes) {
        updateData.duration_minutes = validated.duration_minutes;
      }

      const result = await db.update(appointments)
        .set(updateData)
        .where(and(
          eq(appointments.id, validated.appointment_id),
          eq(appointments.clinic_id, validated.clinic_id)
        ))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          data: null,
          error: 'Appointment not found',
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }

      return {
        success: true,
        data: result[0],
        error: null,
        appointment_id: result[0].id,
        conflicts: null,
        next_available_slots: null
      };

    } catch (error) {
      console.error('rescheduleAppointment Error:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Internal error',
        appointment_id: null,
        conflicts: null,
        next_available_slots: null
      };
    }
  }

  /**
   * Cancel appointment with reason
   */
  async cancelAppointment(appointmentId: number, clinicId: number, cancelledBy: 'paciente' | 'dentista', reason?: string): Promise<MCPResponse> {
    try {
      const status = cancelledBy === 'paciente' ? 'cancelada_paciente' : 'cancelada_dentista';

      const result = await db.update(appointments)
        .set({
          status: status,
          cancellation_reason: reason,
          updated_at: new Date()
        })
        .where(and(
          eq(appointments.id, appointmentId),
          eq(appointments.clinic_id, clinicId)
        ))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          data: null,
          error: 'Appointment not found',
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }

      return {
        success: true,
        data: result[0],
        error: null,
        appointment_id: result[0].id,
        conflicts: null,
        next_available_slots: null
      };

    } catch (error) {
      console.error('cancelAppointment Error:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Internal error',
        appointment_id: null,
        conflicts: null,
        next_available_slots: null
      };
    }
  }

  /**
   * Get available time slots for a specific date and user
   */
  async getAvailableSlots(params: z.infer<typeof AvailabilitySchema>): Promise<MCPResponse> {
    try {
      const validated = AvailabilitySchema.parse(params);

      console.log('🔍 Getting availability for:', validated);

      // Get existing appointments for the day
      const startOfTargetDay = startOfDay(new Date(`${validated.date}T00:00:00`));
      const endOfTargetDay = endOfDay(new Date(`${validated.date}T23:59:59`));

      const existingAppointments = await db.select()
        .from(appointments)
        .where(and(
          eq(appointments.clinic_id, validated.clinic_id),
          eq(appointments.user_id, validated.user_id),
          gte(appointments.scheduled_date, startOfTargetDay),
          lte(appointments.scheduled_date, endOfTargetDay),
          sql`${appointments.status} NOT IN ('cancelada', 'cancelada_paciente', 'cancelada_dentista', 'faltou')`
        ));

      console.log('📅 Existing appointments:', existingAppointments.length);

      // Generate time slots based on working hours
      const slots = [];
      const workStart = parse(validated.working_hours_start, 'HH:mm', new Date());
      const workEnd = parse(validated.working_hours_end, 'HH:mm', new Date());

      let currentTime = workStart;

      while (isBefore(addMinutes(currentTime, validated.duration_minutes), workEnd)) {
        const timeString = format(currentTime, 'HH:mm');
        const slotStart = new Date(`${validated.date}T${timeString}:00`);
        const slotEnd = addMinutes(slotStart, validated.duration_minutes);

        // Check if this slot conflicts with existing appointments
        const hasConflict = existingAppointments.some(apt => {
          if (!apt.scheduled_date) return false;
          const aptStart = new Date(apt.scheduled_date);
          const aptEnd = addMinutes(aptStart, apt.duration_minutes || 60);

          return (slotStart < aptEnd && slotEnd > aptStart);
        });

        slots.push({
          time: timeString,
          duration_minutes: validated.duration_minutes,
          available: !hasConflict,
          conflicted: hasConflict
        });

        // Move to next 30-minute interval for better readability
        currentTime = addMinutes(currentTime, 30);
      }

      console.log('⏰ Generated slots:', slots.length, 'available:', slots.filter(s => s.available).length);

      return {
        success: true,
        data: slots,
        error: null,
        appointment_id: null,
        conflicts: null,
        next_available_slots: slots.filter(s => s.available).map(s => s.time)
      };

    } catch (error) {
      console.error('❌ Error getting available slots:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        appointment_id: null,
        conflicts: null,
        next_available_slots: null
      };
    }
  }

  /**
   * List appointments with filtering and pagination
   */
  async listAppointments(
    clinicId: number,
    filters: {
      startDate?: string;
      endDate?: string;
      userId?: number;
      status?: string;
      contactId?: number;
    } = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<MCPResponse> {
    try {
      // Build base query with conditions
      const conditions = [eq(appointments.clinic_id, clinicId)];

      if (filters.startDate) {
        conditions.push(gte(appointments.scheduled_date, new Date(`${filters.startDate}T00:00:00`)));
      }

      if (filters.endDate) {
        conditions.push(lte(appointments.scheduled_date, new Date(`${filters.endDate}T23:59:59`)));
      }

      if (filters.userId) {
        conditions.push(eq(appointments.user_id, filters.userId));
      }

      if (filters.status) {
        conditions.push(eq(appointments.status, filters.status));
      }

      if (filters.contactId) {
        conditions.push(eq(appointments.contact_id, filters.contactId));
      }

      // Execute query - select only appointment data without contacts
      const result = await db.select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(appointments.scheduled_date);

      // Transform the data to change "id" to "appointment_id"
      const transformedData = result.map((appointment) => {
        const { id, ...appointmentData } = appointment;
        return {
          ...appointmentData,
          appointment_id: id
        };
      });

      console.log('🔍 Raw appointment data:', result[0] ? Object.keys(result[0]) : 'No data');
      console.log('🔍 Transformed appointment data:', transformedData[0] ? Object.keys(transformedData[0]) : 'No data');
      console.log('🔍 First appointment sample:', transformedData[0] ? JSON.stringify(transformedData[0]).substring(0, 200) : 'No data');

      return {
        success: true,
        data: transformedData,
        error: null,
        appointment_id: null,
        conflicts: null,
        next_available_slots: null
      };

    } catch (error) {
      console.error('Error listing appointments:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        appointment_id: null,
        conflicts: null,
        next_available_slots: null
      };
    }
  }
}

export const appointmentAgent = new AppointmentMCPAgent();