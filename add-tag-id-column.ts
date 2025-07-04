import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function addTagIdColumn() {
  try {
    console.log('Adding tag_id column to appointments table...');
    
    // Add tag_id column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS tag_id INTEGER
    `);
    
    console.log('✅ Successfully added tag_id column to appointments table');
    
    // Close the connection
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding tag_id column:', error);
    process.exit(1);
  }
}

addTagIdColumn();