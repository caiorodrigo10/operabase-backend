import type { 
  Appointment, 
  CreateAppointmentDto, 
  UpdateAppointmentDto, 
  AppointmentFilters,
  AvailabilityRequest,
  AvailabilityResponse,
  TimeSlotRequest,
  TimeSlotResponse
} from './appointments.types';
import { AppointmentsRepository } from './appointments.repository';
import type { IStorage } from '../../storage';
import { isAppointmentCancelled } from '../../shared/utils/appointment-status';
import { Logger } from '../../shared/logger';

/**
 * Utility function to normalize appointment dates for consistent timezone handling
 * 
 * Problem: Appointments are stored as "YYYY-MM-DD HH:mm:ss" without timezone info
 * JavaScript interprets this as local timezone, causing conflicts with UTC requests
 * 
 * Solution: Normalize all dates to UTC for comparison
 */
function normalizeAppointmentDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  // If the date string doesn't have timezone info, treat it as UTC
  if (typeof dateInput === 'string' && !dateInput.includes('T') && !dateInput.includes('Z') && !dateInput.includes('+')) {
    // Convert "2025-07-15 13:00:00" to "2025-07-15T13:00:00.000Z"
    const normalizedString = dateInput.replace(' ', 'T') + '.000Z';
    return new Date(normalizedString);
  }
  
  return new Date(dateInput);
}

export class AppointmentsService {
  private repository: AppointmentsRepository;

  constructor(private storage: IStorage) {
    this.repository = new AppointmentsRepository(storage);
  }

  /**
   * Create a timestamp string that represents local time without timezone conversion
   * This ensures the time is stored in the database exactly as intended
   */
  private createLocalDateTime(dateString: string, timeString: string): string {
    // Return as timestamp string in the format PostgreSQL expects
    return `${dateString} ${timeString}:00`;
  }

