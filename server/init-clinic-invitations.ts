import { sql } from "drizzle-orm";
import { db } from "./db";

export async function initClinicInvitationsSystem() {
  try {
    console.log('🏥 Initializing Clinic Invitations system...');
    
    // Create clinic_invitations table (clinic status column already exists)
    console.log('🔧 Creating clinic_invitations table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clinic_invitations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        admin_email VARCHAR(255) NOT NULL,
        admin_name VARCHAR(255) NOT NULL,
        clinic_name VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_by_user_id INTEGER NOT NULL,
        clinic_id INTEGER NULL,
        expires_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Skip indexes for initial setup to avoid conflicts
    console.log('🔧 Skipping indexes for initial setup...');

    console.log('✅ Clinic Invitations system initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize Clinic Invitations system:', error);
    throw error;
  }
}