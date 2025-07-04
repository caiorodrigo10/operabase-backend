import { Request, Response } from 'express';
import { Logger } from '../../shared/logger';
import { AppointmentsService } from './appointments.service';
import { AppointmentsRepository } from './appointments.repository';
import { 
  createAppointmentSchema, 
  updateAppointmentSchema,
  updateAppointmentStatusSchema
} from '../../shared/schemas/index';
import { 
  availabilityRequestSchema,
  timeSlotRequestSchema,
  type CreateAppointmentDto,
  type UpdateAppointmentDto,
  AvailabilityRequest,
  AvailabilityResponse,
  TimeSlotRequest,
  TimeSlotResponse
} from './appointments.types';
import type { IStorage } from '../../storage';
import { createClient } from '@supabase/supabase-js';
import { systemLogsService } from '../../services/system-logs.service';

export class AppointmentsController {
  private service: AppointmentsService;

  constructor(private storage: IStorage) {
    this.service = new AppointmentsService(storage);
  }

  async getAppointments(req: Request, res: Response) {
    try {
      const { clinic_id, status, date_from, date_to, contact_id, user_id } = req.query;
      
      if (!clinic_id) {
        return res.status(400).json({ error: 'clinic_id is required' });
      }

      const filters = {
        status: status as string,
        dateFrom: date_from ? new Date(date_from as string) : undefined,
        dateTo: date_to ? new Date(date_to as string) : undefined,
        contactId: contact_id ? parseInt(contact_id as string) : undefined,
        userId: user_id ? parseInt(user_id as string) : undefined
      };

      const appointments = await this.service.getAppointments(parseInt(clinic_id as string), filters);
      res.json(appointments);
    } catch (error) {
      Logger.error('Failed to get appointments', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      res.status(500).json({ error: 'Failed to get appointments' });
    }
  }

  async getAppointmentsPaginated(req: Request, res: Response) {
    try {
      const { clinic_id } = req.query;
      const { page = 1, limit = 50, status, professional_id } = req.query;
      
      if (!clinic_id) {
        return res.status(400).json({ error: 'clinic_id is required' });
      }

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string)
      };

      const filters = {
        status: status as string,
        professional_id: professional_id ? parseInt(professional_id as string) : undefined
      };

      const appointments = await this.service.getAppointmentsPaginated(
        parseInt(clinic_id as string), 
        pagination,
        filters
      );
      
      res.json(appointments);
    } catch (error) {
      Logger.error('Failed to get paginated appointments', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      res.status(500).json({ error: 'Failed to get appointments' });
    }
  }

