import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function createWhatsAppTable() {
  try {
    console.log('Creating WhatsApp numbers table...');
    
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_POOLER_URL;
    if (!connectionString) {
      throw new Error('No database connection string found');
    }
    
    const sql = postgres(connectionString);
    const db = drizzle(sql);
    
    // Create the table using raw SQL
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_numbers (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL REFERENCES public.profiles(id),
        user_id TEXT NOT NULL,
        phone_number TEXT NOT NULL DEFAULT '',
        instance_name TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        connected_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    console.log('✅ WhatsApp numbers table created successfully');
    
    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_clinic_id 
      ON whatsapp_numbers(clinic_id);
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_instance_name 
      ON whatsapp_numbers(instance_name);
    `;
    
    console.log('✅ WhatsApp numbers indexes created successfully');
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ Error creating WhatsApp numbers table:', error);
    throw error;
  }
}

createWhatsAppTable()
  .then(() => {
    console.log('WhatsApp table setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('WhatsApp table setup failed:', error);
    process.exit(1);
  });