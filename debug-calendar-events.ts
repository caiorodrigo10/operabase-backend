import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { GoogleCalendarService } from './server/google-calendar-service';

const connectionString = process.env.SUPABASE_POOLER_URL!.replace('#', '%23');
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function debugCalendarEvents() {
  try {
    console.log('🔍 Debugging Google Calendar Events...');
    
    // Get the active integration
    const integrations = await client`
      SELECT id, user_id, calendar_id, access_token, refresh_token, token_expires_at, is_active, sync_enabled
      FROM calendar_integrations 
      WHERE user_id = '3cd96e6d-81f2-4c8a-a54d-3abac77b37a4' AND is_active = true
    `;
    
    console.log('📋 Active integrations:', integrations.length);
    
    if (integrations.length === 0) {
      console.log('❌ No active integrations found');
      return;
    }
    
    const integration = integrations[0];
    console.log('🔗 Using integration:', {
      id: integration.id,
      calendar_id: integration.calendar_id,
      is_active: integration.is_active,
      sync_enabled: integration.sync_enabled,
      token_expires_at: integration.token_expires_at
    });
    
    // Initialize Google Calendar service
    const googleCalendarService = new GoogleCalendarService();
    
    console.log('🔧 Setting up credentials...');
    const tokenExpiry = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : undefined;
    googleCalendarService.setCredentials(
      integration.access_token,
      integration.refresh_token,
      tokenExpiry
    );
    
    // Test different date ranges
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString(); // Last 7 days
    const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30).toISOString(); // Next 30 days
    
    console.log('📅 Fetching events from:', timeMin, 'to:', timeMax);
    console.log('📅 Calendar ID:', integration.calendar_id);
    
    try {
      const events = await googleCalendarService.listEvents(
        integration.calendar_id,
        timeMin,
        timeMax
      );
      
      console.log('📊 Events found:', events.length);
      
      if (events.length > 0) {
        console.log('\n📋 Event details:');
        events.forEach((event, index) => {
          console.log(`${index + 1}. "${event.summary}"`);
          console.log(`   Start: ${event.start?.dateTime || event.start?.date}`);
          console.log(`   End: ${event.end?.dateTime || event.end?.date}`);
          console.log(`   ID: ${event.id}`);
          console.log(`   Description: ${event.description || 'N/A'}`);
          console.log('---');
        });
        
        // Test conversion to appointment format
        console.log('\n🔄 Converting to appointment format...');
        const appointmentEvents = [];
        
        for (const event of events) {
          if (event.start?.dateTime && event.summary) {
            const startDate = new Date(event.start.dateTime);
            const endDate = new Date(event.end?.dateTime || event.start.dateTime);
            const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
            
            appointmentEvents.push({
              id: `gc_${event.id}`,
              contact_id: null,
              user_id: integration.user_id,
              clinic_id: 1,
              doctor_name: event.summary,
              specialty: 'Evento do Google Calendar',
              appointment_type: 'google_calendar',
              scheduled_date: startDate,
              duration_minutes: durationMinutes,
              status: 'scheduled',
              payment_status: 'pending',
              payment_amount: 0,
              session_notes: event.description || null,
              google_calendar_event_id: event.id,
              is_google_calendar_event: true,
              sync_enabled: integration.sync_enabled
            });
          }
        }
        
        console.log('✅ Converted appointments:', appointmentEvents.length);
        appointmentEvents.forEach((apt, index) => {
          console.log(`${index + 1}. ${apt.doctor_name} - ${apt.scheduled_date}`);
        });
        
      } else {
        console.log('📭 No events found in the specified date range');
        
        // Try a wider range
        console.log('\n🔍 Trying wider date range...');
        const wideTimeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const wideTimeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
        
        console.log('📅 Wide range from:', wideTimeMin, 'to:', wideTimeMax);
        
        const wideEvents = await googleCalendarService.listEvents(
          integration.calendar_id,
          wideTimeMin,
          wideTimeMax
        );
        
        console.log('📊 Wide range events found:', wideEvents.length);
      }
      
    } catch (calendarError) {
      console.error('❌ Google Calendar API error:', calendarError);
      
      // Check if it's a token issue
      if (calendarError.message?.includes('401') || calendarError.message?.includes('unauthorized')) {
        console.log('🔑 Token issue detected - may need refresh');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await client.end();
  }
}

debugCalendarEvents();