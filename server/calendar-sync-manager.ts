import { IStorage } from './storage';
import { googleCalendarService } from './google-calendar-service';

interface SyncLock {
  userId: string;
  timestamp: number;
  trigger: string;
}

export class CalendarSyncManager {
  private storage: IStorage;
  private syncLocks: Map<string, SyncLock> = new Map();
  private readonly SYNC_DEBOUNCE_TIME = 60 * 1000; // 60 seconds
  private readonly WEBHOOK_RENEWAL_BUFFER = 24 * 60 * 60 * 1000; // 24 hours before expiry

  constructor(storage: IStorage) {
    this.storage = storage;
    
    // Auto-renew webhooks every hour
    setInterval(() => {
      this.renewExpiringWebhooks();
    }, 60 * 60 * 1000);
  }

  async triggerSync(userId: string, trigger: string, forceSync: boolean = false): Promise<boolean> {
    const lockKey = `sync_${userId}`;
    const now = Date.now();
    
    // Check debounce
    if (!forceSync) {
      const existingLock = this.syncLocks.get(lockKey);
      if (existingLock && (now - existingLock.timestamp) < this.SYNC_DEBOUNCE_TIME) {
        console.log(`⏳ Sync debounced for user ${userId}, last sync: ${existingLock.trigger} ${Math.round((now - existingLock.timestamp) / 1000)}s ago`);
        return false;
      }
    }

    // Set lock
    this.syncLocks.set(lockKey, { userId, timestamp: now, trigger });

    try {
      console.log(`🔄 Starting automatic sync for user ${userId}, trigger: ${trigger}`);
      
      // Get active integrations
      const integrations = await this.storage.getCalendarIntegrations(userId);
      const activeIntegrations = integrations.filter(i => i.provider === 'google' && i.is_active && i.sync_enabled);

      if (activeIntegrations.length === 0) {
        console.log(`ℹ️ No active Google Calendar integrations for user ${userId}`);
        return false;
      }

      let syncCount = 0;
      for (const integration of activeIntegrations) {
        if (await this.syncIntegration(integration, trigger)) {
          syncCount++;
        }
      }

      console.log(`✅ Completed automatic sync for user ${userId}: ${syncCount}/${activeIntegrations.length} integrations synced`);
      return syncCount > 0;

    } catch (error) {
      console.error(`❌ Error in automatic sync for user ${userId}:`, error);
      return false;
    } finally {
      // Remove lock after sync completes
      this.syncLocks.delete(lockKey);
    }
  }

  private async syncIntegration(integration: any, trigger: string): Promise<boolean> {
    try {
      // Check if sync is already in progress
      if (integration.sync_in_progress) {
        console.log(`⏳ Sync already in progress for integration ${integration.id}`);
        return false;
      }

      // Set sync in progress flag
      await this.storage.updateCalendarIntegration(integration.id, {
        sync_in_progress: true,
        last_sync_trigger: trigger
      });

      // Setup credentials
      googleCalendarService.setCredentials(
        integration.access_token,
        integration.refresh_token,
        integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : undefined
      );

      // Refresh token if needed
      await googleCalendarService.refreshTokenIfNeeded(integration);

      // Perform incremental sync
      const syncResult = await googleCalendarService.getEventsIncremental(
        integration.calendar_id || 'primary',
        { syncToken: integration.sync_token }
      );

      // Process events
      let processedEvents = 0;
      for (const event of syncResult.events) {
        if (event.status === 'cancelled') {
          // Handle deleted events
          await this.handleDeletedEvent(event, integration);
        } else {
          // Handle new/updated events
          await this.handleUpsertEvent(event, integration);
        }
        processedEvents++;
      }

      // Update sync token and timestamp
      await this.storage.updateCalendarIntegration(integration.id, {
        sync_token: syncResult.nextSyncToken,
        last_sync_at: new Date(),
        sync_in_progress: false,
        sync_errors: null
      });

      console.log(`✅ Synced integration ${integration.id}: ${processedEvents} events processed`);
      return true;

    } catch (error: any) {
      console.error(`❌ Error syncing integration ${integration.id}:`, error);
      
      // Clear sync in progress and log error
      await this.storage.updateCalendarIntegration(integration.id, {
        sync_in_progress: false,
        sync_errors: error.message || 'Unknown sync error'
      });
      
      return false;
    }
  }

