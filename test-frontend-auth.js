// Test frontend authentication and get current token
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testAuth() {
  try {
    console.log('🔍 Testing Supabase login...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@teste.com',
      password: 'NovaSeinha123!'
    });

    if (error) {
      console.error('❌ Login error:', error);
      return;
    }

    console.log('✅ Login successful');
    console.log('📋 Session token:', data.session?.access_token?.substring(0, 50) + '...');
    console.log('🆔 User ID:', data.user?.id);
    console.log('📧 Email:', data.user?.email);
    
    // Test the token immediately
    const token = data.session?.access_token;
    if (token) {
      console.log('\n🧪 Testing medical records API with fresh token...');
      
      const response = await fetch('http://localhost:5000/api/contacts/5/medical-records', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.text();
      console.log('📊 API Response status:', response.status);
      console.log('📊 API Response:', result);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAuth();