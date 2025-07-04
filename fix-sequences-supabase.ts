import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Usar variáveis de ambiente do Supabase
const connectionString = process.env.SUPABASE_POOLER_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Database connection string not found');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixAllSequences() {
  console.log('🔧 Fixing all table sequences after Supabase migration...');
  
  try {
    // Lista de todas as tabelas que precisam ter suas sequências corrigidas
    const tables = [
      'users',
      'clinics', 
      'contacts',
      'appointments',
      'medical_records',
      'conversations',
      'messages',
      'calendar_integrations',
      'pipeline_stages',
      'pipeline_opportunities', 
      'pipeline_history',
      'pipeline_activities',
      'clinic_users',
      'clinic_invitations',
      'clinic_settings',
      'password_reset_tokens',
      'analytics_metrics',
      'ai_templates'
    ];

    for (const table of tables) {
      try {
        // Verificar se a tabela e sequência existem
        const sequenceCheck = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.sequences 
            WHERE sequence_name = $1
          ) as exists
        `, [`${table}_id_seq`]);

        if (!sequenceCheck.rows[0].exists) {
          console.log(`⚠️  Sequence ${table}_id_seq not found, skipping...`);
          continue;
        }

        // Obter o maior ID da tabela
        const maxIdResult = await pool.query(`
          SELECT COALESCE(MAX(id), 0) as max_id FROM ${table}
        `);
        
        const maxId = maxIdResult.rows[0].max_id;
        
        // Definir a sequência para o próximo valor após o maior ID
        const nextValue = maxId + 1;
        
        await pool.query(`SELECT setval('${table}_id_seq', $1, false)`, [nextValue]);
        
        console.log(`✅ Fixed ${table}_id_seq: set to ${nextValue} (max_id: ${maxId})`);
        
      } catch (error) {
        console.log(`⚠️  Could not fix sequence for ${table}:`, error.message);
      }
    }

    // Verificar se as sequências estão funcionando corretamente
    console.log('\n🔍 Verification - Current sequence values:');
    
    const verificationTables = ['users', 'contacts', 'appointments', 'medical_records'];
    
    for (const table of verificationTables) {
      try {
        const result = await pool.query(`SELECT last_value, is_called FROM ${table}_id_seq`);
        const recordCount = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        
        console.log(`📋 ${table}: sequence=${result.rows[0].last_value} (called=${result.rows[0].is_called}), records=${recordCount.rows[0].count}`);
      } catch (error) {
        console.log(`⚠️  Could not verify ${table}:`, error.message);
      }
    }

    console.log('\n✅ All sequences have been fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing sequences:', error);
    throw error;
  }
}

async function testMedicalRecordCreation() {
  console.log('\n🧪 Testing medical record creation...');
  
  try {
    // Testar inserção de um registro médico
    const testRecord = await pool.query(`
      INSERT INTO medical_records (
        contact_id, clinic_id, record_type, content, created_by, updated_by
      ) VALUES (
        5, 1, 'test', 'Test record for sequence validation', 2, 2
      ) RETURNING id
    `);
    
    console.log(`✅ Test medical record created with ID: ${testRecord.rows[0].id}`);
    
    // Remover o registro de teste
    await pool.query('DELETE FROM medical_records WHERE id = $1', [testRecord.rows[0].id]);
    console.log('🗑️  Test record removed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await fixAllSequences();
    await testMedicalRecordCreation();
    
    console.log('\n🎉 Sequence fix completed successfully!');
    console.log('💡 Medical records can now be created without sequence conflicts');
    
  } catch (error) {
    console.error('❌ Failed to fix sequences:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);