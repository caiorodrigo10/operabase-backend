import { google } from 'googleapis';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendeeEmails?: string[];
}

export interface CalendarInfo {
  calendarId: string;
  email: string;
  name?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
}

export interface WebhookInfo {
  id: string;
  resourceId: string;
  expiration: number;
}

export interface SyncOptions {
  syncToken?: string;
  timeMin?: string;
  timeMax?: string;
  pageToken?: string;
}

class GoogleCalendarService {
  private oauth2Client: any;
  private calendar: any;

  constructor() {
    console.log('🔧 Inicializando GoogleCalendarService...');
    
    // Determine the redirect URI based on environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DOMAINS;
    const redirectUri = isProduction 
      ? `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/api/calendar/callback/google`
      : 'http://localhost:5000/api/calendar/callback/google';

    console.log('🔗 Configuração OAuth:', {
      isProduction,
      redirectUri,
      customRedirectUri: process.env.GOOGLE_REDIRECT_URI,
      finalRedirectUri: process.env.GOOGLE_REDIRECT_URI || redirectUri,
      clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
      clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET
    });

    try {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || redirectUri
      );
      
      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      console.log('✅ GoogleCalendarService inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar GoogleCalendarService:', error);
      throw error;
    }
  }

  generateAuthUrl(): string {
    console.log('🔗 Gerando URL de autenticação...');
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    console.log('📋 Scopes configurados:', scopes);

    try {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });
      
      console.log('✅ URL de autenticação gerada:', authUrl);
      return authUrl;
    } catch (error) {
      console.error('❌ Erro ao gerar URL de autenticação:', error);
      throw error;
    }
  }

  async getTokensFromCode(code: string): Promise<TokenResponse> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || undefined,
        expiry_date: tokens.expiry_date || Date.now() + 3600000
      };
    } catch (error) {
      console.error('Error getting tokens from code:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  setCredentials(accessToken: string, refreshToken?: string, expiryDate?: number) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
      expiry_date: expiryDate
    });
  }

  async refreshAccessToken(): Promise<TokenResponse> {
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date!
    };
  }

  async refreshTokenIfNeeded(integration: any): Promise<void> {
    // Check if token is expired or will expire soon (within 5 minutes)
    const now = new Date();
    const expiryDate = new Date(integration.token_expires_at);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiryDate <= fiveMinutesFromNow) {
      console.log('Token expired or expiring soon, refreshing...');
      
      // Set credentials for refresh
      this.oauth2Client.setCredentials({
        access_token: integration.access_token,
        refresh_token: integration.refresh_token,
        expiry_date: expiryDate.getTime()
      });

      try {
        const newTokens = await this.refreshAccessToken();
        
        // Update integration with new tokens
        const { storage } = await import('./storage');
        await storage.updateCalendarIntegration(integration.id, {
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || integration.refresh_token,
          token_expires_at: new Date(newTokens.expiry_date)
        });

        console.log('Token refreshed successfully');
      } catch (error) {
        console.error('Error refreshing token:', error);
        throw new Error('Failed to refresh access token');
      }
    } else {
      // Set current credentials
      this.oauth2Client.setCredentials({
        access_token: integration.access_token,
        refresh_token: integration.refresh_token,
        expiry_date: expiryDate.getTime()
      });
    }
  }

  async getUserCalendarInfo(): Promise<CalendarInfo> {
    try {
      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // Get primary calendar
      const calendarList = await this.calendar.calendarList.list();
      const primaryCalendar = calendarList.data.items?.find((cal: any) => cal.primary);

      return {
        calendarId: primaryCalendar?.id || 'primary',
        email: userInfo.data.email || '',
        name: userInfo.data.name || undefined
      };
    } catch (error) {
      console.error('Error getting user calendar info:', error);
      throw new Error('Failed to get calendar information');
    }
  }

  async getUserCalendars(): Promise<any[]> {
    try {
      const calendarList = await this.calendar.calendarList.list();
      return calendarList.data.items || [];
    } catch (error) {
      console.error('Error getting user calendars:', error);
      throw new Error('Failed to get calendar list');
    }
  }

  async getEvents(
    accessToken: string, 
    refreshToken: string, 
    startDate: Date, 
    endDate: Date, 
    calendarId: string = 'primary'
  ): Promise<any[]> {
    try {
      // Set up OAuth2 client with tokens
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const response = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error getting calendar events:', error);
      // If token is expired, try to refresh
      if (error.code === 401) {
        try {
          const newTokens = await this.refreshAccessToken();
          this.oauth2Client.setCredentials({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || refreshToken
          });

          // Retry the request
          const response = await this.calendar.events.list({
            calendarId: calendarId,
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
          });

          return response.data.items || [];
        } catch (refreshError) {
          console.error('Error refreshing token for events:', refreshError);
          return [];
        }
      }
      return [];
    }
  }

  async createEvent(calendarId: string, event: CalendarEvent): Promise<any> {
    try {
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: {
            dateTime: event.startDateTime,
            timeZone: 'America/Sao_Paulo'
          },
          end: {
            dateTime: event.endDateTime,
            timeZone: 'America/Sao_Paulo'
          },
          attendees: event.attendeeEmails?.map(email => ({ email }))
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  async updateEvent(calendarId: string, eventId: string, event: CalendarEvent): Promise<any> {
    try {
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: {
            dateTime: event.startDateTime,
            timeZone: 'America/Sao_Paulo'
          },
          end: {
            dateTime: event.endDateTime,
            timeZone: 'America/Sao_Paulo'
          },
          attendees: event.attendeeEmails?.map(email => ({ email }))
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  async getEvent(calendarId: string, eventId: string): Promise<any> {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId
      });

      return response.data;
    } catch (error) {
      console.error('Error getting calendar event:', error);
      throw new Error('Failed to get calendar event');
    }
  }

  async listEvents(calendarId: string, timeMin?: string, timeMax?: string): Promise<any[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax,
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error listing calendar events:', error);
      throw new Error('Failed to list calendar events');
    }
  }

  // Advanced synchronization methods
  async getEventsIncremental(calendarId: string, options: SyncOptions): Promise<{ events: any[], nextSyncToken?: string, nextPageToken?: string }> {
    try {
      const params: any = {
        calendarId,
        maxResults: 250,
        singleEvents: true
      };

      // Use sync token for incremental sync if available
      if (options.syncToken) {
        params.syncToken = options.syncToken;
      } else {
        // First sync or sync token expired - use timeMin
        params.timeMin = options.timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
        if (options.timeMax) {
          params.timeMax = options.timeMax;
        }
        params.orderBy = 'startTime';
      }

      if (options.pageToken) {
        params.pageToken = options.pageToken;
      }

      console.log('🔄 Getting incremental events with params:', JSON.stringify(params, null, 2));

      const response = await this.calendar.events.list(params);
      
      return {
        events: response.data.items || [],
        nextSyncToken: response.data.nextSyncToken,
        nextPageToken: response.data.nextPageToken
      };
    } catch (error: any) {
      console.error('Error getting incremental calendar events:', error);
      
      // If sync token is invalid, restart with full sync
      if (error.code === 410 || error.message?.includes('Sync token is no longer valid')) {
        console.log('🔄 Sync token expired, restarting with full sync');
        return this.getEventsIncremental(calendarId, { 
          timeMin: options.timeMin,
          timeMax: options.timeMax 
        });
      }
      
      throw new Error('Failed to get incremental calendar events');
    }
  }

  async setupWebhook(calendarId: string, webhookUrl: string): Promise<WebhookInfo> {
    try {
      const channelId = `taskmed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await this.calendar.events.watch({
        calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          token: process.env.GOOGLE_WEBHOOK_TOKEN || 'taskmed-webhook-secret'
        }
      });

      console.log('📡 Webhook setup successful:', {
        channelId: response.data.id,
        resourceId: response.data.resourceId,
        expiration: response.data.expiration
      });

      return {
        id: response.data.id!,
        resourceId: response.data.resourceId!,
        expiration: parseInt(response.data.expiration!)
      };
    } catch (error) {
      console.error('Error setting up webhook:', error);
      throw new Error('Failed to setup calendar webhook');
    }
  }

  async stopWebhook(channelId: string, resourceId: string): Promise<void> {
    try {
      await this.calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId: resourceId
        }
      });

      console.log('📡 Webhook stopped successfully:', { channelId, resourceId });
    } catch (error) {
      console.error('Error stopping webhook:', error);
      throw new Error('Failed to stop calendar webhook');
    }
  }

  async renewWebhook(calendarId: string, webhookUrl: string, oldChannelId: string, oldResourceId: string): Promise<WebhookInfo> {
    try {
      // Stop old webhook
      await this.stopWebhook(oldChannelId, oldResourceId);
      
      // Setup new webhook
      return await this.setupWebhook(calendarId, webhookUrl);
    } catch (error) {
      console.error('Error renewing webhook:', error);
      throw new Error('Failed to renew calendar webhook');
    }
  }
}

export { GoogleCalendarService };
export const googleCalendarService = new GoogleCalendarService();