// Test complete login flow
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testLoginFlow() {
  try {
    console.log('🔍 Testing complete login flow...');
    
    // Clear any existing session
    await supabase.auth.signOut();
    console.log('🧹 Cleared existing session');
    
    // Test login
    console.log('🔐 Attempting login...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@teste.com',
      password: 'NovaSeinha123!'
    });

    if (error) {
      console.error('❌ Login failed:', error);
      return;
    }

    console.log('✅ Login successful');
    console.log('👤 User ID:', data.user?.id);
    console.log('📧 Email:', data.user?.email);
    console.log('📋 User metadata:', data.user?.user_metadata);
    console.log('🔑 Session exists:', !!data.session);
    
    // Test session retrieval
    console.log('\n🔍 Testing session retrieval...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session retrieval failed:', sessionError);
      return;
    }
    
    console.log('📊 Session retrieved:', !!sessionData.session);
    console.log('👤 Session user:', sessionData.session?.user?.email);
    
    // Test API call with session
    console.log('\n🧪 Testing API call with session...');
    const token = sessionData.session?.access_token;
    
    if (token) {
      const response = await fetch('http://localhost:5000/api/contacts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('📋 API data received:', Array.isArray(data) ? `${data.length} items` : 'Object');
      } else {
        const errorText = await response.text();
        console.log('❌ API error:', errorText);
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testLoginFlow();