import { pool } from './server/db.ts';

async function createProfileTable() {
  console.log('Creating profiles table and user profile...');
  
  const client = await pool.connect();
  
  try {
    // Create profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id uuid PRIMARY KEY,
        name text,
        email text,
        role text DEFAULT 'user',
        clinic_id integer,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
    `);
    
    console.log('✅ Profiles table created');
    
    // Insert user profile
    await client.query(`
      INSERT INTO profiles (id, name, email, role, clinic_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        clinic_id = EXCLUDED.clinic_id,
        updated_at = now();
    `, [
      '3cd96e6d-81f2-4c8a-a54d-3abac77b37a4',
      'Caio Rodrigo',
      'cr@caiorodrigo.com.br',
      'super_admin',
      1
    ]);
    
    console.log('✅ User profile created/updated successfully');
    
    // Verify the profile was created
    const result = await client.query('SELECT * FROM profiles WHERE id = $1', [
      '3cd96e6d-81f2-4c8a-a54d-3abac77b37a4'
    ]);
    
    console.log('Profile data:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createProfileTable().catch(console.error);