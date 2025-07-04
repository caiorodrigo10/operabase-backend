import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.SUPABASE_POOLER_URL!.replace('#', '%23');
const sql = postgres(connectionString);
const db = drizzle(sql);

async function addEmailColumn() {
  try {
    console.log('🔄 Adding email column to clinics table...');
    
    // Add missing columns if they don't exist
    await sql`
      ALTER TABLE clinics 
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS address_street TEXT,
      ADD COLUMN IF NOT EXISTS address_number TEXT,
      ADD COLUMN IF NOT EXISTS address_complement TEXT,
      ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
      ADD COLUMN IF NOT EXISTS address_city TEXT,
      ADD COLUMN IF NOT EXISTS address_state TEXT,
      ADD COLUMN IF NOT EXISTS total_professionals INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
      ADD COLUMN IF NOT EXISTS cnpj TEXT,
      ADD COLUMN IF NOT EXISTS website TEXT,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `;

    console.log('✅ Email column added successfully');

    // Verify the structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'clinics' 
      ORDER BY ordinal_position
    `;

    console.log('📋 Current clinics table structure:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'}, nullable: ${col.is_nullable})`);
    });

    await sql.end();
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

addEmailColumn();