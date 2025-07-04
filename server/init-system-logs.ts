import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Initialize System Logs table - Phase 1
 * Creates the system_logs table with optimized indexes
 */
export async function initSystemLogsTable() {
  console.log('🔧 Initializing System Logs table...');
  
  try {
    // Create the system_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        
        -- Identificação da ação
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        action_type VARCHAR(100) NOT NULL,
        
        -- Quem fez a ação
        actor_id UUID,
        actor_type VARCHAR(50),
        actor_name VARCHAR(255),
        
        -- Contexto adicional para sistema médico
        professional_id INTEGER,
        related_entity_id INTEGER,
        
        -- Dados da ação
        previous_data JSONB,
        new_data JSONB,
        changes JSONB,
        
        -- Contexto adicional
        source VARCHAR(50),
        ip_address VARCHAR(45),
        user_agent TEXT,
        session_id VARCHAR(255),
        
        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create optimized indexes for performance (without CONCURRENTLY for startup)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_logs_clinic_entity 
      ON system_logs (clinic_id, entity_type, entity_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_logs_actor 
      ON system_logs (clinic_id, actor_id, created_at);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_logs_timeline 
      ON system_logs (clinic_id, created_at DESC);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_logs_professional 
      ON system_logs (clinic_id, professional_id, created_at);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_logs_entity_type 
      ON system_logs (entity_type, action_type);
    `);

    console.log('✅ System Logs table initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize System Logs table:', error);
    return false;
  }
}

// Self-executing initialization for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  initSystemLogsTable().then(() => {
    console.log('🚀 System Logs initialization complete');
    process.exit(0);
  }).catch(error => {
    console.error('💥 System Logs initialization failed:', error);
    process.exit(1);
  });
}