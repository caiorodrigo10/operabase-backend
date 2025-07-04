import { Request, Response } from 'express';
import { googleCalendarService } from './google-calendar-service';
import { storage } from './storage';
import { isAuthenticated } from './auth';
import { google } from 'googleapis';
import { supabaseAdmin } from './supabase-client';

// Google Calendar OAuth initialization
export async function initGoogleCalendarAuth(req: any, res: Response) {
  try {
    console.log('🔍 Iniciando autenticação Google Calendar...');
    
    // Store user ID in session for callback
    const userId = req.user?.id;
    console.log('👤 User ID:', userId);
    
    if (!userId) {
      console.error('❌ User ID não encontrado na requisição');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    req.session.oauthUserId = userId;
    console.log('💾 User ID armazenado na sessão:', req.session.oauthUserId);
    
    // Verificar variáveis de ambiente
    console.log('🔍 Verificando credenciais Google...');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('❌ Credenciais Google não configuradas');
      return res.status(500).json({ error: 'Google credentials not configured' });
    }
    
    const authUrl = googleCalendarService.generateAuthUrl();
    console.log('🔗 URL OAuth gerada com sucesso:', authUrl);
    console.log('✅ Respondendo com authUrl para usuário:', userId);
    
    res.json({ authUrl });
  } catch (error) {
    console.error('❌ Erro detalhado ao gerar URL de autenticação:', error);
    console.error('Stack trace:', (error as Error)?.stack);
    res.status(500).json({ 
      error: 'Failed to generate authorization URL', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Google Calendar OAuth callback
export async function handleGoogleCalendarCallback(req: any, res: Response) {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect('/configuracoes?calendar=error&reason=no_code');
    }

    // Get user from session (stored during OAuth initiation)
    const userId = req.session?.oauthUserId || req.session?.passport?.user?.id || req.user?.id;
    
    console.log('📥 OAuth callback received:', {
      code: code ? 'present' : 'missing',
      sessionUserId: req.session?.oauthUserId,
      passportUserId: req.session?.passport?.user?.id,
      requestUserId: req.user?.id
    });

    if (!userId) {
      console.error('❌ No user ID found in OAuth callback');
      return res.redirect('/configuracoes?calendar=error&reason=no_user');
    }

    // For Supabase UUID users, get user info from request context
    let userEmail: string;
    let clinicId = 1; // Default clinic
    
    if (typeof userId === 'string') {
      // This is a Supabase UUID - use hardcoded email for now since we know the user
      userEmail = 'cr@caiorodrigo.com.br';
      console.log('✅ Processing OAuth for Supabase user:', { userId, email: userEmail, clinicId });
    } else {
      // Legacy integer user ID
      const user = await storage.getUser(userId);
      if (!user) {
        console.error('❌ User not found:', userId);
        return res.redirect('/configuracoes?calendar=error&reason=user_not_found');
      }
      userEmail = user.email;
      clinicId = user.clinic_id || 1;
      console.log('✅ Processing OAuth for legacy user:', { userId, email: userEmail, clinicId });
    }

    // Exchange code for tokens
    const tokens = await googleCalendarService.getTokensFromCode(code as string);
    
    // Set credentials to get user info
    googleCalendarService.setCredentials(
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date
    );

    // Get calendar info
    const calendarInfo = await googleCalendarService.getUserCalendarInfo();
    
    // Get all calendars to find the primary one
    const userCalendars = await googleCalendarService.getUserCalendars();
    const primaryCalendar = userCalendars.find(cal => cal.primary) || userCalendars[0];

    // Desativar todas as integrações Google existentes do usuário
    const existingIntegrations = await storage.getCalendarIntegrationsByEmail(userEmail);
    const googleIntegrations = existingIntegrations.filter(integration => 
      integration.provider === 'google'
    );

    console.log(`🔄 Encontradas ${googleIntegrations.length} integrações Google existentes para ${userEmail}`);

    // Desativar todas as integrações existentes (permitir apenas 1 ativa)
    for (const integration of googleIntegrations) {
      await storage.updateCalendarIntegration(integration.id, {
        is_active: false,
        sync_enabled: false
      });
      console.log(`❌ Desativada integração ${integration.id}`);
    }

    // Criar nova integração ativa com calendário principal
    console.log(`✅ Criando nova integração ativa para ${userEmail}`);
    const newIntegration = await storage.createCalendarIntegration({
      user_id: userId,
      clinic_id: clinicId,
      provider: 'google',
      provider_user_id: calendarInfo.email,
      email: userEmail,
      calendar_id: primaryCalendar?.id || calendarInfo.calendarId,
      calendar_name: primaryCalendar?.summary || 'Calendário Principal',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(tokens.expiry_date),
      is_active: true,
      sync_enabled: true,
      last_sync_at: new Date(),
    });

    // Imediatamente sincronizar eventos do Google Calendar para o sistema
    console.log(`🔄 Iniciando sincronização de eventos para integração ${newIntegration.id}`);
    try {
      await syncCalendarEventsToSystem(parseInt(userId), newIntegration.id);
      console.log(`✅ Sincronização de eventos concluída para ${userEmail}`);
    } catch (syncError) {
      console.error('❌ Erro na sincronização inicial de eventos:', syncError);
    }

    // Redirect to settings page with success
    res.redirect('/configuracoes?calendar=connected');
  } catch (error) {
    console.error('Error handling calendar callback:', error);
    res.redirect('/configuracoes?calendar=error');
  }
}

// Get user's calendar integrations
// Function to sync calendar events to system (for bidirectional sync)
async function syncCalendarEventsToSystem(userId: number, integrationId: number) {
  try {
    const integration = await storage.getCalendarIntegration(integrationId);
    if (!integration || !integration.calendar_id) return;

    // Set up Google Calendar service with integration tokens
    googleCalendarService.setCredentials(
      integration.access_token,
      integration.refresh_token,
      integration.token_expires_at?.getTime()
    );

    // Get events from the next 30 days
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const events = await googleCalendarService.listEvents(
      integration.calendar_id,
      timeMin,
      timeMax
    );

    // Get user's clinics to determine where to create contacts/appointments
    const userClinics = await storage.getUserClinics(userId);
    const primaryClinic = userClinics[0]?.clinic;
    
    if (!primaryClinic) return;

    for (const event of events) {
      if (!event.start?.dateTime || !event.summary) continue;

      const startDate = new Date(event.start.dateTime);
      const endDate = new Date(event.end?.dateTime || event.start.dateTime);
      const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

      // Check if this event already exists as an appointment
      const existingAppointments = await storage.getAppointments(primaryClinic.id, {
        date: startDate
      });
      
      const eventExists = existingAppointments.some(apt => 
        apt.google_calendar_event_id === event.id
      );

      if (!eventExists) {
        // Extract contact information from event
        let contactName = event.summary;
        let contactEmail = '';
        let contactPhone = '';

        // Try to extract contact info from attendees
        if (event.attendees && event.attendees.length > 0) {
          const attendee = event.attendees.find((att: any) => att.email !== integration.email);
          if (attendee) {
            contactEmail = attendee.email;
            contactName = attendee.displayName || contactName;
          }
        }

        // Extract phone from description if available
        const phoneMatch = event.description?.match(/(?:tel|phone|telefone):\s*([+\d\s()-]+)/i);
        if (phoneMatch) {
          contactPhone = phoneMatch[1].replace(/\D/g, '');
        }

        // Create or find contact
        let contact;
        if (contactEmail) {
          const contacts = await storage.getContacts(primaryClinic.id, { search: contactEmail });
          contact = contacts.find(c => c.email === contactEmail);
        }

        if (!contact) {
          contact = await storage.createContact({
            clinic_id: primaryClinic.id,
            name: contactName,
            email: contactEmail || undefined,
            phone: contactPhone || undefined,
            status: 'lead',
            source: 'google-calendar',
          });
        }

        // Get user info for doctor name
        const user = await storage.getUser(userId);
        
        // Create appointment
        await storage.createAppointment({
          clinic_id: primaryClinic.id,
          user_id: userId,
          contact_id: contact.id,
          doctor_name: user?.name || integration.calendar_name || 'Sistema',
          specialty: 'consulta',
          appointment_type: 'consulta',
          scheduled_date: startDate,
          duration_minutes: durationMinutes || 60,
          status: startDate > new Date() ? 'agendada' : 'realizada',
          payment_status: 'pendente',
          payment_amount: 0,
          session_notes: event.description || null,
          google_calendar_event_id: event.id,
        });
        
        console.log(`✅ Agendamento criado do Google Calendar: ${event.summary} - ${startDate.toLocaleString('pt-BR')}`);
      }
    }
  } catch (error) {
    console.error('Error syncing calendar events to system:', error);
  }
}

export async function syncAppointmentToGoogleCalendar(appointment: any) {
  try {
    console.log('🔄 Iniciando sincronização com Google Calendar para appointment:', appointment.id);
    console.log('📋 Dados do appointment:', JSON.stringify(appointment, null, 2));
    
    // Get the user's Google Calendar integration
    const integrations = await storage.getCalendarIntegrations(appointment.user_id);
    console.log('🔗 Integrações encontradas para usuário', appointment.user_id, ':', integrations.length);
    
    const googleIntegration = integrations.find(i => i.provider === 'google' && i.is_active);
    
    if (!googleIntegration) {
      console.log('❌ Nenhuma integração ativa do Google Calendar encontrada para usuário', appointment.user_id);
      console.log('📝 Integrações disponíveis:', integrations.map(i => ({
        id: i.id,
        provider: i.provider,
        is_active: i.is_active,
        sync_preference: i.sync_preference
      })));
      return;
    }

    console.log('✅ Integração do Google Calendar encontrada:', {
      id: googleIntegration.id,
      email: googleIntegration.email,
      sync_preference: googleIntegration.sync_preference,
      is_active: googleIntegration.is_active
    });

    // Check if the integration allows two-way sync or only one-way from Google to system
    if (googleIntegration.sync_preference === 'one-way') {
      console.log('⚠️ Integração configurada para sincronização unidirecional (Google → Sistema), pulando sincronização para o Google');
      return;
    }

    // Get contact information
    const contact = await storage.getContact(appointment.contact_id);
    if (!contact) {
      console.error('❌ Contato não encontrado para appointment', appointment.id);
      return;
    }
    
    console.log('👤 Contato encontrado:', {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone
    });

    // Use the imported Google Calendar service
    
    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: googleIntegration.access_token,
      refresh_token: googleIntegration.refresh_token,
      expiry_date: new Date(googleIntegration.token_expires_at || Date.now()).getTime()
    });

    // Refresh token if needed
    const now = new Date();
    const expiryDate = new Date(googleIntegration.token_expires_at || Date.now());
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiryDate <= fiveMinutesFromNow) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await storage.updateCalendarIntegration(googleIntegration.id, {
          access_token: credentials.access_token!,
          refresh_token: credentials.refresh_token || googleIntegration.refresh_token,
          token_expires_at: new Date(credentials.expiry_date!)
        });
        console.log('Token refreshed successfully');
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        return;
      }
    }

    console.log('🗓️ Criando serviço do Google Calendar...');
    
    // Create calendar service
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Calculate end time
    const startDate = new Date(appointment.scheduled_date);
    const endDate = new Date(startDate.getTime() + (appointment.duration_minutes || 60) * 60000);

    console.log('📅 Calculando horários do evento:', {
      scheduled_date: appointment.scheduled_date,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      duration_minutes: appointment.duration_minutes
    });

    // Create Google Calendar event
    const event = {
      summary: `${appointment.appointment_type || 'Consulta'} - ${contact.name}`,
      description: `Paciente: ${contact.name}\nTelefone: ${contact.phone || 'Não informado'}\nEmail: ${contact.email || 'Não informado'}\nObservações: ${appointment.session_notes || ''}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      attendees: contact.email ? [{ email: contact.email }] : [],
    };

    console.log('📝 Dados do evento para Google Calendar:', JSON.stringify(event, null, 2));
    console.log('📍 Calendário de destino:', googleIntegration.calendar_id || 'primary');

    const response = await calendar.events.insert({
      calendarId: googleIntegration.calendar_id || 'primary',
      requestBody: event
    });
    
    console.log('✅ Resposta da API do Google Calendar:', {
      status: response.status,
      statusText: response.statusText,
      eventId: response.data?.id,
      eventLink: response.data?.htmlLink
    });
    
    // Update appointment with Google Calendar event ID
    if (response.data?.id) {
      await storage.updateAppointment(appointment.id, {
        google_calendar_event_id: response.data.id
      });
      console.log('🔗 Appointment atualizado com Google Calendar event ID:', response.data.id);
    }

  } catch (error) {
    console.error('Error syncing appointment to Google Calendar:', error);
  }
}

export async function getUserCalendarIntegrations(req: any, res: Response) {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    console.log('🔍 Getting calendar integrations for user:', { userId, userEmail });
    
    // Import storage directly from storage factory
    const { createStorage } = await import('./storage-factory');
    const storage = await createStorage();
    
    // For Supabase users, filter by email since we don't have user_id in calendar_integrations
    const integrations = await storage.getCalendarIntegrationsByEmail(userEmail);
    
    console.log('📊 Integrations retrieved:', integrations.length);
    console.log('📋 Raw integrations:', integrations);
    
    // Remove sensitive token data from response
    const sanitizedIntegrations = integrations.map(integration => ({
      id: integration.id,
      provider: integration.provider,
      email: integration.email,
      calendar_id: integration.calendar_id,
      sync_preference: integration.sync_preference,
      is_active: integration.is_active,
      last_sync: integration.last_sync,
      sync_errors: integration.sync_errors,
      created_at: integration.created_at,
    }));

    res.json(sanitizedIntegrations);
  } catch (error) {
    console.error('Error fetching calendar integrations:', error);
    res.status(500).json({ error: 'Failed to fetch calendar integrations' });
  }
}

// Update calendar integration sync preferences
export async function updateCalendarSyncPreferences(req: any, res: Response) {
  try {
    const { integrationId } = req.params;
    const { sync_preference } = req.body;
    const userId = req.user.id;

    // Verify the integration belongs to the user
    const integration = await storage.getCalendarIntegration(parseInt(integrationId));
    if (!integration || integration.user_id !== userId) {
      return res.status(404).json({ error: 'Calendar integration not found' });
    }

    const updated = await storage.updateCalendarIntegration(integration.id, {
      sync_preference,
    });

    // If switching to bidirectional, sync existing calendar events
    if (sync_preference === 'bidirectional') {
      await syncCalendarEventsToSystem(userId, integration.id);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating sync preferences:', error);
    res.status(500).json({ error: 'Failed to update sync preferences' });
  }
}

// Delete calendar integration
export async function deleteCalendarIntegration(req: any, res: Response) {
  try {
    const { integrationId } = req.params;
    const userId = req.user.id;

    // Verify the integration belongs to the user
    const integration = await storage.getCalendarIntegration(parseInt(integrationId));
    if (!integration || integration.user_id !== userId) {
      return res.status(404).json({ error: 'Calendar integration not found' });
    }

    console.log('🗑️ Deleting calendar integration and associated events:', {
      integrationId: integration.id,
      userId: integration.user_id,
      email: integration.email,
      calendarId: integration.calendar_id
    });

    // First, delete all Google Calendar events associated with this integration
    const deletedEventsCount = await storage.deleteGoogleCalendarEvents(integration.user_id, integration.calendar_id);
    console.log(`🗑️ Deleted ${deletedEventsCount} Google Calendar events`);

    // Then delete the integration itself
    const deleted = await storage.deleteCalendarIntegration(integration.id);
    
    if (deleted) {
      console.log('✅ Calendar integration deleted successfully');
      res.json({ 
        success: true, 
        deletedEventsCount,
        message: `Integration deleted and ${deletedEventsCount} synchronized events removed`
      });
    } else {
      res.status(500).json({ error: 'Failed to delete integration' });
    }
  } catch (error) {
    console.error('Error deleting calendar integration:', error);
    res.status(500).json({ error: 'Failed to delete calendar integration' });
  }
}

// Sync appointment to Google Calendar
export async function syncAppointmentToCalendar(appointmentId: number, userId: number) {
  try {
    // Get user's active Google Calendar integration
    const integrations = await storage.getCalendarIntegrations(userId);
    const googleIntegration = integrations.find(
      integration => integration.provider === 'google' && integration.is_active
    );

    if (!googleIntegration) {
      console.log('No active Google Calendar integration found for user:', userId);
      return null;
    }

    // Get appointment details
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      console.error('Appointment not found:', appointmentId);
      return null;
    }

    // Get contact details
    const contact = await storage.getContact(appointment.contact_id);
    if (!contact) {
      console.error('Contact not found:', appointment.contact_id);
      return null;
    }

    // Set up Google Calendar service with user's tokens
    googleCalendarService.setCredentials(
      googleIntegration.access_token!,
      googleIntegration.refresh_token!,
      new Date(googleIntegration.token_expires_at!).getTime()
    );

    // Check if event already exists
    if (appointment.google_calendar_event_id) {
      // Update existing event
      const updatedEvent = await googleCalendarService.updateEvent(
        googleIntegration.calendar_id!,
        appointment.google_calendar_event_id,
        {
          summary: `Consulta: ${contact.name}`,
          description: `Consulta ${appointment.appointment_type || 'médica'} com ${contact.name}\n\nEspecialidade: ${appointment.specialty || 'Não especificada'}\nTelefone: ${contact.phone}\nEmail: ${contact.email || 'Não informado'}`,
          startDateTime: appointment.scheduled_date!.toISOString(),
          endDateTime: new Date(
            appointment.scheduled_date!.getTime() + (appointment.duration_minutes || 60) * 60000
          ).toISOString(),
          attendeeEmails: contact.email ? [contact.email] : undefined,
        }
      );
      return updatedEvent.id;
    } else {
      // Create new event
      const newEvent = await googleCalendarService.createEvent(
        googleIntegration.calendar_id!,
        {
          summary: `Consulta: ${contact.name}`,
          description: `Consulta ${appointment.appointment_type || 'médica'} com ${contact.name}\n\nEspecialidade: ${appointment.specialty || 'Não especificada'}\nTelefone: ${contact.phone}\nEmail: ${contact.email || 'Não informado'}`,
          startDateTime: appointment.scheduled_date!.toISOString(),
          endDateTime: new Date(
            appointment.scheduled_date!.getTime() + (appointment.duration_minutes || 60) * 60000
          ).toISOString(),
          attendeeEmails: contact.email ? [contact.email] : undefined,
        }
      );

      // Update appointment with Google Calendar event ID
      await storage.updateAppointment(appointmentId, {
        google_calendar_event_id: newEvent.id,
      });

      return newEvent.id;
    }
  } catch (error) {
    console.error('Error syncing appointment to calendar:', error);
    
    // If token expired, try to refresh
    if (error.message.includes('invalid_grant') || error.message.includes('401')) {
      try {
        const integrations = await storage.getCalendarIntegrations(userId);
        const googleIntegration = integrations.find(
          integration => integration.provider === 'google' && integration.is_active
        );

        if (googleIntegration?.refresh_token) {
          const refreshedTokens = await googleCalendarService.refreshAccessToken();
          
          await storage.updateCalendarIntegration(googleIntegration.id, {
            access_token: refreshedTokens.access_token,
            token_expires_at: new Date(refreshedTokens.expiry_date),
            sync_errors: null,
          });

          // Retry sync with new token
          return await syncAppointmentToCalendar(appointmentId, userId);
        }
      } catch (refreshError) {
        console.error('Error refreshing calendar token:', refreshError);
        
        // Mark integration as having errors
        const integrations = await storage.getCalendarIntegrations(userId);
        const googleIntegration = integrations.find(
          integration => integration.provider === 'google' && integration.is_active
        );
        
        if (googleIntegration) {
          await storage.updateCalendarIntegration(googleIntegration.id, {
            sync_errors: 'Token refresh failed. Please reconnect your calendar.',
          });
        }
      }
    }
    
    return null;
  }
}

// Remove appointment from Google Calendar
export async function removeAppointmentFromCalendar(appointmentId: number, userId: number) {
  try {
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment || !appointment.google_calendar_event_id) {
      return true; // Nothing to remove
    }

    const integrations = await storage.getCalendarIntegrations(userId);
    const googleIntegration = integrations.find(
      integration => integration.provider === 'google' && integration.is_active
    );

    if (!googleIntegration) {
      return true; // No integration, nothing to remove
    }

    googleCalendarService.setCredentials(
      googleIntegration.access_token!,
      googleIntegration.refresh_token!,
      new Date(googleIntegration.token_expires_at!).getTime()
    );

    await googleCalendarService.deleteEvent(
      googleIntegration.calendar_id!,
      appointment.google_calendar_event_id
    );

    // Clear the calendar event ID from appointment
    await storage.updateAppointment(appointmentId, {
      google_calendar_event_id: null,
    });

    return true;
  } catch (error) {
    console.error('Error removing appointment from calendar:', error);
    return false;
  }
}

export async function getUserCalendars(req: any, res: Response) {
  try {
    const integrationId = parseInt(req.params.integrationId);
    if (isNaN(integrationId)) {
      return res.status(400).json({ error: "Invalid integration ID" });
    }

    const integration = await storage.getCalendarIntegration(integrationId);
    if (!integration || integration.user_id !== req.user.id) {
      return res.status(404).json({ error: "Integration not found" });
    }

    if (!integration.is_active) {
      return res.status(400).json({ error: "Integration is not active" });
    }

    // Check if tokens are valid
    if (!integration.access_token) {
      return res.status(400).json({ error: "No valid access token found" });
    }

    // Set credentials for Google Calendar service
    googleCalendarService.setCredentials(
      integration.access_token,
      integration.refresh_token || undefined,
      integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : undefined
    );

    try {
      const calendars = await googleCalendarService.getUserCalendars();
      
      // Format calendars for frontend
      const formattedCalendars = calendars.map((cal: any) => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary || false,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        selected: cal.selected || false
      }));

      res.json(formattedCalendars);
    } catch (calendarError: any) {
      console.error("Error fetching calendars from Google:", calendarError);
      
      // If token expired, try to refresh
      if (calendarError.message && (calendarError.message.includes('invalid_grant') || calendarError.message.includes('401'))) {
        if (integration.refresh_token) {
          try {
            const refreshedTokens = await googleCalendarService.refreshAccessToken();
            
            // Update integration with new tokens
            await storage.updateCalendarIntegration(integration.id, {
              access_token: refreshedTokens.access_token,
              token_expires_at: new Date(refreshedTokens.expiry_date),
              sync_errors: null,
            });

            // Retry with new token
            googleCalendarService.setCredentials(
              refreshedTokens.access_token,
              integration.refresh_token,
              refreshedTokens.expiry_date
            );

            const calendars = await googleCalendarService.getUserCalendars();
            const formattedCalendars = calendars.map((cal: any) => ({
              id: cal.id,
              summary: cal.summary,
              description: cal.description,
              primary: cal.primary || false,
              accessRole: cal.accessRole,
              backgroundColor: cal.backgroundColor,
              foregroundColor: cal.foregroundColor,
              selected: cal.selected || false
            }));

            return res.json(formattedCalendars);
          } catch (refreshError) {
            console.error("Error refreshing token:", refreshError);
            return res.status(401).json({ error: "Token expired and refresh failed. Please reconnect your calendar." });
          }
        } else {
          return res.status(401).json({ error: "Token expired and no refresh token available. Please reconnect your calendar." });
        }
      } else {
        return res.status(500).json({ error: "Failed to fetch calendars from Google Calendar" });
      }
    }
  } catch (error) {
    console.error("Error getting user calendars:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateLinkedCalendarSettings(req: any, res: Response) {
  try {
    const integrationId = parseInt(req.params.integrationId);
    const { linkedCalendarId, addEventsToCalendar } = req.body;

    console.log('🔄 Atualizando configurações do calendário vinculado:', {
      integrationId,
      linkedCalendarId,
      addEventsToCalendar,
      body: req.body,
      method: req.method,
      url: req.url
    });

    if (isNaN(integrationId)) {
      return res.status(400).json({ error: "Invalid integration ID" });
    }

    const integration = await storage.getCalendarIntegration(integrationId);
    if (!integration || integration.user_id !== req.user.id) {
      return res.status(404).json({ error: "Integration not found" });
    }

    // Validate the calendar ID by checking if it exists in the user's available calendars
    if (linkedCalendarId) {
      try {
        // Set credentials to validate calendar access
        googleCalendarService.setCredentials(
          integration.access_token!,
          integration.refresh_token || undefined,
          integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : undefined
        );

        // Get user's calendars to validate the selected calendar ID
        const availableCalendars = await googleCalendarService.getUserCalendars();
        const selectedCalendar = availableCalendars.find((cal: any) => cal.id === linkedCalendarId);

        if (!selectedCalendar) {
          console.log('❌ Calendário selecionado não encontrado na lista de calendários disponíveis');
          return res.status(400).json({ 
            error: "Selected calendar not found in available calendars",
            availableCalendars: availableCalendars.map((cal: any) => ({
              id: cal.id,
              summary: cal.summary
            }))
          });
        }

        console.log('✅ Calendário validado:', {
          id: selectedCalendar.id,
          summary: selectedCalendar.summary,
          primary: selectedCalendar.primary
        });

      } catch (validationError) {
        console.error('❌ Erro ao validar calendário:', validationError);
        // Continue with the update even if validation fails (might be a temporary issue)
      }
    }

    // Update the integration with linked calendar settings
    const updateData = {
      calendar_id: linkedCalendarId || null,
      sync_preference: addEventsToCalendar ? 'bidirectional' : 'none',
      updated_at: new Date()
    };

    console.log('💾 Atualizando integração com dados:', updateData);

    await storage.updateCalendarIntegration(integrationId, updateData);

    // Get detailed calendar information for Supabase sync
    let calendarDetails = null;
    let calendarName = null;
    let iCalUID = null;

    if (linkedCalendarId) {
      try {
        // Get user's calendars to find the selected one
        const availableCalendars = await googleCalendarService.getUserCalendars();
        const selectedCalendar = availableCalendars.find((cal: any) => cal.id === linkedCalendarId);
        
        if (selectedCalendar) {
          calendarDetails = selectedCalendar;
          calendarName = selectedCalendar.summary || selectedCalendar.name || 'Calendário Personalizado';
          
          // Generate iCalUID for the calendar integration
          // Format: calendar-integration-{integrationId}-{calendarId}@system.local
          iCalUID = `calendar-integration-${integrationId}-${linkedCalendarId.replace(/[^a-zA-Z0-9]/g, '-')}@system.local`;
          
          console.log('📅 Detalhes do calendário selecionado:', {
            id: selectedCalendar.id,
            summary: selectedCalendar.summary,
            name: calendarName,
            iCalUID: iCalUID,
            primary: selectedCalendar.primary,
            accessRole: selectedCalendar.accessRole
          });
        }
      } catch (detailsError) {
        console.error('❌ Erro ao obter detalhes do calendário:', detailsError);
      }
    }

    // Update in Supabase with complete calendar information
    try {
      const supabaseUpdateData = {
        calendar_id: linkedCalendarId || null,
        calendar_name: calendarName || null,
        sync_preference: addEventsToCalendar ? 'bidirectional' : 'none',
        ical_uid: iCalUID || null,
        updated_at: new Date().toISOString()
      };

      console.log('📤 Enviando para Supabase:', supabaseUpdateData);

      const { error: supabaseError } = await supabaseAdmin
        .from('calendar_integrations')
        .update(supabaseUpdateData)
        .eq('id', integrationId);

      if (supabaseError) {
        console.error('⚠️ Erro ao atualizar no Supabase:', supabaseError);
      } else {
        console.log('✅ Sincronizado com Supabase com sucesso:', {
          calendar_id: linkedCalendarId,
          calendar_name: calendarName,
          ical_uid: iCalUID,
          sync_preference: addEventsToCalendar ? 'bidirectional' : 'none'
        });
      }
    } catch (supabaseUpdateError) {
      console.error('⚠️ Erro na atualização do Supabase:', supabaseUpdateError);
    }

    const updatedIntegration = await storage.getCalendarIntegration(integrationId);
    
    console.log('✅ Configuração atualizada com sucesso:', {
      calendar_id: updatedIntegration?.calendar_id,
      sync_preference: updatedIntegration?.sync_preference
    });

    res.json(updatedIntegration);
  } catch (error) {
    console.error("Error updating linked calendar settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}