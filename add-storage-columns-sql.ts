import { createClient } from '@supabase/supabase-js';

async function addStorageColumns() {
  console.log('🔧 Adding missing Supabase Storage columns to message_attachments...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Supabase credentials not found');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Add storage columns one by one
    const sqlCommands = [
      `ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS storage_bucket VARCHAR(100) DEFAULT 'conversation-attachments';`,
      `ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS storage_path VARCHAR(500);`,
      `ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS public_url TEXT;`,
      `ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS signed_url TEXT;`,
      `ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS signed_url_expires TIMESTAMP;`,
      `CREATE INDEX IF NOT EXISTS idx_message_attachments_storage_path ON message_attachments(storage_path);`
    ];
    
    for (const sql of sqlCommands) {
      console.log(`📝 Executing: ${sql.slice(0, 80)}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { query: sql });
      
      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        console.log(`✅ Success`);
      }
    }
    
    console.log('🔧 Testing column access after creation...');
    
    // Test if columns now exist by querying
    const { data: testData, error: testError } = await supabase
      .from('message_attachments')
      .select('storage_bucket, storage_path, signed_url')
      .limit(1);
      
    if (testError) {
      console.log('❌ Columns still not accessible:', testError.message);
    } else {
      console.log('✅ Storage columns now accessible!');
    }
    
  } catch (error) {
    console.error('❌ Failed to add columns:', error.message);
  }
}

addStorageColumns();