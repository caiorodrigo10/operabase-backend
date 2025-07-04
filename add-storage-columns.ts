import { createClient } from '@supabase/supabase-js';

async function addStorageColumns() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase credentials not found');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔧 Adding Supabase Storage columns to message_attachments...');

  try {
    // Add the storage columns
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE message_attachments 
        ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
        ADD COLUMN IF NOT EXISTS storage_path TEXT,
        ADD COLUMN IF NOT EXISTS public_url TEXT,
        ADD COLUMN IF NOT EXISTS signed_url TEXT,
        ADD COLUMN IF NOT EXISTS signed_url_expires TIMESTAMP;

        -- Add indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_message_attachments_storage_path ON message_attachments(storage_path);
        CREATE INDEX IF NOT EXISTS idx_message_attachments_storage_bucket ON message_attachments(storage_bucket);
      `
    });

    if (error) {
      console.error('❌ Error adding columns:', error);
      
      // Try alternative approach using direct SQL execution
      console.log('🔄 Trying alternative approach...');
      
      const alterQueries = [
        'ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS storage_bucket TEXT',
        'ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT', 
        'ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS public_url TEXT',
        'ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS signed_url TEXT',
        'ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS signed_url_expires TIMESTAMP'
      ];

      for (const query of alterQueries) {
        const { error: alterError } = await supabase.rpc('exec_sql', { sql: query });
        if (alterError) {
          console.error(`❌ Error executing: ${query}`, alterError);
        } else {
          console.log(`✅ Executed: ${query}`);
        }
      }
      
    } else {
      console.log('✅ Storage columns added successfully');
    }

    // Verify columns exist
    const { data: columns, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'message_attachments' 
        AND column_name IN ('storage_bucket', 'storage_path', 'public_url', 'signed_url', 'signed_url_expires')
        ORDER BY column_name;
      `
    });

    if (verifyError) {
      console.error('❌ Error verifying columns:', verifyError);
    } else {
      console.log('📋 Current storage columns:', columns);
    }

  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

addStorageColumns();