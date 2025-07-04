import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

async function checkClinicSchema() {
  try {
    // Try to get one clinic record to see the actual structure
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Error querying clinics:', error);
    } else {
      console.log('Clinics table structure (sample data):', data);
    }

    // Try to insert a minimal clinic record to see required fields
    const { data: insertData, error: insertError } = await supabase
      .from('clinics')
      .insert([{
        name: 'Test Clinic'
      }])
      .select()
      .single();

    if (insertError) {
      console.log('Insert error (shows required fields):', insertError);
    } else {
      console.log('Successfully inserted clinic:', insertData);
      
      // Clean up the test record
      await supabase
        .from('clinics')
        .delete()
        .eq('id', insertData.id);
    }

  } catch (error) {
    console.error('Schema check error:', error);
  }
}

checkClinicSchema();