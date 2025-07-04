/**
 * Script para adicionar coluna profile_picture na tabela users
 * Corrige erro de autenticação causado pela coluna ausente
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addProfilePictureColumn() {
  try {
    console.log('🔧 Verificando estrutura da tabela users...');
    
    // 1. Verificar se a coluna já existe
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'users')
      .eq('column_name', 'profile_picture');
    
    if (columnsError) {
      console.log('❌ Erro ao verificar colunas:', columnsError);
      return;
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Coluna profile_picture já existe na tabela users');
      console.log('📊 Coluna:', columns[0]);
      return;
    }
    
    console.log('⚠️ Coluna profile_picture não encontrada. Tentando adicionar...');
    
    // 2. Tentar adicionar a coluna via SQL
    console.log('\n2. Adicionando coluna profile_picture...');
    const addColumnSQL = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS profile_picture TEXT;
    `;
    
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: addColumnSQL
    });
    
    if (addError) {
      console.log('❌ Erro ao adicionar coluna (RPC não disponível):', addError);
      console.log('\n📋 COMANDO SQL MANUAL:');
      console.log('Execute este comando no Supabase SQL Editor:');
      console.log('```sql');
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;');
      console.log('```');
    } else {
      console.log('✅ Coluna profile_picture adicionada com sucesso!');
    }
    
    // 3. Verificar estrutura final da tabela users
    console.log('\n3. Verificando estrutura final da tabela users...');
    const { data: allColumns, error: allColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'users')
      .order('ordinal_position');
    
    if (allColumnsError) {
      console.log('❌ Erro ao verificar estrutura:', allColumnsError);
    } else {
      console.log('📊 Estrutura da tabela users:');
      allColumns?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    // 4. Testar query que estava falhando
    console.log('\n4. Testando query getUserByEmail...');
    const { data: testUser, error: testError } = await supabase
      .from('users')
      .select('id, email, name, profile_picture')
      .eq('email', 'cr@caiorodrigo.com.br')
      .limit(1);
    
    if (testError) {
      console.log('❌ Erro no teste:', testError);
    } else {
      console.log('✅ Query funcionando!');
      console.log('👤 Usuário encontrado:', testUser?.[0] || 'Nenhum usuário');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar correção
addProfilePictureColumn()
  .then(() => {
    console.log('\n🎉 Correção da coluna profile_picture completa!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na correção:', error);
    process.exit(1);
  });