  private async handleUpsertEvent(event: any, integration: any): Promise<void> {
    if (!event.start || !event.end) return;

    const startDate = new Date(event.start.dateTime || event.start.date);
    const endDate = new Date(event.end.dateTime || event.end.date);
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

    // Check if appointment already exists
    const existingAppointments = await this.storage.getAppointmentsByGoogleEventId(event.id);
    
    if (existingAppointments.length > 0) {
      // Update existing appointment
      const appointment = existingAppointments[0];
      await this.storage.updateAppointment(appointment.id, {
        doctor_name: event.summary || 'Evento do Google Calendar',
        scheduled_date: startDate,
        duration_minutes: durationMinutes,
        description: event.description || '',
        updated_at: new Date()
      });
    } else {
      // Create new appointment
      const contact = await this.getOrCreateContactFromEvent(event, integration);
      
      await this.storage.createAppointment({
        clinic_id: integration.clinic_id,
        user_id: integration.user_id,
        contact_id: contact?.id || null,
        doctor_name: event.summary || 'Evento do Google Calendar',
        specialty: 'Evento do Google Calendar',
        appointment_type: 'google_calendar',
        scheduled_date: startDate,
        duration_minutes: durationMinutes,
        status: startDate > new Date() ? 'scheduled' : 'completed',
        payment_status: 'pending',
        payment_amount: 0,
        description: event.description || '',
        google_calendar_event_id: event.id,
      });
    }
  }

  private async handleDeletedEvent(event: any, integration: any): Promise<void> {
    // Remove appointments associated with deleted Google Calendar events
    await this.storage.deleteGoogleCalendarEvents(integration.user_id, integration.calendar_id, event.id);
  }

  private async getOrCreateContactFromEvent(event: any, integration: any): Promise<any | null> {
    if (!event.attendees || event.attendees.length === 0) return null;

    const attendeeEmail = event.attendees.find((a: any) => a.email !== integration.email)?.email;
    if (!attendeeEmail) return null;

    // Try to find existing contact
    const contacts = await this.storage.getContacts(integration.clinic_id, { search: attendeeEmail });
    let contact = contacts.find(c => c.email === attendeeEmail);

    if (!contact) {
      // Create new contact
      contact = await this.storage.createContact({
        clinic_id: integration.clinic_id,
        name: attendeeEmail.split('@')[0],
        email: attendeeEmail,
        status: 'lead',
        source: 'google-calendar-auto',
      });
    }

    return contact;
  }

  async setupWebhookForIntegration(integration: any): Promise<boolean> {
    try {
      const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.replit.app'}/api/calendar/webhook`;
      
      googleCalendarService.setCredentials(
        integration.access_token,
        integration.refresh_token,
        integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : undefined
      );

      const webhookInfo = await googleCalendarService.setupWebhook(
        integration.calendar_id || 'primary',
        webhookUrl
      );

      await this.storage.updateCalendarIntegration(integration.id, {
        watch_channel_id: webhookInfo.id,
        watch_resource_id: webhookInfo.resourceId,
        watch_expires_at: new Date(webhookInfo.expiration)
      });

      console.log(`📡 Webhook setup for integration ${integration.id}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to setup webhook for integration ${integration.id}:`, error);
      return false;
    }
  }

  private async renewExpiringWebhooks(): Promise<void> {
    try {
      const now = new Date();
      const renewalThreshold = new Date(now.getTime() + this.WEBHOOK_RENEWAL_BUFFER);

      // Get integrations with webhooks expiring soon
      const integrations = await this.storage.getCalendarIntegrationsForWebhookRenewal(renewalThreshold);

      for (const integration of integrations) {
        if (integration.watch_channel_id && integration.watch_resource_id) {
          await this.renewWebhook(integration);
        }
      }

    } catch (error) {
      console.error('❌ Error renewing webhooks:', error);
    }
  }

  private async renewWebhook(integration: any): Promise<void> {
    try {
      const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.replit.app'}/api/calendar/webhook`;
      
      googleCalendarService.setCredentials(
        integration.access_token,
        integration.refresh_token,
        integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : undefined
      );

      const newWebhookInfo = await googleCalendarService.renewWebhook(
        integration.calendar_id || 'primary',
        webhookUrl,
        integration.watch_channel_id,
        integration.watch_resource_id
      );

      await this.storage.updateCalendarIntegration(integration.id, {
        watch_channel_id: newWebhookInfo.id,
        watch_resource_id: newWebhookInfo.resourceId,
        watch_expires_at: new Date(newWebhookInfo.expiration)
      });

      console.log(`🔄 Renewed webhook for integration ${integration.id}`);

    } catch (error) {
      console.error(`❌ Failed to renew webhook for integration ${integration.id}:`, error);
    }
  }

  // Auto-trigger methods for different scenarios
  async onUserLogin(userId: string): Promise<void> {
    await this.triggerSync(userId, 'login');
  }

  async onCalendarView(userId: string): Promise<void> {
    await this.triggerSync(userId, 'calendar-view');
  }

  async onProfessionalSwitch(userId: string): Promise<void> {
    await this.triggerSync(userId, 'professional-switch');
  }

  async onDateChange(userId: string): Promise<void> {
    await this.triggerSync(userId, 'date-change');
  }

  async onWebhookNotification(channelId: string, resourceId: string): Promise<void> {
    try {
      // Find integration by webhook info
      const integration = await this.storage.getCalendarIntegrationByWebhook(channelId, resourceId);
      if (integration) {
        await this.triggerSync(integration.user_id, 'webhook', true);
      }
    } catch (error) {
      console.error('❌ Error handling webhook notification:', error);
    }
  }
}