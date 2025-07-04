import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCalendarTokenHandling() {
  console.log('🔍 Testing calendar token handling...');

  try {
    // Check current calendar integrations
    const { data: integrations, error } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('sync_enabled', true);

    if (error) {
      console.error('❌ Error fetching integrations:', error);
      return;
    }

    console.log(`📅 Found ${integrations.length} active calendar integrations`);

    for (const integration of integrations) {
      console.log(`\n🔍 Integration ${integration.id}:`);
      console.log(`- Provider: ${integration.provider}`);
      console.log(`- Sync enabled: ${integration.sync_enabled}`);
      console.log(`- Has access token: ${!!integration.access_token}`);
      console.log(`- Has refresh token: ${!!integration.refresh_token}`);
      console.log(`- Token expires: ${integration.token_expires_at}`);
      console.log(`- Sync errors: ${integration.sync_errors || 'None'}`);

      // Check if token appears to be expired
      if (integration.token_expires_at) {
        const expiryDate = new Date(integration.token_expires_at);
        const now = new Date();
        const isExpired = expiryDate < now;
        console.log(`- Token expired: ${isExpired}`);
        
        if (isExpired) {
          console.log('⚠️ Token appears to be expired');
          
          // Disable this integration to prevent further errors
          const { error: updateError } = await supabase
            .from('calendar_integrations')
            .update({
              sync_enabled: false,
              sync_errors: 'Token expired - re-authentication required'
            })
            .eq('id', integration.id);

          if (updateError) {
            console.error('❌ Failed to update integration:', updateError);
          } else {
            console.log('✅ Disabled expired integration');
          }
        }
      }
    }

    // Test availability check without Google Calendar
    console.log('\n🧪 Testing availability check...');
    const testDate = new Date();
    const testResponse = await fetch('http://localhost:5000/api/availability/find-slots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: testDate.toISOString().split('T')[0],
        duration: 60
      })
    });

    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ Availability check working');
      console.log(`📊 Found ${result.slots?.length || 0} available slots`);
    } else {
      console.log('❌ Availability check failed:', testResponse.status);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCalendarTokenHandling();