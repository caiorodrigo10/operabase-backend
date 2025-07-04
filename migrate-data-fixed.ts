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

async function migrateDataWithDependencies(): Promise<void> {
  console.log('🚀 Iniciando migração corrigida para Supabase...');
  
  const stats: MigrationStats[] = [];

  // Ordem corrigida respeitando dependências
  const migrationOrder = [
    { name: 'users', table: schema.users },
    { name: 'clinics', table: schema.clinics },
    { name: 'contacts', table: schema.contacts },
    { name: 'appointments', table: schema.appointments },
    { name: 'medical_records', table: schema.medical_records },
    { name: 'pipeline_stages', table: schema.pipeline_stages },
    { name: 'pipeline_opportunities', table: schema.pipeline_opportunities },
    { name: 'customers', table: schema.customers },
    { name: 'charges', table: schema.charges },
    { name: 'calendar_integrations', table: schema.calendar_integrations },
    // Migrar tabelas de relacionamento por último
    { name: 'clinic_users', table: schema.clinic_users },
    { name: 'clinic_invitations', table: schema.clinic_invitations },
  ];

  for (const { name, table } of migrationOrder) {
    const tableStat = await migrateTableFixed(name, table);
    stats.push(tableStat);
  }

  // Exibir relatório
  console.log('\n📊 RELATÓRIO DE MIGRAÇÃO CORRIGIDA');
  console.log('================================');
  
  let totalExported = 0;
  let totalImported = 0;
  let totalErrors = 0;

  for (const stat of stats) {
    totalExported += stat.recordsExported;
    totalImported += stat.recordsImported;
    totalErrors += stat.errors.length;

    const status = stat.recordsExported === stat.recordsImported ? '✅' : stat.recordsImported > 0 ? '⚠️' : '❌';
    console.log(`${status} ${stat.table}: ${stat.recordsImported}/${stat.recordsExported} registros`);
    
    if (stat.errors.length > 0) {
      console.log(`   Erros: ${stat.errors.length}`);
      stat.errors.slice(0, 3).forEach(error => console.log(`   - ${error}`));
    }
  }

  console.log('================================');
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

async function migrateTableFixed(tableName: string, table: any): Promise<MigrationStats> {
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

    // Limpar dados existentes no Supabase
    const { error: deleteError } = await supabaseAdmin
      .from(tableName)
      .delete()
      .neq('id', 0);

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.log(`⚠️  Aviso ao limpar ${tableName}: ${deleteError.message}`);
    }

    // Filtrar dados válidos
    const validData = data.filter(record => {
      // Validações específicas para cada tabela
      if (tableName === 'clinic_users') {
        return record.clinic_id && record.user_id;
      }
      if (tableName === 'appointments') {
        return record.contact_id && record.clinic_id && record.user_id;
      }
      if (tableName === 'medical_records') {
        return record.contact_id && record.clinic_id;
      }
      return true;
    });

    if (validData.length !== data.length) {
      console.log(`⚠️  Filtrados ${data.length - validData.length} registros inválidos de ${tableName}`);
    }

    // Importar em lotes menores
    const batchSize = 20;
    for (let i = 0; i < validData.length; i += batchSize) {
      const batch = validData.slice(i, i + batchSize);
      
      // Tentar inserir o lote
      const { error } = await supabaseAdmin
        .from(tableName)
        .insert(batch);

      if (error) {
        // Se lote falhar, tentar um por vez
        console.log(`⚠️  Erro no lote ${i}-${i + batch.length}, tentando individualmente...`);
        
        for (const record of batch) {
          const { error: singleError } = await supabaseAdmin
            .from(tableName)
            .insert([record]);
          
          if (!singleError) {
            stats.recordsImported += 1;
          } else {
            stats.errors.push(`Registro ${record.id || 'sem ID'}: ${singleError.message}`);
          }
        }
      } else {
        stats.recordsImported += batch.length;
        console.log(`✅ Migrados ${Math.min(i + batchSize, validData.length)}/${validData.length} registros de ${tableName}`);
      }
    }

  } catch (error) {
    stats.errors.push(`Erro geral: ${error}`);
    console.error(`❌ Erro ao migrar tabela ${tableName}:`, error);
  }

  return stats;
}

async function main() {
  try {
    // Verificar se tabelas existem
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('❌ Tabelas não encontradas no Supabase.');
      console.log('Execute primeiro o SQL no painel do Supabase.');
      process.exit(1);
    }

    console.log('✅ Tabelas encontradas no Supabase');
    await migrateDataWithDependencies();
    console.log('✅ Migração concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

main();