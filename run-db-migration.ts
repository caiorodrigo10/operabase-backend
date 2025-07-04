import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateClinicsTable() {
  console.log('🔄 Iniciando migração da tabela clinics...');
  
  try {
    // Executar as alterações na tabela clinics
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Adicionar novas colunas
        ALTER TABLE clinics 
        ADD COLUMN IF NOT EXISTS phone TEXT,
        ADD COLUMN IF NOT EXISTS phone_country_code TEXT DEFAULT '+55',
        ADD COLUMN IF NOT EXISTS celular TEXT,
        ADD COLUMN IF NOT EXISTS celular_country_code TEXT DEFAULT '+55',
        ADD COLUMN IF NOT EXISTS address_zip TEXT,
        ADD COLUMN IF NOT EXISTS work_start TEXT DEFAULT '08:00',
        ADD COLUMN IF NOT EXISTS work_end TEXT DEFAULT '18:00',
        ADD COLUMN IF NOT EXISTS lunch_start TEXT DEFAULT '12:00',
        ADD COLUMN IF NOT EXISTS lunch_end TEXT DEFAULT '13:00';

        -- Atualizar colunas existentes
        ALTER TABLE clinics 
        ALTER COLUMN address_country SET DEFAULT 'BR';

        -- Adicionar working_days como array se não existir
        ALTER TABLE clinics 
        ADD COLUMN IF NOT EXISTS working_days TEXT[] DEFAULT '{monday,tuesday,wednesday,thursday,friday}';

        -- Migrar dados existentes
        UPDATE clinics 
        SET celular = COALESCE(celular, '(11) 99999-9999')
        WHERE celular IS NULL;
      `
    });

    if (error) {
      console.error('❌ Erro na migração:', error);
      return;
    }

    console.log('✅ Migração da tabela clinics concluída com sucesso!');
    
    // Verificar a estrutura da tabela
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default')
      .eq('table_name', 'clinics');

    if (columnsError) {
      console.error('❌ Erro ao verificar colunas:', columnsError);
      return;
    }

    console.log('📋 Estrutura atual da tabela clinics:');
    columns?.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
    });

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  }
}

migrateClinicsTable();