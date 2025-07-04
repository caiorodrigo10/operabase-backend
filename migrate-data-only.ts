#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';

interface MigrationStats {
  table: string;
  recordsExported: number;
  recordsImported: number;
  errors: string[];
}

async function migrateDataOnly(): Promise<void> {
  console.log('🚀 Iniciando migração de dados para Supabase...');
  
  const stats: MigrationStats[] = [];

  // Ordem de migração respeitando dependências
  const migrationOrder = [
    { name: 'users', table: schema.users },
    { name: 'clinics', table: schema.clinics },
    { name: 'clinic_users', table: schema.clinic_users },
    { name: 'clinic_invitations', table: schema.clinic_invitations },
    { name: 'contacts', table: schema.contacts },
    { name: 'conversations', table: schema.conversations },
    { name: 'messages', table: schema.messages },
    { name: 'appointments', table: schema.appointments },
    { name: 'medical_records', table: schema.medical_records },
    { name: 'pipeline_stages', table: schema.pipeline_stages },
    { name: 'pipeline_opportunities', table: schema.pipeline_opportunities },
    { name: 'customers', table: schema.customers },
    { name: 'charges', table: schema.charges },
    { name: 'calendar_integrations', table: schema.calendar_integrations },
  ];

  for (const { name, table } of migrationOrder) {
    const tableStat = await migrateTable(name, table);
    stats.push(tableStat);
  }

  // Exibir relatório
  console.log('\n📊 RELATÓRIO DE MIGRAÇÃO');
  console.log('========================');
  
  let totalExported = 0;
  let totalImported = 0;
  let totalErrors = 0;

  for (const stat of stats) {
    totalExported += stat.recordsExported;
    totalImported += stat.recordsImported;
    totalErrors += stat.errors.length;

    const status = stat.recordsExported === stat.recordsImported ? '✅' : '⚠️';
    console.log(`${status} ${stat.table}: ${stat.recordsImported}/${stat.recordsExported} registros`);
    
    if (stat.errors.length > 0) {
      console.log(`   Erros: ${stat.errors.length}`);
      stat.errors.forEach(error => console.log(`   - ${error}`));
    }
  }

  console.log('========================');
  console.log(`📊 Total: ${totalImported}/${totalExported} registros migrados`);
  console.log(`❌ Total de erros: ${totalErrors}`);
  
  if (totalImported === totalExported && totalErrors === 0) {
    console.log('🎉 Migração 100% bem-sucedida!');
  } else if (totalImported > 0) {
    console.log('⚠️  Migração parcialmente bem-sucedida');
  } else {
    console.log('❌ Falha na migração');
  }
}

async function migrateTable(tableName: string, table: any): Promise<MigrationStats> {
  console.log(`📋 Migrando tabela: ${tableName}...`);
  
  const stats: MigrationStats = {
    table: tableName,
    recordsExported: 0,
    recordsImported: 0,
    errors: []
  };

  try {
    // Exportar dados do PostgreSQL atual
    const data = await db.select().from(table);
    stats.recordsExported = data.length;

    if (data.length === 0) {
      console.log(`⏭️  Tabela ${tableName} está vazia, pulando...`);
      return stats;
    }

    // Limpar dados existentes no Supabase (opcional)
    const { error: deleteError } = await supabaseAdmin
      .from(tableName)
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.log(`⚠️  Aviso ao limpar ${tableName}: ${deleteError.message}`);
    }

    // Importar para Supabase em lotes
    const batchSize = 50;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await supabaseAdmin
        .from(tableName)
        .insert(batch);

      if (error) {
        stats.errors.push(`Erro no lote ${i}-${i + batch.length}: ${error.message}`);
        console.error(`❌ Erro ao inserir lote ${i}-${i + batch.length} na tabela ${tableName}:`, error.message);
        
        // Tentar inserir um por vez se o lote falhar
        for (const record of batch) {
          const { error: singleError } = await supabaseAdmin
            .from(tableName)
            .insert([record]);
          
          if (!singleError) {
            stats.recordsImported += 1;
          } else {
            stats.errors.push(`Erro no registro ${record.id || 'sem ID'}: ${singleError.message}`);
          }
        }
      } else {
        stats.recordsImported += batch.length;
        console.log(`✅ Migrados ${Math.min(i + batchSize, data.length)}/${data.length} registros de ${tableName}`);
      }
    }

  } catch (error) {
    stats.errors.push(`Erro geral: ${error}`);
    console.error(`❌ Erro ao migrar tabela ${tableName}:`, error);
  }

  return stats;
}

async function testSupabaseTables(): Promise<boolean> {
  try {
    console.log('🔍 Verificando se as tabelas existem no Supabase...');
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('❌ Tabelas não encontradas no Supabase.');
      console.log('📝 Execute primeiro o SQL do arquivo schema-supabase.sql no painel do Supabase:');
      console.log('   https://supabase.com/dashboard/project/[seu-projeto]/sql');
      return false;
    }

    console.log('✅ Tabelas encontradas no Supabase');
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
    return false;
  }
}

async function main() {
  try {
    const tablesExist = await testSupabaseTables();
    if (!tablesExist) {
      process.exit(1);
    }

    await migrateDataOnly();
    console.log('✅ Migração de dados concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

main();