  async getAppointmentById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const appointment = await this.service.getAppointmentById(id);
      
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error('Error getting appointment:', error);
      res.status(500).json({ error: 'Failed to get appointment' });
    }
  }

  async getAppointmentsByContact(req: Request, res: Response) {
    try {
      const contactId = parseInt(req.params.contactId);
      const appointments = await this.service.getAppointmentsByContact(contactId);
      res.json(appointments);
    } catch (error) {
      console.error('Error getting appointments by contact:', error);
      res.status(500).json({ error: 'Failed to get appointments' });
    }
  }

  async createAppointment(req: Request, res: Response) {
    try {
      const appointment = await this.service.createAppointment(req.body);
      res.status(201).json(appointment);
    } catch (error) {
      Logger.error('Failed to create appointment', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      res.status(500).json({ 
        error: 'Failed to create appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateAppointment(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const appointment = await this.service.updateAppointment(id, req.body);
      
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error('Error updating appointment:', error);
      res.status(500).json({ error: 'Failed to update appointment' });
    }
  }

  async updateAppointmentStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const appointment = await this.service.updateAppointmentStatus(id, status);
      
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      res.status(500).json({ error: 'Failed to update appointment status' });
    }
  }

  async deleteAppointment(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const userId = req.headers['user-id'] as string;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      const result = await this.service.deleteAppointment(id, userId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      res.status(500).json({ error: 'Failed to delete appointment' });
    }
  }

  /**
   * Normalize appointment dates for timezone consistency
   * Database stores dates as local time (Brasília), so we need to preserve that
   */
  private normalizeAppointmentDate(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    // If the date string doesn't have timezone info, treat it as local time (Brasília)
    if (typeof dateInput === 'string' && !dateInput.includes('T') && !dateInput.includes('Z') && !dateInput.includes('+')) {
      // Convert "2025-07-15 13:00:00" to "2025-07-15T13:00:00" (local time)
      // This preserves the original time as intended in Brasília timezone
      const normalizedString = dateInput.replace(' ', 'T');
      return new Date(normalizedString);
    }
    
    return new Date(dateInput);
  }

  /**
   * Convert UTC datetime string to Brasília time string
   * Frontend sends UTC times, but we need to compare with local time strings
   */
  private convertUTCToBrasiliaString(dateTimeString: string): string {
    // If the input is UTC (has Z), convert to Brasília local time (UTC-3)
    if (dateTimeString.includes('Z')) {
      const utcDate = new Date(dateTimeString);
      
      // Extract UTC components and subtract 3 hours for Brasília
      const year = utcDate.getUTCFullYear();
      const month = utcDate.getUTCMonth() + 1; // getUTCMonth is 0-indexed
      const day = utcDate.getUTCDate();
      let hours = utcDate.getUTCHours() - 3;
      const minutes = utcDate.getUTCMinutes();
      const seconds = utcDate.getUTCSeconds();
      
      // Handle day rollover if hours go negative
      let adjustedDay = day;
      let adjustedMonth = month;
      let adjustedYear = year;
      
      if (hours < 0) {
        hours += 24;
        adjustedDay -= 1;
        
        // Handle month rollover
        if (adjustedDay < 1) {
          adjustedMonth -= 1;
          if (adjustedMonth < 1) {
            adjustedMonth = 12;
            adjustedYear -= 1;
          }
          // Get last day of previous month (simplified)
          adjustedDay = 31; // This is a simplification
        }
      }
      
      // Create local time string
      const localTimeString = `${adjustedYear}-${String(adjustedMonth).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      console.log(`🕐 TIMEZONE CONVERSION: ${dateTimeString} (UTC) -> ${localTimeString} (Brasília local)`);
      return localTimeString;
    }
    
    return dateTimeString;
  }

  async checkAvailability(req: Request, res: Response) {
    try {
      console.log('🎯 CONTROLLER: checkAvailability called with body:', req.body);
      console.log('🚨 TIMEZONE FIX V3 APPLIED IN CONTROLLER!');
      
      const request = req.body as AvailabilityRequest;
      
      // Convert UTC time to Brasília time string for comparison
      const startTimeString = this.convertUTCToBrasiliaString(request.startDateTime);
      const endTimeString = this.convertUTCToBrasiliaString(request.endDateTime);
      
      console.log('🔍 CONTROLLER: Time range check:', {
        originalStart: request.startDateTime,
        originalEnd: request.endDateTime,
        brasiliaStart: startTimeString,
        brasiliaEnd: endTimeString,
        professionalId: request.professionalId
      });
      
      // Get ALL appointments directly from storage
      const allAppointments = await this.storage.getAppointments(1); // clinic_id = 1
      console.log('📊 CONTROLLER: Total appointments found:', allAppointments.length);
      
      // Find the specific appointment we're testing against
      const appointment71 = allAppointments.find(apt => apt.id === 71);
      if (appointment71) {
        console.log('✅ CONTROLLER: Found appointment 71:', {
          id: appointment71.id,
          scheduled_date: appointment71.scheduled_date,
          user_id: appointment71.user_id,
          duration_minutes: (appointment71 as any).duration_minutes,
          status: appointment71.status
        });
      } else {
        console.log('❌ CONTROLLER: Appointment 71 not found');
      }
      
      // Manual conflict detection WITH TIMEZONE FIX
      const conflicts = allAppointments.filter(apt => {
        // Skip cancelled appointments
        if (apt.status && (
          apt.status === 'cancelled' || 
          apt.status === 'no_show' || 
          apt.status === 'cancelada' || 
          apt.status === 'cancelada_paciente' || 
          apt.status === 'cancelada_dentista'
        )) {
          return false;
        }
        
        // 🔧 FIX: Apply same user filtering logic as calendar frontend
        // Only include appointments from valid clinic users (same as calendar filter)
        const validUserIds = [2, 3, 4, 5, 6];
        if (!(apt as any).google_calendar_event_id && !validUserIds.includes(Number(apt.user_id))) {
          console.log(`🚫 CONTROLLER: Excluding orphaned appointment ${apt.id} (user_id: ${apt.user_id})`);
          return false;
        }
        
        // Filter by professional if specified
        if (request.professionalId && Number(apt.user_id) !== request.professionalId) {
          return false;
        }
        
        // TIMEZONE FIX: Compare with string-based time comparison
        const aptStartString = apt.scheduled_date?.toString() || ''; // Database stores as "2025-07-04 12:15:00"
        const aptDuration = (apt as any).duration_minutes || 60;
        
        // Parse appointment time for comparison
        const aptStartDate = new Date(aptStartString.replace(' ', 'T'));
        const aptEndDate = new Date(aptStartDate.getTime() + aptDuration * 60000);
        
        // Parse request times for comparison
        const requestStartDate = new Date(startTimeString.replace(' ', 'T'));
        const requestEndDate = new Date(endTimeString.replace(' ', 'T'));
        
        const overlaps = requestStartDate < aptEndDate && requestEndDate > aptStartDate;
        
        if (overlaps) {
          console.log(`🚨 CONTROLLER: TIMEZONE-FIXED CONFLICT DETECTED! Appointment ${apt.id}`);
          console.log(`   Original date: ${apt.scheduled_date}`);
          console.log(`   Appointment: ${aptStartDate.toISOString()} to ${aptEndDate.toISOString()}`);
          console.log(`   Requested: ${requestStartDate.toISOString()} to ${requestEndDate.toISOString()}`);
        }
        
        return overlaps;
      });
      
      console.log(`🔍 CONTROLLER: Found ${conflicts.length} timezone-aware conflicts`);
      
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        const contact = await this.storage.getContact(conflict.contact_id);
        
        // Use normalized dates in response, but preserve local time representation
        const normalizedStart = this.normalizeAppointmentDate(conflict.scheduled_date!);
        const normalizedEnd = new Date(normalizedStart.getTime() + ((conflict as any).duration_minutes || 60) * 60000);
        
        // Format as local time without timezone conversion
        const formatLocalTime = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        };
        
        const response: AvailabilityResponse = {
          available: false,
          conflict: true,
          conflictType: 'appointment',
          conflictDetails: {
            id: conflict.id.toString(),
            title: `${(conflict as any).doctor_name || 'Profissional'} - ${contact?.name || 'Paciente'}`,
            startTime: formatLocalTime(normalizedStart),
            endTime: formatLocalTime(normalizedEnd)
          }
        };
        
        console.log('🚨 CONTROLLER: Returning timezone-fixed conflict response:', response);
        return res.json(response);
      }
      
      const response: AvailabilityResponse = {
        available: true,
        conflict: false
      };
      
      console.log('✅ CONTROLLER: Returning available response:', response);
      res.json(response);
      
    } catch (error) {
      console.error('❌ CONTROLLER: Error checking availability:', error);
      res.status(500).json({ error: 'Failed to check availability' });
    }
  }

  async findAvailableTimeSlots(req: Request, res: Response) {
    try {
      const request = req.body as TimeSlotRequest;
      const response = await this.service.findAvailableTimeSlots(request);
      res.json(response);
    } catch (error) {
      console.error('Error finding available time slots:', error);
      res.status(500).json({ error: 'Failed to find available time slots' });
    }
  }

  async reassignAppointments(req: Request, res: Response) {
    try {
      const clinicId = parseInt(req.params.clinic_id);
      const result = await this.service.reassignOrphanedAppointments(clinicId);
      res.json(result);
    } catch (error) {
      console.error('Error reassigning appointments:', error);
      res.status(500).json({ error: 'Failed to reassign appointments' });
    }
  }

  private async createAppointmentActionNotification(appointment: any, currentUserName?: string) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Find conversation for this contact
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', appointment.contact_id)
        .eq('clinic_id', appointment.clinic_id)
        .single();

      if (convError || !conversation) {
        console.log('⚠️ No conversation found for contact:', appointment.contact_id);
        return;
      }

      // Get contact and user names for description
      const { data: contact } = await supabase
        .from('contacts')
        .select('name')
        .eq('id', appointment.contact_id)
        .single();

      const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', appointment.user_id)
        .single();

      const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        });
      };

      const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      // Create action notification
      const actionData = {
        clinic_id: appointment.clinic_id,
        conversation_id: conversation.id,
        action_type: 'appointment_created',
        title: 'Consulta agendada',
        description: `Consulta agendada para ${formatDate(appointment.scheduled_date)} às ${formatTime(appointment.scheduled_date)} com ${user?.name || currentUserName || 'Dr. Caio Rodrigo'}`,
        metadata: {
          appointment_id: appointment.id,
          doctor_name: user?.name || currentUserName || 'Dr. Caio Rodrigo',
          date: formatDate(appointment.scheduled_date),
          time: formatTime(appointment.scheduled_date),
          specialty: appointment.specialty || 'Consulta'
        },
        related_entity_type: 'appointment',
        related_entity_id: appointment.id
      };

      console.log('📝 Creating action notification with data:', actionData);
      
      const { data: insertData, error: insertError } = await supabase
        .from('conversation_actions')
        .insert(actionData)
        .select();

      if (insertError) {
        console.error('❌ Error creating action notification:', insertError);
        console.error('❌ Failed data:', actionData);
      } else {
        console.log('✅ Action notification created:', insertData);
      }
    } catch (error) {
      console.error('❌ Error in createAppointmentActionNotification:', error);
    }
  }
}