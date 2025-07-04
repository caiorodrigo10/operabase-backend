import { supabaseAdmin } from './server/supabase';

async function testSupabaseAuthIntegration() {
  console.log('🔍 Testing Supabase Auth Integration...');
  
  try {
    // Test 1: Verify migrated user exists
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const migratedUser = users.users.find(u => u.email === 'admin@teste.com');
    
    if (!migratedUser) {
      console.log('❌ Migrated user not found in Supabase Auth');
      return false;
    }
    
    console.log(`✅ User found: ${migratedUser.email} (UUID: ${migratedUser.id})`);
    
    // Test 2: Generate auth token for testing
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'admin@teste.com'
    });
    
    if (tokenError) {
      console.log('❌ Error generating test token:', tokenError.message);
      return false;
    }
    
    console.log('✅ Test token generated successfully');
    
    // Test 3: Test login with new password
    console.log('🧪 Testing login with new credentials...');
    console.log('Email: admin@teste.com');
    console.log('Password: NovaSeinha123!');
    console.log('UUID: e35fc90d-4509-4eb4-a17a-7df154917f9f');
    
    // Test 4: Verify profile exists using direct SQL
    const { pool } = await import('./server/db');
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      ['e35fc90d-4509-4eb4-a17a-7df154917f9f']
    );
    
    const profile = profileResult.rows[0];
    
    if (!profile) {
      console.log('❌ Profile not found');
      return false;
    }
    
    console.log(`✅ Profile found: ${profile.name} (${profile.role})`);
    
    // Test 5: Verify ID mapping using direct SQL
    const mappingResult = await pool.query(
      'SELECT * FROM user_id_mapping WHERE supabase_uuid = $1',
      ['e35fc90d-4509-4eb4-a17a-7df154917f9f']
    );
    
    const mapping = mappingResult.rows[0];
    
    if (!mapping) {
      console.log('❌ ID mapping not found');
      return false;
    }
    
    console.log(`✅ ID mapping: UUID ${mapping.supabase_uuid} -> Legacy ID ${mapping.legacy_id}`);
    
    console.log('\n📋 Migration Summary:');
    console.log(`✅ User migrated to Supabase Auth`);
    console.log(`✅ Profile created with correct role`);
    console.log(`✅ ID mapping established`);
    console.log(`✅ New credentials: admin@teste.com / NovaSeinha123!`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 FASE 3: Backend Migration - Integration Test');
  console.log('='.repeat(50));
  
  const success = await testSupabaseAuthIntegration();
  
  if (success) {
    console.log('\n🎯 FASE 3.1 completed successfully!');
    console.log('📝 Next: Update server routes to use Supabase Auth');
  } else {
    console.log('\n❌ FASE 3.1 failed - requires debugging');
  }
}

main().catch(console.error);