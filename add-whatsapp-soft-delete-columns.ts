#!/usr/bin/env tsx

/**
 * Script para adicionar colunas de soft delete na tabela whatsapp_numbers
 * Executa: npx tsx add-whatsapp-soft-delete-columns.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function addSoftDeleteColumns() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_POOLER_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL or SUPABASE_POOLER_URL environment variable is required');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  
  const sql = postgres(connectionString, {
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🏗️ Adding soft delete columns to whatsapp_numbers table...');

    // Check if columns already exist
    const existingColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_numbers' 
      AND column_name IN ('is_deleted', 'deleted_at', 'deleted_by_user_id')
    `;

    const existingColumnNames = existingColumns.map(row => row.column_name);
    console.log('📋 Existing soft delete columns:', existingColumnNames);

    // Add is_deleted column if not exists
    if (!existingColumnNames.includes('is_deleted')) {
      await sql`
        ALTER TABLE whatsapp_numbers 
        ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE
      `;
      console.log('✅ Added is_deleted column');
    } else {
      console.log('⚠️ is_deleted column already exists, skipping');
    }

    // Add deleted_at column if not exists
    if (!existingColumnNames.includes('deleted_at')) {
      await sql`
        ALTER TABLE whatsapp_numbers 
        ADD COLUMN deleted_at TIMESTAMP
      `;
      console.log('✅ Added deleted_at column');
    } else {
      console.log('⚠️ deleted_at column already exists, skipping');
    }

    // Add deleted_by_user_id column if not exists
    if (!existingColumnNames.includes('deleted_by_user_id')) {
      await sql`
        ALTER TABLE whatsapp_numbers 
        ADD COLUMN deleted_by_user_id INTEGER
      `;
      console.log('✅ Added deleted_by_user_id column');
    } else {
      console.log('⚠️ deleted_by_user_id column already exists, skipping');
    }

    // Create index for is_deleted column for performance
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_deleted 
        ON whatsapp_numbers(is_deleted)
      `;
      console.log('✅ Created index on is_deleted column');
    } catch (indexError) {
      console.log('⚠️ Index may already exist:', indexError);
    }

    // Update existing records to have is_deleted = false if they are null
    const updateResult = await sql`
      UPDATE whatsapp_numbers 
      SET is_deleted = FALSE 
      WHERE is_deleted IS NULL
    `;
    console.log(`✅ Updated ${updateResult.count} existing records to have is_deleted = false`);

    // Display current table structure
    console.log('\n📊 Current whatsapp_numbers table structure:');
    const tableStructure = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_numbers'
      ORDER BY ordinal_position
    `;
    
    tableStructure.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Count current records
    const recordCount = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_deleted = false) as active,
        COUNT(*) FILTER (WHERE is_deleted = true) as deleted
      FROM whatsapp_numbers
    `;
    
    console.log('\n📈 WhatsApp instances summary:');
    console.log(`  Total instances: ${recordCount[0].total}`);
    console.log(`  Active instances: ${recordCount[0].active}`);
    console.log(`  Deleted instances: ${recordCount[0].deleted}`);

    console.log('\n✅ Soft delete columns added successfully!');
    console.log('\n🔧 Next steps:');
    console.log('1. Test the soft delete functionality');
    console.log('2. Verify that deleted instances are filtered from queries');
    console.log('3. Check that references are cleaned up properly');

  } catch (error) {
    console.error('❌ Error adding soft delete columns:', error);
    throw error;
  } finally {
    await sql.end();
    console.log('🔐 Database connection closed');
  }
}

// Execute the script
addSoftDeleteColumns()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

export { addSoftDeleteColumns };