import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixSequence() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing contacts sequence...');
    
    // Get current max ID
    const maxResult = await client.query('SELECT COALESCE(MAX(id), 0) as max_id FROM contacts');
    const maxId = maxResult.rows[0].max_id;
    console.log(`Current max ID: ${maxId}`);
    
    // Reset sequence to max + 1
    const nextId = maxId + 1;
    await client.query(`SELECT setval('contacts_id_seq', $1, false)`, [nextId]);
    console.log(`✅ Sequence reset to ${nextId}`);
    
    // Test the sequence
    const seqResult = await client.query('SELECT nextval(\'contacts_id_seq\') as next_id');
    const nextSeqId = seqResult.rows[0].next_id;
    console.log(`Next sequence ID will be: ${nextSeqId}`);
    
    // Test creating a contact
    console.log('🧪 Testing contact creation...');
    const testResult = await client.query(`
      INSERT INTO contacts (clinic_id, name, phone, status, source)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name
    `, [1, 'Teste Sequência', '+55 11 98765-4321', 'novo', 'teste']);
    
    const testContact = testResult.rows[0];
    console.log(`✅ Test contact created with ID: ${testContact.id}`);
    
    // Clean up test contact
    await client.query('DELETE FROM contacts WHERE id = $1', [testContact.id]);
    console.log('🧹 Test contact cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSequence();