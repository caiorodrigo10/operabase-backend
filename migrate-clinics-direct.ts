import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.SUPABASE_POOLER_URL!.replace('#', '%23');
const sql = postgres(connectionString);
const db = drizzle(sql);

async function migrateClinicsTable() {
  console.log('🔄 Iniciando migração da tabela clinics...');
  
  try {
    // Adicionar novas colunas
    await sql`
      ALTER TABLE clinics 
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS phone_country_code TEXT DEFAULT '+55',
      ADD COLUMN IF NOT EXISTS celular TEXT,
      ADD COLUMN IF NOT EXISTS celular_country_code TEXT DEFAULT '+55',
      ADD COLUMN IF NOT EXISTS address_zip TEXT,
      ADD COLUMN IF NOT EXISTS work_start TEXT DEFAULT '08:00',
      ADD COLUMN IF NOT EXISTS work_end TEXT DEFAULT '18:00',
      ADD COLUMN IF NOT EXISTS lunch_start TEXT DEFAULT '12:00',
      ADD COLUMN IF NOT EXISTS lunch_end TEXT DEFAULT '13:00'
    `;

    console.log('✅ Colunas básicas adicionadas');

    // Adicionar address_country se não existir e definir default
    await sql`
      ALTER TABLE clinics 
      ADD COLUMN IF NOT EXISTS address_country TEXT DEFAULT 'BR'
    `;

    console.log('✅ Coluna address_country adicionada/atualizada');

    // Adicionar working_days como array
    await sql`
      ALTER TABLE clinics 
      ADD COLUMN IF NOT EXISTS working_days TEXT[] DEFAULT '{monday,tuesday,wednesday,thursday,friday}'
    `;

    console.log('✅ Coluna working_days adicionada');

    // Migrar dados existentes - definir celular padrão se null
    await sql`
      UPDATE clinics 
      SET celular = '(11) 99999-9999'
      WHERE celular IS NULL
    `;

    console.log('✅ Dados migrados');

    // Verificar a estrutura da tabela
    const columns = await sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'clinics'
      ORDER BY ordinal_position
    `;

    console.log('📋 Estrutura atual da tabela clinics:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'}, nullable: ${col.is_nullable})`);
    });

    console.log('✅ Migração da tabela clinics concluída com sucesso!');
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    await sql.end();
    process.exit(1);
  }
}

migrateClinicsTable();