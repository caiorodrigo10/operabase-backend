import { db } from './db';
import { sql } from 'drizzle-orm';

export async function initPasswordResetTable() {
  try {
    console.log('🔧 Initializing Password Reset table...');
    
    // Drop and recreate password_reset_tokens table with correct structure
    await db.execute(sql`DROP TABLE IF EXISTS password_reset_tokens;`);
    
    await db.execute(sql`
      CREATE TABLE password_reset_tokens (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id INTEGER NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user 
      ON password_reset_tokens(user_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
      ON password_reset_tokens(token);
    `);

    console.log('✅ Password Reset table initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Password Reset table:', error);
    throw error;
  }
}