import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.SUPABASE_POOLER_URL!.replace('#', '%23');
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function deleteCalendarIntegration() {
  try {
    console.log('🗑️ Deleting existing calendar integrations...');
    
    // Delete all calendar integrations
    const deleteResult = await client`
      DELETE FROM calendar_integrations 
      WHERE email = 'cr@caiorodrigo.com.br'
      RETURNING id, email, provider
    `;
    
    console.log('✅ Deleted calendar integrations:', deleteResult);
    
    // Verify deletion
    const remaining = await client`
      SELECT COUNT(*) as count FROM calendar_integrations
    `;
    
    console.log('📊 Remaining integrations:', remaining[0]?.count || 0);
    
  } catch (error) {
    console.error('❌ Error deleting calendar integration:', error);
  } finally {
    await client.end();
  }
}

deleteCalendarIntegration();