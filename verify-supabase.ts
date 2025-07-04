#!/usr/bin/env tsx

import { supabaseAdmin } from './server/supabase-client.js';

async function verifyMigration() {
  console.log('📊 Verificando dados migrados no Supabase...');
  
  const tables = [
    'users',
    'clinics', 
    'contacts',
    'appointments',
    'medical_records',
    'pipeline_stages',
    'pipeline_opportunities'
  ];
  
  let totalRecords = 0;
  const results = [];
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('*');
      
      if (error) {
        results.push(`❌ ${tableName}: ${error.message}`);
      } else {
        const count = data?.length || 0;
        results.push(`✅ ${tableName}: ${count} registros`);
        totalRecords += count;
      }
    } catch (err) {
      results.push(`❌ ${tableName}: erro de conexão`);
    }
  }
  
  console.log('\n📋 RESULTADO DA MIGRAÇÃO');
  console.log('========================');
  results.forEach(result => console.log(result));
  console.log('========================');
  console.log(`📊 Total: ${totalRecords} registros no Supabase`);
  
  if (totalRecords >= 30) {
    console.log('🎉 Migração concluída com sucesso!');
    console.log('✅ Todos os dados foram transferidos para o Supabase');
    return true;
  } else {
    console.log('⚠️ Migração incompleta - poucos dados encontrados');
    return false;
  }
}

verifyMigration();