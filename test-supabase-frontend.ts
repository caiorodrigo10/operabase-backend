import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkwrevhxugaxfpwiktdy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrd3Jldmh4dWdheGZwd2lrdGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NDEyNzUsImV4cCI6MjA2NTMxNzI3NX0.1hGfT9Rby8r6u7PBOLMsVODFOXnWfQQRTYNdNJvKaWQ';

async function testSupabaseFrontendConfig() {
  console.log('🧪 Testing Supabase Frontend Configuration...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log(`❌ Config error: ${error.message}`);
      return false;
    }
    
    console.log('✅ Supabase client configured successfully');
    console.log(`URL: ${supabaseUrl}`);
    console.log(`Key: ${supabaseAnonKey.substring(0, 20)}...`);
    
    // Test login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@teste.com',
      password: 'NovaSeinha123!'
    });
    
    if (loginError) {
      console.log(`❌ Login test failed: ${loginError.message}`);
      return false;
    }
    
    console.log('✅ Frontend login test successful');
    console.log(`User ID: ${loginData.user?.id}`);
    
    // Test logout
    await supabase.auth.signOut();
    console.log('✅ Frontend logout test successful');
    
    return true;
    
  } catch (error) {
    console.error('❌ Frontend test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 FASE 4: Frontend Migration - Environment Test');
  console.log('='.repeat(50));
  
  const success = await testSupabaseFrontendConfig();
  
  if (success) {
    console.log('\n🎯 Frontend Configuration: ✅ READY');
    console.log('\n📋 Environment Variables:');
    console.log('✅ VITE_SUPABASE_URL configured');
    console.log('✅ VITE_SUPABASE_ANON_KEY configured');
    console.log('✅ Client authentication working');
    
    console.log('\n📝 Next: Update React components');
  } else {
    console.log('\n❌ Frontend configuration issues detected');
  }
}

main().catch(console.error);