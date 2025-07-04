import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createProfile() {
  console.log('🔍 Attempting to create profiles table and user profile...');
  
  // Use SQL to create table and insert profile directly
  try {
    const { data, error } = await supabaseAdmin.rpc('exec', {
      sql: `
        -- Create profiles table if it doesn't exist
        CREATE TABLE IF NOT EXISTS profiles (
          id uuid PRIMARY KEY,
          name text,
          email text,
          role text DEFAULT 'user',
          clinic_id integer,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );
        
        -- Insert or update the user profile
        INSERT INTO profiles (id, name, email, role, clinic_id)
        VALUES ('3cd96e6d-81f2-4c8a-a54d-3abac77b37a4', 'Caio Rodrigo', 'cr@caiorodrigo.com.br', 'super_admin', 1)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          clinic_id = EXCLUDED.clinic_id,
          updated_at = now();
      `
    });
    
    if (error) {
      console.log('❌ SQL execution error:', error);
    } else {
      console.log('✅ Profile created/updated successfully via SQL');
      return;
    }
  } catch (e) {
    console.log('❌ Failed to execute SQL:', e);
  }
  
  console.log('🔍 Checking for existing profile...');
  
  try {
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', '3cd96e6d-81f2-4c8a-a54d-3abac77b37a4')
      .single();
      
    if (existingProfile) {
      console.log('✅ Profile already exists:', existingProfile);
      return;
    }
  } catch (error) {
    console.log('📝 Profile not found, creating new one...');
  }
  
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: '3cd96e6d-81f2-4c8a-a54d-3abac77b37a4',
      name: 'Caio Rodrigo',
      email: 'cr@caiorodrigo.com.br',
      role: 'super_admin',
      clinic_id: 1
    })
    .select()
    .single();
    
  if (error) {
    console.error('❌ Error creating profile:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Profile created successfully:', data);
  }
}

createProfile().catch(console.error);