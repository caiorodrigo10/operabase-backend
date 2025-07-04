import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function addProfilePictureColumn() {
  try {
    console.log('Adding profile_picture column to contacts table...');
    
    await db.execute(sql`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS profile_picture TEXT;
    `);
    
    console.log('✅ Successfully added profile_picture column to contacts table');
  } catch (error) {
    console.error('Error adding profile_picture column:', error);
    throw error;
  }
}

// Run the migration
addProfilePictureColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });