#!/usr/bin/env tsx

/**
 * Script para aplicar colunas de soft delete usando a conexão existente do sistema
 */

import { sql } from 'drizzle-orm';
import { getStorage } from './server/storage.js';

async function applySoftDeleteColumns() {
  console.log('🔗 Using existing Supabase connection from system...');
  
  try {
    // Get the storage instance which has the Supabase connection
    const storage = await getStorage();
    
    // Access the database instance from PostgreSQL storage
    const db = (storage as any).db;

    console.log('✅ Database connection established');
    console.log('🏗️ Applying soft delete columns to whatsapp_numbers table...');

    // Check existing columns first
    const existingColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_numbers' 
      AND column_name IN ('is_deleted', 'deleted_at', 'deleted_by_user_id')
    `);

    const existingColumnNames = existingColumns.rows.map((row: any) => row.column_name);
    console.log('📋 Existing soft delete columns:', existingColumnNames);

    // Add is_deleted column if not exists
    if (!existingColumnNames.includes('is_deleted')) {
      await db.execute(sql`
        ALTER TABLE whatsapp_numbers 
        ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added is_deleted column');
    } else {
      console.log('⚠️ is_deleted column already exists');
    }

    // Add deleted_at column if not exists
    if (!existingColumnNames.includes('deleted_at')) {
      await db.execute(sql`
        ALTER TABLE whatsapp_numbers 
        ADD COLUMN deleted_at TIMESTAMP
      `);
      console.log('✅ Added deleted_at column');
    } else {
      console.log('⚠️ deleted_at column already exists');
    }

    // Add deleted_by_user_id column if not exists
    if (!existingColumnNames.includes('deleted_by_user_id')) {
      await db.execute(sql`
        ALTER TABLE whatsapp_numbers 
        ADD COLUMN deleted_by_user_id INTEGER
      `);
      console.log('✅ Added deleted_by_user_id column');
    } else {
      console.log('⚠️ deleted_by_user_id column already exists');
    }

    // Create index on is_deleted for performance
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_deleted 
        ON whatsapp_numbers(is_deleted)
      `);
      console.log('✅ Created performance index on is_deleted');
    } catch (indexError) {
      console.log('⚠️ Index creation failed or already exists:', (indexError as Error).message);
    }

    // Update existing records to have is_deleted = false
    const updateResult = await db.execute(sql`
      UPDATE whatsapp_numbers 
      SET is_deleted = FALSE 
      WHERE is_deleted IS NULL
    `);
    console.log(`✅ Updated ${(updateResult as any).rowCount || 0} existing records`);

    // Show current table structure
    console.log('\n📊 Current table structure:');
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_numbers'
      ORDER BY ordinal_position
    `);
    
    tableInfo.rows.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Show record counts
    const recordCount = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_deleted = false OR is_deleted IS NULL) as active,
        COUNT(*) FILTER (WHERE is_deleted = true) as deleted
      FROM whatsapp_numbers
    `);
    
    const stats = recordCount.rows[0] as any;
    console.log('\n📈 WhatsApp instances summary:');
    console.log(`  Total: ${stats.total}`);
    console.log(`  Active: ${stats.active}`);
    console.log(`  Deleted: ${stats.deleted}`);

    console.log('\n✅ Soft delete migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

applySoftDeleteColumns()
  .then(() => {
    console.log('🎉 Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

export { applySoftDeleteColumns };