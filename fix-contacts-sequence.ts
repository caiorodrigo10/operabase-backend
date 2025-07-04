import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixContactsSequence() {
  try {
    console.log('🔧 Fixing contacts table sequence...');
    
    // Get the current max ID from contacts table
    const { data: maxIdResult, error: maxIdError } = await supabase
      .rpc('get_max_contact_id');
    
    if (maxIdError) {
      console.log('Creating function to get max ID...');
      // Create the function if it doesn't exist
      const { error: createFunctionError } = await supabase
        .rpc('exec_sql', {
          sql: `
            CREATE OR REPLACE FUNCTION get_max_contact_id()
            RETURNS INTEGER AS $$
            BEGIN
              RETURN COALESCE((SELECT MAX(id) FROM contacts), 0);
            END;
            $$ LANGUAGE plpgsql;
          `
        });
      
      if (createFunctionError) {
        console.log('Trying direct SQL approach...');
        // Direct sequence reset
        const { error: sequenceError } = await supabase
          .rpc('exec_sql', {
            sql: `SELECT setval('contacts_id_seq', COALESCE((SELECT MAX(id) FROM contacts), 0) + 1, false);`
          });
        
        if (sequenceError) {
          console.error('Sequence reset error:', sequenceError);
          // Try alternative approach
          const { data: contacts } = await supabase
            .from('contacts')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);
          
          const maxId = contacts && contacts.length > 0 ? contacts[0].id : 0;
          console.log(`Max contact ID found: ${maxId}`);
          
          // Reset sequence manually
          const { error: resetError } = await supabase
            .rpc('exec_sql', {
              sql: `ALTER SEQUENCE contacts_id_seq RESTART WITH ${maxId + 1};`
            });
          
          if (resetError) {
            console.error('Failed to reset sequence:', resetError);
          } else {
            console.log('✅ Sequence reset successfully');
          }
        } else {
          console.log('✅ Sequence fixed via direct SQL');
        }
      }
    }
    
    // Test creating a contact
    console.log('🧪 Testing contact creation...');
    const testContact = {
      clinic_id: 1,
      name: 'Teste Sequência',
      phone: '+55 11 98765-4321',
      email: 'teste.seq@email.com',
      status: 'novo',
      source: 'teste'
    };
    
    const { data: newContact, error: createError } = await supabase
      .from('contacts')
      .insert([testContact])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Contact creation failed:', createError);
    } else {
      console.log('✅ Contact created successfully:', newContact);
      
      // Clean up test contact
      await supabase
        .from('contacts')
        .delete()
        .eq('id', newContact.id);
      
      console.log('🧹 Test contact cleaned up');
    }
    
  } catch (error) {
    console.error('Error fixing sequence:', error);
  }
}

fixContactsSequence();