import { Pool } from 'pg';

async function fixAnamnesisTemplate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Update anamnesis ID 21 to use the correct "Anamnese Geral" template (ID 357)
    const result = await pool.query(`
      UPDATE anamnesis_responses 
      SET template_id = 357 
      WHERE id = 21
    `);
    
    console.log('✅ Fixed anamnesis template assignment');
    console.log('Updated rows:', result.rowCount);
    
    // Verify the update
    const verification = await pool.query(`
      SELECT ar.id, ar.template_id, at.name as template_name
      FROM anamnesis_responses ar
      LEFT JOIN anamnesis_templates at ON ar.template_id = at.id
      WHERE ar.id = 21
    `);
    
    console.log('Verification:', verification.rows[0]);
    
  } catch (error) {
    console.error('Error fixing template:', error);
  } finally {
    await pool.end();
  }
}

fixAnamnesisTemplate();