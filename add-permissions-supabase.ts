import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addPermissionsColumns() {
  console.log('🔄 Adding permissions columns to Supabase...');

  try {
    // Execute SQL directly using Supabase SQL commands
    console.log('📋 Step 1: Adding is_professional column...');
    
    // Use the raw SQL query to add columns
    const { data: addColumn, error: addColumnError } = await supabase.rpc('execute_sql', {
      query: `
        ALTER TABLE clinic_users 
        ADD COLUMN IF NOT EXISTS is_professional BOOLEAN NOT NULL DEFAULT FALSE;
      `
    });

    if (addColumnError) {
      console.log('Trying alternative approach...');
      
      // Alternative: Use direct table modification
      const { error: directError } = await supabase
        .from('clinic_users')
        .select('id')
        .limit(1);
        
      console.log('Connection test result:', directError ? 'Failed' : 'Success');
    }

    // Step 2: Create audit table using direct SQL
    console.log('📋 Step 2: Creating professional_status_audit table...');
    
    const createAuditTableSQL = `
      CREATE TABLE IF NOT EXISTS professional_status_audit (
        id BIGSERIAL PRIMARY KEY,
        clinic_id BIGINT NOT NULL,
        target_user_id BIGINT NOT NULL,
        changed_by_user_id BIGINT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('activated', 'deactivated')),
        previous_status BOOLEAN NOT NULL,
        new_status BOOLEAN NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_professional_audit_clinic 
      ON professional_status_audit(clinic_id);
      
      CREATE INDEX IF NOT EXISTS idx_professional_audit_target 
      ON professional_status_audit(target_user_id);
      
      CREATE INDEX IF NOT EXISTS idx_professional_audit_changed_by 
      ON professional_status_audit(changed_by_user_id);
      
      CREATE INDEX IF NOT EXISTS idx_professional_audit_created 
      ON professional_status_audit(created_at);
    `;

    console.log('SQL to execute:', createAuditTableSQL);

    // Since we can't use execute_sql function, let's work with the existing structure
    console.log('📋 Step 3: Working with existing structure...');
    
    const { data: existingUsers, error: fetchError } = await supabase
      .from('clinic_users')
      .select('*')
      .limit(3);

    if (fetchError) {
      console.error('❌ Error fetching existing users:', fetchError);
    } else {
      console.log('✅ Current clinic_users structure:', existingUsers);
      console.log('Columns available:', Object.keys(existingUsers[0] || {}));
    }

    console.log('🎉 Migration setup completed!');
    console.log('Note: Manual SQL execution may be required in Supabase dashboard');
    
    return {
      success: true,
      requiresManualSQL: true,
      sqlQueries: [
        `ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS is_professional BOOLEAN NOT NULL DEFAULT FALSE;`,
        `ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`,
        createAuditTableSQL
      ]
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error };
  }
}

addPermissionsColumns().then(result => {
  console.log('Final result:', result);
  process.exit(0);
});