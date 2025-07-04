import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function cleanupOrphanedEvents() {
  try {
    console.log('🧹 Cleaning up orphaned Google Calendar events...');
    
    // Delete all Google Calendar events that don't have corresponding active integrations
    const result = await db.execute(sql`
      DELETE FROM appointments 
      WHERE google_calendar_event_id IS NOT NULL
      AND user_id::text NOT IN (
        SELECT DISTINCT user_id::text
        FROM calendar_integrations 
        WHERE is_active = true
      )
      RETURNING *
    `);
    
    const deletedCount = result.rowCount || 0;
    console.log(`🗑️ Deleted ${deletedCount} orphaned Google Calendar events`);
    
    // Show remaining Google Calendar events (should be only from active integrations)
    const remainingEvents = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM appointments 
      WHERE google_calendar_event_id IS NOT NULL
    `);
    
    console.log(`📊 Remaining Google Calendar events: ${(remainingEvents.rows[0] as any).count}`);
    
    console.log('✅ Cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    process.exit(0);
  }
}

cleanupOrphanedEvents();