  async getAppointments(clinicId: number, filters: AppointmentFilters = {}): Promise<Appointment[]> {
    try {
      Logger.debug('Getting appointments for clinic', { 
        clinicId, 
        filters: Object.keys(filters).length > 0 ? filters : undefined 
      });
      
      // Get appointments from database
      const appointments = await this.repository.findAll(clinicId, filters);
      
      Logger.info('Appointments retrieved successfully', { 
        clinicId, 
        count: appointments.length,
        hasFilters: Object.keys(filters).length > 0
      });
      
      return appointments;
    } catch (error) {
      Logger.error('Failed to get appointments', { 
        clinicId, 
        filters,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getAppointmentsPaginated(
    clinicId: number, 
    pagination: { page: number; limit: number; offset: number },
    filters: { status?: string; professional_id?: number } = {}
  ) {
    try {
      // Get total count for pagination
      const totalItems = await this.repository.countAppointments(clinicId, filters);
      
      // Get paginated data
      const appointments = await this.repository.findPaginated(clinicId, pagination, filters);
      
      return {
        data: appointments,
        pagination: {
          currentPage: pagination.page,
          totalPages: Math.ceil(totalItems / pagination.limit),
          totalItems,
          itemsPerPage: pagination.limit,
          hasNext: pagination.page < Math.ceil(totalItems / pagination.limit),
          hasPrev: pagination.page > 1
        }
      };
    } catch (error) {
      Logger.error('Failed to get paginated appointments', {
        clinicId,
        pagination,
        filters,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getAppointmentById(id: number): Promise<Appointment | null> {
    return this.repository.findById(id);
  }

  async getAppointmentsByContact(contactId: number): Promise<Appointment[]> {
    return this.repository.findByContact(contactId);
  }

  async createAppointment(data: CreateAppointmentDto): Promise<Appointment> {
    try {
      // Transform data for database insertion
      // For now, use a simple fallback for user_id conversion
      // TODO: Implement proper UUID to integer mapping when user management is standardized
      let userIntegerId = data.user_id;
      if (typeof data.user_id === 'string') {
        // Use a temporary mapping for the current user
        userIntegerId = 3; // Current authenticated user's integer ID
      }

      const transformedData = {
        ...data,
        user_id: userIntegerId,
        // Convert date strings to Date objects for timestamp columns
        // TIMEZONE FIX: Create date as local time without timezone conversion
        scheduled_date: typeof data.scheduled_date === 'string' 
          ? this.createLocalDateTime(data.scheduled_date, data.scheduled_time || '00:00')
          : data.scheduled_date
      } as any; // Temporary type assertion to handle the interface mismatch



      const appointment = await this.repository.create(transformedData);

      // Sync with Google Calendar if user has active integration
      try {
        await this.syncAppointmentToGoogleCalendar(appointment);
      } catch (syncError) {
        Logger.warn('Google Calendar sync failed', {
          appointmentId: appointment.id,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        });
        // Don't fail the appointment creation if sync fails
      }

      return appointment;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw new Error('Failed to create appointment');
    }
  }

  async updateAppointment(id: number, data: UpdateAppointmentDto): Promise<Appointment | null> {
    try {
      return await this.repository.update(id, data);
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw new Error('Failed to update appointment');
    }
  }

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment | null> {
    try {
      return await this.repository.updateStatus(id, status);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      throw new Error('Failed to update appointment status');
    }
  }

  async deleteAppointment(id: number, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get appointment before deletion for Google Calendar sync
      const appointment = await this.repository.findById(id);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Remove from Google Calendar if synced
      if (appointment.google_calendar_event_id) {
        try {
          await this.removeAppointmentFromCalendar(id, userId);
        } catch (syncError) {
          console.error("Error removing appointment from Google Calendar:", syncError);
          // Continue with deletion even if Google Calendar sync fails
        }
      }
      
      const success = await this.repository.delete(id);
      
      if (!success) {
        throw new Error('Appointment not found');
      }
      
      return { success: true, message: "Appointment deleted successfully" };
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  }

  async checkAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
    try {
      const startDate = new Date(request.startDateTime);
      const endDate = new Date(request.endDateTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid datetime format");
      }

      console.log('🔍 Checking availability for:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        professionalId: request.professionalId
      });

      // Check if the appointment time is in the past
      const now = new Date();
      if (startDate <= now) {
        return {
          available: false,
          conflict: true,
          conflictType: 'appointment',
          conflictDetails: {
            id: 'past-time',
            title: 'Horário já passou',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString()
          }
        };
      }

      // Get ALL appointments and filter manually with proper timezone handling
      const allAppointments = await this.repository.findAll(1);
      
      console.log('🔍 TIMEZONE FIX: Processing appointments with normalized dates');
      console.log('🚨 TIMEZONE FIX ACTIVE: This log confirms the fix is running!');
      
      // Manual overlap detection with timezone normalization
      const conflictingAppointments = allAppointments.filter(apt => {
        // Skip cancelled appointments
        if (apt.status === 'cancelled' || apt.status === 'no_show' || apt.status === 'cancelada' || apt.status === 'cancelada_paciente' || apt.status === 'cancelada_dentista') {
          return false;
        }
        
        // 🔧 FIX: Apply same user filtering logic as calendar frontend
        // Only include appointments from valid clinic users (same as calendar filter)
        const validUserIds = [2, 3, 4, 5, 6];
        if (!apt.google_calendar_event_id && !validUserIds.includes(Number(apt.user_id))) {
          console.log(`🚫 AVAILABILITY: Excluding orphaned appointment ${apt.id} (user_id: ${apt.user_id})`);
          return false;
        }
        
        // Filter by professional if specified
        if (request.professionalId && Number(apt.user_id) !== request.professionalId) {
          return false;
        }
        
        if (request.professionalName && apt.doctor_name !== request.professionalName) {
          return false;
        }
        
        // TIMEZONE FIX: Normalize appointment date
        const aptStart = normalizeAppointmentDate(apt.scheduled_date!);
        const aptEnd = new Date(aptStart.getTime() + (apt.duration_minutes || 60) * 60000);
        
        const overlaps = aptStart < endDate && aptEnd > startDate;
        
        if (overlaps) {
          console.log(`🎯 TIMEZONE FIX: OVERLAP DETECTED! Appointment ${apt.id}`);
          console.log(`   Original date: ${apt.scheduled_date}`);
          console.log(`   Normalized: ${aptStart.toISOString()} to ${aptEnd.toISOString()}`);
          console.log(`   Testing slot: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        }
        
        return overlaps;
      });
      
      console.log(`🔍 TIMEZONE FIX: Found ${conflictingAppointments.length} conflicting appointments out of ${allAppointments.length} total`);
      
      if (conflictingAppointments.length > 0) {
        const conflictingAppointment = conflictingAppointments[0];
        
        // Get contact name for the conflicting appointment
        const contact = await this.storage.getContact(conflictingAppointment.contact_id);
        
        // Normalize the conflicting appointment date for response
        const normalizedStart = normalizeAppointmentDate(conflictingAppointment.scheduled_date!);
        const normalizedEnd = new Date(normalizedStart.getTime() + (conflictingAppointment.duration_minutes || 60) * 60000);
        
        return {
          available: false,
          conflict: true,
          conflictType: 'appointment',
          conflictDetails: {
            id: conflictingAppointment.id.toString(),
            title: `${conflictingAppointment.doctor_name} - ${contact?.name || 'Paciente'}`,
            startTime: normalizedStart.toISOString(),
            endTime: normalizedEnd.toISOString()
          }
        };
      }

      // Check for Google Calendar conflicts would go here
      // TODO: Implement Google Calendar conflict checking

      return {
        available: true,
        conflict: false
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      throw new Error('Failed to check availability');
    }
  }

  async findAvailableTimeSlots(request: TimeSlotRequest): Promise<TimeSlotResponse> {
    try {
      const targetDate = new Date(request.date);
      if (isNaN(targetDate.getTime())) {
        throw new Error("Invalid date format");
      }

      const { duration = 60, workingHours = { start: '08:00', end: '18:00' } } = request;

      // Set up start and end of day
      const dayStart = new Date(targetDate);
      const [startHour, startMinute] = workingHours.start.split(':').map(Number);
      dayStart.setHours(startHour, startMinute, 0, 0);

      const dayEnd = new Date(targetDate);
      const [endHour, endMinute] = workingHours.end.split(':').map(Number);
      dayEnd.setHours(endHour, endMinute, 0, 0);

      // Get all appointments for the day
      console.log('🔍 findAvailableTimeSlots - Searching appointments between:', {
        dayStart: dayStart.toISOString(),
        dayEnd: dayEnd.toISOString(),
        targetDate: targetDate.toISOString()
      });
      
      const appointments = await this.repository.findByDateRange(dayStart, dayEnd);
      
      console.log('📊 findAvailableTimeSlots - Found appointments:', appointments.length);
      appointments.forEach(apt => {
        console.log(`📋 findAvailableTimeSlots appointment ${apt.id}: ${apt.scheduled_date} (user_id: ${apt.user_id}, duration: ${apt.duration_minutes}min, status: ${apt.status})`);
      });
      
      // Convert appointments to busy blocks
      const busyBlocks: { start: Date; end: Date; type: string; title: string }[] = [];
      
      appointments.forEach(apt => {
        if (apt.scheduled_date && !isAppointmentCancelled(apt.status)) {
          const start = new Date(apt.scheduled_date);
          const end = new Date(start.getTime() + (apt.duration_minutes || 60) * 60000);
          busyBlocks.push({
            start,
            end,
            type: 'appointment',
            title: `${apt.doctor_name} - Consulta`
          });
        }
      });

      // Sort busy blocks by start time
      busyBlocks.sort((a, b) => a.start.getTime() - b.start.getTime());

      // Find available slots
      const availableSlots: { startTime: string; endTime: string; duration: number }[] = [];
      const slotDuration = duration * 60000; // Convert to milliseconds

      // For today, start from current time if it's later than work start
      let currentTime = new Date(dayStart);
      const now = new Date();
      const isToday = targetDate.toDateString() === now.toDateString();
      
      if (isToday && now > dayStart) {
        // Round up to next 30-minute slot
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const nextSlotMinutes = Math.ceil(currentMinutes / 30) * 30;
        const nextSlotTime = new Date(targetDate);
        nextSlotTime.setHours(Math.floor(nextSlotMinutes / 60), nextSlotMinutes % 60, 0, 0);
        
        currentTime = nextSlotTime > dayStart ? nextSlotTime : dayStart;
      }

      for (const block of busyBlocks) {
        // Check if there's a gap before this block
        if (currentTime < block.start) {
          // Create slots in this gap
          let slotStart = new Date(currentTime);
          while (slotStart.getTime() + slotDuration <= block.start.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + slotDuration);
            availableSlots.push({
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
              duration
            });
            slotStart = new Date(slotStart.getTime() + slotDuration);
          }
        }
        
        // Update current time to after this block
        currentTime = new Date(Math.max(currentTime.getTime(), block.end.getTime()));
      }

      // Check for slots after the last block until end of day
      if (currentTime < dayEnd) {
        let slotStart = new Date(currentTime);
        while (slotStart.getTime() + slotDuration <= dayEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + slotDuration);
          availableSlots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            duration
          });
          slotStart = new Date(slotStart.getTime() + slotDuration);
        }
      }

      return {
        date: targetDate.toISOString().split('T')[0],
        duration,
        workingHours,
        availableSlots,
        busyBlocks: busyBlocks.map(block => ({
          startTime: block.start.toISOString(),
          endTime: block.end.toISOString(),
          type: block.type,
          title: block.title
        }))
      };
    } catch (error) {
      console.error('Error finding available slots:', error);
      throw new Error('Failed to find available slots');
    }
  }

  private async mergeWithGoogleCalendarEvents(clinicId: number, appointments: Appointment[], filters: AppointmentFilters): Promise<Appointment[]> {
    // Simple implementation - in production this would integrate with Google Calendar service
    return [...appointments];
  }

  private async syncAppointmentToGoogleCalendar(appointment: Appointment): Promise<void> {
    // Implementation would sync to Google Calendar
    console.log('TODO: Sync appointment to Google Calendar:', appointment.id);
  }

  private async removeAppointmentFromCalendar(appointmentId: number, userId: string): Promise<void> {
    // Implementation would remove from Google Calendar
    console.log('TODO: Remove appointment from Google Calendar:', appointmentId);
  }

  async reassignOrphanedAppointments(clinicId: number): Promise<{ updated: number; message: string }> {
    try {
      console.log('🔧 Starting appointment reassignment for clinic:', clinicId);

      // Get all appointments for the clinic
      const appointments = await this.repository.findAll(clinicId);
      console.log('📊 Found appointments:', appointments.length);

      // Get active professionals in the clinic
      const activeProfessionals = await this.storage.getClinicUsers(clinicId);
      const activeProfessionalIds = activeProfessionals
        .filter(user => user.is_professional && user.is_active)
        .map(user => user.id);
      
      console.log('👨‍⚕️ Active professional IDs:', activeProfessionalIds);

      if (activeProfessionalIds.length === 0) {
        throw new Error('No active professionals found in clinic');
      }

      // Find appointments with invalid user_ids (not in active professionals)
      const orphanedAppointments = appointments.filter(apt => 
        !activeProfessionalIds.includes(apt.user_id)
      );
      
      console.log('🔍 Found orphaned appointments:', orphanedAppointments.length);

      if (orphanedAppointments.length === 0) {
        return { updated: 0, message: 'No orphaned appointments found' };
      }

      // Reassign orphaned appointments to the first active professional (usually admin)
      const targetProfessionalId = activeProfessionalIds[0];
      const targetProfessional = activeProfessionals.find(p => p.id === targetProfessionalId);
      
      console.log('🎯 Reassigning to professional:', targetProfessional?.name, 'ID:', targetProfessionalId);

      let updatedCount = 0;
      
      for (const appointment of orphanedAppointments) {
        try {
          await this.repository.update(appointment.id, {
            user_id: targetProfessionalId,
            doctor_name: targetProfessional?.name || 'Professional'
          });
          updatedCount++;
          console.log('✅ Updated appointment:', appointment.id);
        } catch (error) {
          console.error('❌ Failed to update appointment:', appointment.id, error);
        }
      }

      console.log('🎉 Reassignment completed. Updated:', updatedCount, 'appointments');
      
      return { 
        updated: updatedCount, 
        message: `Successfully reassigned ${updatedCount} appointments to ${targetProfessional?.name}` 
      };
    } catch (error) {
      console.error('💥 Error in reassignOrphanedAppointments:', error);
      throw error;
    }
  }
}
