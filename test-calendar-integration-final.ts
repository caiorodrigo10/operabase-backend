import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.SUPABASE_POOLER_URL!.replace('#', '%23');
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function testCalendarIntegrationStructure() {
  try {
    console.log('🔍 Testing calendar integration structure...');
    
    // Test 1: Check table structure
    const tableInfo = await client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'calendar_integrations' 
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Table structure:');
    tableInfo.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Test 2: Create a test integration with UUID using correct structure
    const testUserId = '3cd96e6d-81f2-4c8a-a54d-3abac77b37a4';
    const testEmail = 'cr@caiorodrigo.com.br';
    
    console.log('\n📝 Testing integration creation...');
    const testResult = await client`
      INSERT INTO calendar_integrations 
      (user_id, clinic_id, provider, provider_user_id, email, calendar_id, calendar_name,
       access_token, refresh_token, is_active, sync_enabled, created_at, updated_at)
      VALUES (${testUserId}, 1, 'google', ${testEmail}, ${testEmail}, 'primary', 'Calendário Principal',
              'test_token', 'test_refresh', true, true, NOW(), NOW())
      RETURNING id, user_id, email, provider, is_active, sync_enabled
    `;
    
    console.log('✅ Test integration created:', testResult[0]);
    
    // Test 3: Search by email
    console.log('\n🔍 Testing search by email...');
    const searchResult = await client`
      SELECT id, user_id, email, provider, is_active, created_at
      FROM calendar_integrations 
      WHERE email = ${testEmail}
      ORDER BY created_at DESC
    `;
    
    console.log('📊 Search results:', searchResult.length);
    searchResult.forEach(integration => {
      console.log(`  ID: ${integration.id}, User: ${integration.user_id}, Email: ${integration.email}`);
    });
    
    // Test 4: Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    const deleteResult = await client`
      DELETE FROM calendar_integrations 
      WHERE email = ${testEmail} AND access_token = 'test_token'
      RETURNING id
    `;
    
    console.log('🗑️ Deleted test records:', deleteResult.length);
    
    console.log('\n✅ Calendar integration structure is ready for production!');
    
  } catch (error) {
    console.error('❌ Error testing calendar integration:', error);
  } finally {
    await client.end();
  }
}

testCalendarIntegrationStructure();