import { z } from 'zod';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { format, parse, addMinutes, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { appointments } from '../domains/appointments/appointments.schema';
import { contacts } from '../domains/contacts/contacts.schema';
import { users } from '../domains/auth/auth.schema';
import { appointment_tags } from '../../shared/schema';
import { clinics } from '../domains/clinics/clinics.schema';

// Valid appointment statuses as defined in the platform
export const VALID_APPOINTMENT_STATUSES = [
  'agendada',    // Pendente
  'confirmada',  // Confirmado
  'realizada',   // Realizado
  'faltou',      // Faltou
  'cancelada'    // Cancelado
] as const;

export const VALID_PAYMENT_STATUSES = ['pendente', 'pago', 'cancelado'] as const;

// Zod schemas for validation
const CreateAppointmentSchema = z.object({
  contact_id: z.number().int().positive(),
  clinic_id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration_minutes: z.number().int().min(15).max(480),
  status: z.enum(VALID_APPOINTMENT_STATUSES).default('agendada'),
  doctor_name: z.string().nullable().optional(),
  specialty: z.string().nullable().optional(),
  appointment_type: z.string().nullable().optional(),
  session_notes: z.string().nullable().optional(),
  payment_status: z.enum(VALID_PAYMENT_STATUSES).default('pendente'),
  payment_amount: z.number().int().nullable().optional(),
  tag_id: z.number().int().nullable().optional()
});

const UpdateStatusSchema = z.object({
  appointment_id: z.number().int().positive(),
  clinic_id: z.number().int().positive(),
  status: z.enum(VALID_APPOINTMENT_STATUSES),
  session_notes: z.string().nullable().optional()
});

const RescheduleSchema = z.object({
  appointment_id: z.number().int().positive(),
  clinic_id: z.number().int().positive(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduled_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration_minutes: z.number().int().min(15).max(480).optional()
});

const AvailabilitySchema = z.object({
  clinic_id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.number().int().min(15).max(480),
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
   * Helper function to check if a date is a working day based on clinic configuration
   */
  private async isWorkingDay(date: string, clinicId: number): Promise<boolean> {
    try {
      // Get clinic configuration
      const clinic = await db.select()
        .from(clinics)
        .where(eq(clinics.id, clinicId))
        .limit(1);
      
      if (clinic.length === 0) {
        console.log(`⚠️ Clinic ${clinicId} not found, defaulting to working days Mon-Fri`);
        // Default to Monday-Friday if clinic not found
        const dayOfWeek = new Date(date).getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // 1=Monday, 5=Friday
      }
      
      const clinicConfig = clinic[0];
      const workingDays = clinicConfig.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      
      // Convert date to day of week key
      const dayOfWeek = new Date(date).getDay();
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayKey = dayKeys[dayOfWeek];
      
      const isWorking = workingDays.includes(dayKey);
      console.log(`📅 Working days check: ${date} (${dayKey}) - Working days: [${workingDays.join(', ')}] - Is working: ${isWorking}`);
      
      return isWorking;
    } catch (error) {
      console.error('Error checking working days:', error);
      // Default to Monday-Friday on error
      const dayOfWeek = new Date(date).getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    }
  }

  /**
   * Helper function to check if a time falls within lunch break for the clinic
   */
  private async isLunchTime(timeString: string, date: string, clinicId: number): Promise<boolean> {
    try {
      // Get clinic configuration
      const clinic = await db.select()
        .from(clinics)
        .where(eq(clinics.id, clinicId))
        .limit(1);
      
      if (clinic.length === 0) {
        console.log(`⚠️ Clinic ${clinicId} not found for lunch break check`);
        return false; // No lunch break if clinic not found
      }
      
      const clinicConfig = clinic[0];
      
      // If lunch break is not enabled, return false
      if (!clinicConfig.has_lunch_break) {
        console.log(`🍽️ Lunch break check: ${timeString} on ${date} - Clinic ${clinicId} has lunch break DISABLED`);
        return false;
      }
      
      const lunchStart = clinicConfig.lunch_start || '12:00';
      const lunchEnd = clinicConfig.lunch_end || '13:00';
      
      // Convert time strings to minutes for comparison
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const currentTimeMinutes = timeToMinutes(timeString);
      const lunchStartMinutes = timeToMinutes(lunchStart);
      const lunchEndMinutes = timeToMinutes(lunchEnd);
      
      // Check if current time falls within lunch break
      const isInLunchBreak = currentTimeMinutes >= lunchStartMinutes && currentTimeMinutes < lunchEndMinutes;
      
      console.log(`🍽️ Lunch break check: ${timeString} on ${date} - Clinic ${clinicId} lunch: ${lunchStart}-${lunchEnd} - Is lunch time: ${isInLunchBreak}`);
      
      return isInLunchBreak;
    } catch (error) {
      console.error('Error checking lunch break:', error);
      return false; // Default to no lunch break on error
    }
  }
  
  /**
   * Create a new appointment with full validation
   */
  async createAppointment(params: z.infer<typeof CreateAppointmentSchema>): Promise<MCPResponse> {
    try {
      // Validate input parameters
      const validated = CreateAppointmentSchema.parse(params);
      
      console.log(`🔍 MCP Appointment Creation: ${validated.scheduled_date} for clinic ${validated.clinic_id}`);
      
      // ETAPA 2: Check if the scheduled date is a working day
      const isWorkingDay = await this.isWorkingDay(validated.scheduled_date, validated.clinic_id);
      
      if (!isWorkingDay) {
        console.log(`❌ Cannot create appointment on ${validated.scheduled_date} - not a working day for clinic ${validated.clinic_id}`);
        return {
          success: false,
          data: null,
          error: `Cannot schedule appointment on ${validated.scheduled_date}. This day is not configured as a working day for the clinic.`,
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }
      
      console.log(`✅ Date ${validated.scheduled_date} is a working day, proceeding with appointment creation`);
      
      // ETAPA 3: Check if the scheduled time conflicts with lunch break
      const isLunchConflict = await this.isLunchTime(validated.scheduled_time, validated.scheduled_date, validated.clinic_id);
      
      if (isLunchConflict) {
        console.log(`❌ Cannot create appointment at ${validated.scheduled_time} on ${validated.scheduled_date} - conflicts with lunch break for clinic ${validated.clinic_id}`);
        return {
          success: false,
          data: null,
          error: `Cannot schedule appointment at ${validated.scheduled_time} on ${validated.scheduled_date}. This time conflicts with the clinic's lunch break.`,
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }
      
      console.log(`✅ Time ${validated.scheduled_time} does not conflict with lunch break, proceeding with appointment creation`);
      
      // Verify contact exists and belongs to clinic
      const contact = await db.select()
        .from(contacts)
        .where(and(
          eq(contacts.id, validated.contact_id),
          eq(contacts.clinic_id, validated.clinic_id)
        ))
        .limit(1);
        
      if (contact.length === 0) {
        return {
          success: false,
          data: null,
          error: 'Contact not found or does not belong to this clinic',
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }
      
      // Verify user exists
      const user = await db.select()
        .from(users)
        .where(and(
          eq(users.id, validated.user_id),
          eq(users.is_active, true)
        ))
        .limit(1);
        
      if (user.length === 0) {
        return {
          success: false,
          data: null,
          error: 'User not found or inactive',
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }
      
      // Verify tag exists if provided
      if (validated.tag_id) {
        const tag = await db.select()
          .from(appointment_tags)
          .where(and(
            eq(appointment_tags.id, validated.tag_id),
            eq(appointment_tags.clinic_id, validated.clinic_id)
          ))
          .limit(1);
          
        if (tag.length === 0) {
          return {
            success: false,
            data: null,
            error: 'Appointment tag not found',
            appointment_id: null,
            conflicts: null,
            next_available_slots: null
          };
        }
      }
      
      // Check for scheduling conflicts
      const conflicts = await this.checkConflicts(
        validated.clinic_id,
        validated.user_id,
        validated.scheduled_date,
        validated.scheduled_time,
        validated.duration_minutes
      );
      
      if (conflicts.length > 0) {
        const availableSlots = await this.getAvailableSlots({
          clinic_id: validated.clinic_id,
          user_id: validated.user_id,
          date: validated.scheduled_date,
          duration_minutes: validated.duration_minutes,
          working_hours_start: '08:00',
          working_hours_end: '18:00'
        });
        
        return {
          success: false,
          data: null,
          error: 'Time slot conflicts with existing appointment',
          appointment_id: null,
          conflicts: conflicts,
          next_available_slots: availableSlots.data
        };
      }
      
      // Create the appointment
      const scheduledDateTime = `${validated.scheduled_date} ${validated.scheduled_time}:00`;
      
      const [newAppointment] = await db.insert(appointments).values({
        contact_id: validated.contact_id,
        clinic_id: validated.clinic_id,
        user_id: validated.user_id,
        scheduled_date: new Date(scheduledDateTime),
        duration_minutes: validated.duration_minutes,
        status: validated.status,
        doctor_name: validated.doctor_name || null,
        specialty: validated.specialty || null,
        appointment_type: validated.appointment_type || null,
        session_notes: validated.session_notes || null,
        payment_status: validated.payment_status,
        payment_amount: validated.payment_amount || null,
        tag_id: validated.tag_id || null
      }).returning();
      
      return {
        success: true,
        data: newAppointment,
        error: null,
        appointment_id: newAppointment.id,
        conflicts: null,
        next_available_slots: null
      };
      
    } catch (error) {
      console.error('Error creating appointment:', error);
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
   * Update appointment status with validation
   */
  async updateStatus(params: z.infer<typeof UpdateStatusSchema>): Promise<MCPResponse> {
    try {
      const validated = UpdateStatusSchema.parse(params);
      
      // Verify appointment exists and belongs to clinic
      const existingAppointment = await db.select()
        .from(appointments)
        .where(and(
          eq(appointments.id, validated.appointment_id),
          eq(appointments.clinic_id, validated.clinic_id)
        ))
        .limit(1);
        
      if (existingAppointment.length === 0) {
        return {
          success: false,
          data: null,
          error: 'Appointment not found or does not belong to this clinic',
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }
      
      // Update the appointment
      const [updatedAppointment] = await db.update(appointments)
        .set({
          status: validated.status,
          session_notes: validated.session_notes || null
        })
        .where(and(
          eq(appointments.id, validated.appointment_id),
          eq(appointments.clinic_id, validated.clinic_id)
        ))
        .returning();
      
      return {
        success: true,
        data: updatedAppointment,
        error: null,
        appointment_id: updatedAppointment.id,
        conflicts: null,
        next_available_slots: null
      };
      
    } catch (error) {
      console.error('Error updating appointment status:', error);
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
   * Reschedule appointment with conflict validation
   */
  async rescheduleAppointment(params: z.infer<typeof RescheduleSchema>): Promise<MCPResponse> {
    try {
      const validated = RescheduleSchema.parse(params);
      
      console.log(`🔍 MCP Appointment Reschedule: ${validated.scheduled_date} for clinic ${validated.clinic_id}`);
      
      // ETAPA 2: Check if the new scheduled date is a working day
      const isWorkingDay = await this.isWorkingDay(validated.scheduled_date, validated.clinic_id);
      
      if (!isWorkingDay) {
        console.log(`❌ Cannot reschedule appointment to ${validated.scheduled_date} - not a working day for clinic ${validated.clinic_id}`);
        return {
          success: false,
          data: null,
          error: `Cannot reschedule appointment to ${validated.scheduled_date}. This day is not configured as a working day for the clinic.`,
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }
      
      console.log(`✅ Date ${validated.scheduled_date} is a working day, proceeding with reschedule`);
      
      // ETAPA 3: Check if the new scheduled time conflicts with lunch break
      const isLunchConflict = await this.isLunchTime(validated.scheduled_time, validated.scheduled_date, validated.clinic_id);
      
      if (isLunchConflict) {
        console.log(`❌ Cannot reschedule appointment to ${validated.scheduled_time} on ${validated.scheduled_date} - conflicts with lunch break for clinic ${validated.clinic_id}`);
        return {
          success: false,
          data: null,
          error: `Cannot reschedule appointment to ${validated.scheduled_time} on ${validated.scheduled_date}. This time conflicts with the clinic's lunch break.`,
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }
      
      console.log(`✅ Time ${validated.scheduled_time} does not conflict with lunch break, proceeding with reschedule`);
      
      // Get existing appointment
      const existingAppointment = await db.select()
        .from(appointments)
        .where(and(
          eq(appointments.id, validated.appointment_id),
          eq(appointments.clinic_id, validated.clinic_id)
        ))
        .limit(1);
        
      if (existingAppointment.length === 0) {
        return {
          success: false,
          data: null,
          error: 'Appointment not found',
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }
      
      const appointment = existingAppointment[0];
      const duration = validated.duration_minutes || appointment.duration_minutes || 60;
      
      // Check conflicts for new time slot (excluding current appointment)
      const conflicts = await this.checkConflicts(
        validated.clinic_id,
        appointment.user_id,
        validated.scheduled_date,
        validated.scheduled_time,
        duration,
        validated.appointment_id
      );
      
      if (conflicts.length > 0) {
        const availableSlots = await this.getAvailableSlots({
          clinic_id: validated.clinic_id,
          user_id: appointment.user_id,
          date: validated.scheduled_date,
          duration_minutes: duration,
          working_hours_start: '08:00',
          working_hours_end: '18:00'
        });
        
        return {
          success: false,
          data: null,
          error: 'New time slot conflicts with existing appointment',
          appointment_id: null,
          conflicts: conflicts,
          next_available_slots: availableSlots.data
        };
      }
      
      // Update appointment with new schedule
      const scheduledDateTime = `${validated.scheduled_date} ${validated.scheduled_time}:00`;
      
      const [updatedAppointment] = await db.update(appointments)
        .set({
          scheduled_date: new Date(scheduledDateTime),
          duration_minutes: duration
        })
        .where(and(
          eq(appointments.id, validated.appointment_id),
          eq(appointments.clinic_id, validated.clinic_id)
        ))
        .returning();
      
      return {
        success: true,
        data: updatedAppointment,
        error: null,
        appointment_id: updatedAppointment.id,
        conflicts: null,
        next_available_slots: null
      };
      
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
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
   * Cancel appointment with reason
   */
  async cancelAppointment(appointmentId: number, clinicId: number, cancelledBy: 'paciente' | 'dentista', reason?: string): Promise<MCPResponse> {
    try {
      const status = cancelledBy === 'paciente' ? 'cancelada_paciente' : 'cancelada_dentista';
      
      const [cancelledAppointment] = await db.update(appointments)
        .set({
          status: status,
          cancellation_reason: reason || null
        })
        .where(and(
          eq(appointments.id, appointmentId),
          eq(appointments.clinic_id, clinicId)
        ))
        .returning();
      
      if (!cancelledAppointment) {
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
        data: cancelledAppointment,
        error: null,
        appointment_id: cancelledAppointment.id,
        conflicts: null,
        next_available_slots: null
      };
      
    } catch (error) {
      console.error('Error cancelling appointment:', error);
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
   * Get available time slots for a specific date and user
   */
  async getAvailableSlots(params: z.infer<typeof AvailabilitySchema>): Promise<MCPResponse> {
    try {
      const validated = AvailabilitySchema.parse(params);
      
      console.log(`🔍 MCP Availability Check: ${validated.date} for clinic ${validated.clinic_id}`);
      
      // ETAPA 1: Check if the requested date is a working day
      const isWorkingDay = await this.isWorkingDay(validated.date, validated.clinic_id);
      
      if (!isWorkingDay) {
        console.log(`❌ Date ${validated.date} is not a working day for clinic ${validated.clinic_id}`);
        return {
          success: true,
          data: [], // Empty slots array for non-working days
          error: null,
          appointment_id: null,
          conflicts: null,
          next_available_slots: null
        };
      }
      
      console.log(`✅ Date ${validated.date} is a working day, generating time slots`);
      
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
        
        // ETAPA 2: Check if this slot conflicts with lunch break
        const isLunchConflict = await this.isLunchTime(timeString, validated.date, validated.clinic_id);
        
        if (!hasConflict && !isLunchConflict) {
          slots.push({
            time: timeString,
            duration_minutes: validated.duration_minutes,
            available: true
          });
        }
        
        // Move to next 15-minute interval
        currentTime = addMinutes(currentTime, 15);
      }
      
      return {
        success: true,
        data: slots,
        error: null,
        appointment_id: null,
        conflicts: null,
        next_available_slots: null
      };
      
    } catch (error) {
      console.error('Error getting available slots:', error);
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
      userId?: number;
      contactId?: number;
      status?: typeof VALID_APPOINTMENT_STATUSES[number];
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<MCPResponse> {
    try {
      let query = db.select()
        .from(appointments)
        .where(eq(appointments.clinic_id, clinicId));
      
      // Apply filters
      const conditions = [eq(appointments.clinic_id, clinicId)];
      
      if (filters.userId) {
        conditions.push(eq(appointments.user_id, filters.userId));
      }
      
      if (filters.contactId) {
        conditions.push(eq(appointments.contact_id, filters.contactId));
      }
      
      if (filters.status) {
        conditions.push(eq(appointments.status, filters.status));
      }
      
      if (filters.dateFrom) {
        conditions.push(gte(appointments.scheduled_date, new Date(`${filters.dateFrom}T00:00:00`)));
      }
      
      if (filters.dateTo) {
        conditions.push(lte(appointments.scheduled_date, new Date(`${filters.dateTo}T23:59:59`)));
      }
      
      const appointmentList = await db.select()
        .from(appointments)
        .where(and(...conditions))
        .limit(filters.limit || 50)
        .offset(filters.offset || 0)
        .orderBy(appointments.scheduled_date);
      
      // Transform the data to change "id" to "appointment_id"
      const transformedData = appointmentList.map((appointment) => {
        const { id, ...appointmentData } = appointment;
        return {
          ...appointmentData,
          appointment_id: id
        };
      });
      
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
  
  /**
   * Check for scheduling conflicts
   */
  private async checkConflicts(
    clinicId: number,
    userId: number,
    date: string,
    time: string,
    durationMinutes: number,
    excludeAppointmentId?: number
  ): Promise<any[]> {
    const slotStart = new Date(`${date}T${time}:00`);
    const slotEnd = addMinutes(slotStart, durationMinutes);
    
    const baseConditions = [
      eq(appointments.clinic_id, clinicId),
      eq(appointments.user_id, userId),
      gte(appointments.scheduled_date, startOfDay(slotStart)),
      lte(appointments.scheduled_date, endOfDay(slotStart)),
      // Only consider appointments that block time slots (not cancelled ones)
      sql`${appointments.status} NOT IN ('cancelada', 'cancelada_paciente', 'cancelada_dentista', 'faltou')`
    ];
    
    const existingAppointments = await db.select()
      .from(appointments)
      .where(and(...baseConditions));
    
    return existingAppointments.filter(apt => {
      if (!apt.scheduled_date) return false;
      if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
      
      const aptStart = new Date(apt.scheduled_date);
      const aptEnd = addMinutes(aptStart, apt.duration_minutes || 60);
      
      return (slotStart < aptEnd && slotEnd > aptStart);
    });
  }
}

// Export singleton instance
export const appointmentAgent = new AppointmentMCPAgent();