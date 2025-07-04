import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function addAdvancedCalendarColumns() {
  console.log('🔧 Adding advanced calendar synchronization columns...');
  
  try {
    // Add new columns for advanced sync functionality
    await db.execute(sql`
      ALTER TABLE calendar_integrations 
      ADD COLUMN IF NOT EXISTS sync_token TEXT,
      ADD COLUMN IF NOT EXISTS watch_channel_id TEXT,
      ADD COLUMN IF NOT EXISTS watch_resource_id TEXT,
      ADD COLUMN IF NOT EXISTS watch_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS sync_in_progress BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS last_sync_trigger TEXT;
    `);

    // Add index for webhook lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_calendar_watch_channel 
      ON calendar_integrations(watch_channel_id);
    `);

    console.log('✅ Successfully added advanced calendar synchronization columns');
    console.log('📋 New columns added:');
    console.log('   - sync_token: For incremental Google Calendar sync');
    console.log('   - watch_channel_id: Google webhook channel ID');
    console.log('   - watch_resource_id: Google resource ID for webhooks');
    console.log('   - watch_expires_at: Webhook expiration timestamp');
    console.log('   - sync_in_progress: Lock mechanism for concurrent syncs');
    console.log('   - last_sync_trigger: Track sync trigger source');
    
  } catch (error) {
    console.error('❌ Error adding columns:', error);
  }
}

addAdvancedCalendarColumns().then(() => {
  console.log('🎯 Migration completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});