import { IStorage } from '../../storage-minimal.js';
import { AppointmentsRepository } from './appointments.repository.js';
import { 
  Appointment, 
  CreateAppointmentDto, 
  UpdateAppointmentDto, 
  AppointmentFilters,
  AvailabilityRequest, 
  AvailabilityResponse, 
  TimeSlotRequest, 
  TimeSlotResponse 
} from './appointments.types.js';
import { Logger } from '../../shared/logger.js';
import { LogCategory } from '../../shared/structured-logger.service.js';

// EXEMPLO DE MIGRAÇÃO - ANTES E DEPOIS
// Este arquivo mostra como migrar de console.log para structured logging

function normalizeAppointmentDate(dateInput: string | Date): Date {
  if (typeof dateInput === 'string') {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      Logger.error('Invalid date format provided', { dateInput });
      throw new Error(`Invalid date format: ${dateInput}`);
    }
    return date;
  }
  return dateInput;
}

export class AppointmentsService {
  private repository: AppointmentsRepository;

  constructor(private storage: IStorage) {
    this.repository = new AppointmentsRepository(storage);
    Logger.debug('AppointmentsService initialized', { storage: storage.constructor.name });
  }

  private createLocalDateTime(dateString: string, timeString: string): string {
    const dateObj = new Date(`${dateString}T${timeString}`);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:00`;
  }

  async getAppointments(clinicId: number, filters: AppointmentFilters = {}): Promise<Appointment[]> {
    try {
      // ANTES: console.log('🚀 AppointmentsService.getAppointments called for clinic:', clinicId);
      // DEPOIS: Structured logging com contexto
      Logger.debug('Getting appointments for clinic', { 
        clinicId, 
        filters: Object.keys(filters).length > 0 ? filters : undefined 
      });
      
      const appointments = await this.repository.findAll(clinicId, filters);
      
      // ANTES: console.log('📊 DB appointments found:', appointments.length);
      // DEPOIS: Log estruturado com métricas
      Logger.info('Appointments retrieved successfully', { 
        clinicId, 
        count: appointments.length,
        hasFilters: Object.keys(filters).length > 0
      });
      
      return appointments;
    } catch (error) {
      // ANTES: console.error('💥 Error in AppointmentsService.getAppointments:', error);
      // DEPOIS: Error logging com contexto completo
      Logger.error('Failed to get appointments', { 
        clinicId, 
        filters,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
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
      Logger.debug('Getting paginated appointments', { 
        clinicId, 
        pagination, 
        filters 
      });

      const totalItems = await this.repository.countAppointments(clinicId, filters);
      const appointments = await this.repository.findPaginated(clinicId, pagination, filters);
      
      const result = {
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

      Logger.info('Paginated appointments retrieved', {
        clinicId,
        totalItems,
        currentPage: pagination.page,
        itemsReturned: appointments.length
      });

      return result;
    } catch (error) {
      // ANTES: console.error('Error in getAppointmentsPaginated:', error);
      // DEPOIS: Structured error logging
      Logger.error('Failed to get paginated appointments', {
        clinicId,
        pagination,
        filters,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async createAppointment(data: CreateAppointmentDto): Promise<Appointment> {
    try {
      Logger.debug('Creating new appointment', { 
        clinicId: data.clinic_id,
        professionalId: data.user_id,
        scheduledDate: data.scheduled_date 
      });

      // Transform data for database insertion
      let userIntegerId = data.user_id;
      if (typeof data.user_id === 'string') {
        userIntegerId = 3; // Current authenticated user's integer ID
        Logger.debug('Converted string user_id to integer', { 
          originalUserId: data.user_id, 
          convertedUserId: userIntegerId 
        });
      }

      const transformedData = {
        ...data,
        user_id: userIntegerId,
        scheduled_date: typeof data.scheduled_date === 'string' 
          ? this.createLocalDateTime(data.scheduled_date, data.scheduled_time || '00:00')
          : data.scheduled_date
      } as any;

      const appointment = await this.repository.create(transformedData);

      Logger.info('Appointment created successfully', {
        appointmentId: appointment.id,
        clinicId: appointment.clinic_id,
        professionalId: appointment.user_id,
        scheduledDate: appointment.scheduled_date
      });

      // Sync with Google Calendar if user has active integration
      try {
        await this.syncAppointmentToGoogleCalendar(appointment);
        Logger.debug('Google Calendar sync completed', { appointmentId: appointment.id });
      } catch (syncError) {
        // ANTES: console.error("Error syncing appointment to Google Calendar:", syncError);
        // DEPOIS: Structured warning (não é erro crítico)
        Logger.warn('Google Calendar sync failed', {
          appointmentId: appointment.id,
          error: syncError instanceof Error ? syncError.message : syncError
        });
      }

      return appointment;
    } catch (error) {
      // ANTES: console.error('Error creating appointment:', error);
      // DEPOIS: Structured error with context
      Logger.error('Failed to create appointment', {
        appointmentData: data,
        error: error instanceof Error ? error.message : error
      });
      throw new Error('Failed to create appointment');
    }
  }

  async checkAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
    try {
      const startDate = new Date(request.startDateTime);
      const endDate = new Date(request.endDateTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        Logger.error('Invalid datetime format in availability check', {
          startDateTime: request.startDateTime,
          endDateTime: request.endDateTime
        });
        throw new Error("Invalid datetime format");
      }

      // ANTES: console.log('🔍 Checking availability for:', {...});
      // DEPOIS: Structured debug log
      Logger.debug('Checking appointment availability', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        professionalId: request.professionalId
      });

      // Check if the appointment time is in the past
      const now = new Date();
      if (startDate <= now) {
        Logger.warn('Availability check for past time', {
          requestedTime: startDate.toISOString(),
          currentTime: now.toISOString()
        });

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

      const allAppointments = await this.repository.findAll(1);
      
      // ANTES: console.log('🔍 TIMEZONE FIX: Processing appointments with normalized dates');
      // DEPOIS: Structured debug com contexto
      Logger.debug('Processing appointments for availability check', {
        totalAppointments: allAppointments.length,
        timezoneHandling: 'normalized'
      });

      // Manual overlap detection with timezone normalization
      const conflictingAppointments = allAppointments.filter(apt => {
        // Skip cancelled appointments
        if (apt.status === 'cancelled' || apt.status === 'no_show' || apt.status === 'cancelada' || apt.status === 'cancelada_paciente' || apt.status === 'cancelada_dentista') {
          return false;
        }
        
        // Apply same user filtering logic as calendar frontend
        const validUserIds = [2, 3, 4, 5, 6];
        if (!apt.google_calendar_event_id && !validUserIds.includes(Number(apt.user_id))) {
          Logger.debug('Excluding orphaned appointment from availability check', {
            appointmentId: apt.id,
            userId: apt.user_id,
            validUserIds
          });
          return false;
        }
        
        // Filter by professional if specified
        if (request.professionalId && Number(apt.user_id) !== request.professionalId) {
          return false;
        }

        // Check for time overlap
        const aptStart = new Date(apt.scheduled_date);
        const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000);
        
        return (startDate < aptEnd && endDate > aptStart);
      });

      const hasConflict = conflictingAppointments.length > 0;
      
      Logger.info('Availability check completed', {
        available: !hasConflict,
        conflictCount: conflictingAppointments.length,
        requestedTime: startDate.toISOString(),
        professionalId: request.professionalId
      });

      if (hasConflict) {
        const conflict = conflictingAppointments[0];
        return {
          available: false,
          conflict: true,
          conflictType: 'appointment',
          conflictDetails: {
            id: conflict.id.toString(),
            title: conflict.title || 'Consulta agendada',
            startTime: conflict.scheduled_date,
            endTime: new Date(new Date(conflict.scheduled_date).getTime() + (conflict.duration || 30) * 60000).toISOString()
          }
        };
      }

      return { available: true, conflict: false };
    } catch (error) {
      Logger.error('Availability check failed', {
        request,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // Placeholder methods - implement as needed
  async getAppointmentById(id: number): Promise<Appointment | null> {
    return this.repository.findById(id);
  }

  async getAppointmentsByContact(contactId: number): Promise<Appointment[]> {
    return this.repository.findByContact(contactId);
  }

  async updateAppointment(id: number, data: UpdateAppointmentDto): Promise<Appointment | null> {
    try {
      const result = await this.repository.update(id, data);
      Logger.info('Appointment updated', { appointmentId: id, updateData: data });
      return result;
    } catch (error) {
      Logger.error('Failed to update appointment', { appointmentId: id, error });
      throw new Error('Failed to update appointment');
    }
  }

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment | null> {
    try {
      const result = await this.repository.updateStatus(id, status);
      Logger.info('Appointment status updated', { appointmentId: id, newStatus: status });
      return result;
    } catch (error) {
      Logger.error('Failed to update appointment status', { appointmentId: id, status, error });
      throw new Error('Failed to update appointment status');
    }
  }

  async deleteAppointment(id: number, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const appointment = await this.repository.findById(id);
      if (!appointment) {
        Logger.warn('Attempted to delete non-existent appointment', { appointmentId: id, userId });
        throw new Error('Appointment not found');
      }

      // Remove from Google Calendar if synced
      if (appointment.google_calendar_event_id) {
        try {
          await this.removeAppointmentFromCalendar(id, userId);
          Logger.debug('Appointment removed from Google Calendar', { appointmentId: id });
        } catch (syncError) {
          Logger.warn('Failed to remove appointment from Google Calendar', {
            appointmentId: id,
            error: syncError instanceof Error ? syncError.message : syncError
          });
        }
      }
      
      const success = await this.repository.delete(id);
      
      if (!success) {
        Logger.error('Failed to delete appointment from database', { appointmentId: id });
        throw new Error('Appointment not found');
      }
      
      Logger.info('Appointment deleted successfully', { appointmentId: id, userId });
      return { success: true, message: "Appointment deleted successfully" };
    } catch (error) {
      Logger.error('Failed to delete appointment', { appointmentId: id, userId, error });
      throw error;
    }
  }

  // Placeholder methods - implement as needed
  async findAvailableTimeSlots(request: TimeSlotRequest): Promise<TimeSlotResponse> {
    throw new Error('Method not implemented');
  }

  private async syncAppointmentToGoogleCalendar(appointment: Appointment): Promise<void> {
    // Implementation here
  }

  private async removeAppointmentFromCalendar(appointmentId: number, userId: string): Promise<void> {
    // Implementation here
  }

  async reassignOrphanedAppointments(clinicId: number): Promise<{ updated: number; message: string }> {
    // Implementation here
    return { updated: 0, message: 'Not implemented' };
  }
} 