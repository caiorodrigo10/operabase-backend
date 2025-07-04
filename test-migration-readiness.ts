#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';

async function testMigrationReadiness() {
  console.log('🔍 Verificando prontidão para migração...');
  
  // 1. Testar PostgreSQL atual
  console.log('\n📊 Testando PostgreSQL atual...');
  const postgresStats = await getPostgresStats();
  
  // 2. Testar conexão Supabase
  console.log('\n💚 Testando conexão Supabase...');
  const supabaseReady = await testSupabaseConnection();
  
  // 3. Verificar estrutura no Supabase
  console.log('\n📋 Verificando estrutura no Supabase...');
  const tablesExist = await checkSupabaseTables();
  
  // 4. Relatório final
  console.log('\n📋 RELATÓRIO DE PRONTIDÃO');
  console.log('========================');
  console.log(`PostgreSQL: ${postgresStats.connected ? '✅' : '❌'} (${postgresStats.totalRecords} registros)`);
  console.log(`Supabase: ${supabaseReady ? '✅' : '❌'} Conexão`);
  console.log(`Tabelas no Supabase: ${tablesExist ? '✅' : '❌'}`);
  
  if (postgresStats.connected && supabaseReady && tablesExist) {
    console.log('\n🎉 Sistema pronto para migração!');
    console.log('Execute: tsx migrate-data-only.ts');
  } else if (postgresStats.connected && supabaseReady && !tablesExist) {
    console.log('\n⚠️  Execute primeiro o SQL no Supabase:');
    console.log('1. Copie o conteúdo de schema-supabase.sql');
    console.log('2. Cole no SQL Editor do Supabase');
    console.log('3. Execute o SQL');
  } else {
    console.log('\n❌ Problemas encontrados - verifique as configurações');
  }
  
  return { postgresStats, supabaseReady, tablesExist };
}

async function getPostgresStats() {
  try {
    const tables = [
      { name: 'users', table: schema.users },
      { name: 'clinics', table: schema.clinics },
      { name: 'contacts', table: schema.contacts },
      { name: 'appointments', table: schema.appointments },
      { name: 'medical_records', table: schema.medical_records },
    ];
    
    let totalRecords = 0;
    
    for (const { name, table } of tables) {
      const data = await db.select().from(table);
      console.log(`  ${name}: ${data.length} registros`);
      totalRecords += data.length;
    }
    
    return { connected: true, totalRecords };
  } catch (error) {
    console.error('❌ Erro no PostgreSQL:', error);
    return { connected: false, totalRecords: 0 };
  }
}

async function testSupabaseConnection() {
  try {
    const { error } = await supabaseAdmin
      .from('_test')
      .select('*')
      .limit(1);
    
    // Erro esperado se tabela não existe
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão Supabase:', error);
    return false;
  }
}

async function checkSupabaseTables() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      return false; // Tabela não existe
    }
    
    return true; // Tabela existe
  } catch (error) {
    return false;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testMigrationReadiness().catch(console.error);
}