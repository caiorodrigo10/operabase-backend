import { storage } from './server/storage-factory';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function addRoleColumns() {
  console.log('🔄 Adding role and professional status columns...');

  try {
    // Add is_professional column to clinic_users if it doesn't exist
    console.log('📋 Adding is_professional column...');
    await db.execute(sql`
      ALTER TABLE clinic_users 
      ADD COLUMN IF NOT EXISTS is_professional BOOLEAN NOT NULL DEFAULT FALSE
    `);

    // Add updated_at column if it doesn't exist
    console.log('📋 Adding updated_at column...');
    await db.execute(sql`
      ALTER TABLE clinic_users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);

    // Create index for professional status
    console.log('📋 Creating index...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_clinic_users_professional 
      ON clinic_users(is_professional)
    `);

    // Create professional_status_audit table
    console.log('📋 Creating audit table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS professional_status_audit (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        target_user_id INTEGER NOT NULL,
        changed_by_user_id INTEGER NOT NULL,
        action VARCHAR(20) NOT NULL CHECK (action IN ('activated', 'deactivated')),
        previous_status BOOLEAN NOT NULL,
        new_status BOOLEAN NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for audit table
    console.log('📋 Creating audit indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_professional_audit_clinic 
      ON professional_status_audit(clinic_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_professional_audit_target 
      ON professional_status_audit(target_user_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_professional_audit_changed_by 
      ON professional_status_audit(changed_by_user_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_professional_audit_created 
      ON professional_status_audit(created_at)
    `);

    // Set admin users as professionals by default
    console.log('📋 Setting admin users as professionals...');
    await db.execute(sql`
      UPDATE clinic_users 
      SET is_professional = TRUE 
      WHERE role = 'admin'
    `);

    // Verify the changes
    console.log('🔍 Verifying changes...');
    const testQuery = await db.execute(sql`
      SELECT id, role, is_professional, updated_at 
      FROM clinic_users 
      LIMIT 3
    `);

    console.log('✅ Sample data:', testQuery.rows);
    console.log('🎉 Role columns added successfully!');

  } catch (error) {
    console.error('❌ Error adding role columns:', error);
    throw error;
  }
}

// Run the migration
addRoleColumns()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });