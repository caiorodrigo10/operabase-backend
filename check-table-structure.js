import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkTableStructure() {
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
    console.log('🔍 Checking message_attachments table structure...');
    
    // Try to select from table to see what columns exist
    const { data: sampleData, error: sampleError } = await supabase
      .from('message_attachments')
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.log('❌ Cannot access table:', sampleError.message);
    } else {
      console.log('✅ Sample record structure:');
      if (sampleData && sampleData.length > 0) {
        console.log('📋 Columns found:', Object.keys(sampleData[0]));
        console.log('📄 Sample record:', sampleData[0]);
      } else {
        console.log('📋 Table exists but no records found');
        
        // Try to get column info via a different method
        const { data: emptyData, error: emptyError } = await supabase
          .from('message_attachments')
          .select('*')
          .eq('id', -1); // Non-existent ID to get empty result with column structure
          
        if (!emptyError) {
          console.log('📋 Empty query successful - table structure accessible');
        }
      }
    }

  } catch (err) {
    console.error('❌ Failed to check table:', err.message);
  }
}

checkTableStructure();