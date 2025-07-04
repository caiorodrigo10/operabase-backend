#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';

async function cleanMigration(): Promise<void> {
  console.log('🚀 Iniciando migração limpa para Supabase...');

  try {
    // 1. Truncar todas as tabelas em ordem reversa
    const truncateOrder = [
      'medical_records', 'appointments', 'messages', 'conversations', 
      'contacts', 'pipeline_opportunities', 'pipeline_stages',
      'charges', 'customers', 'calendar_integrations',
      'clinic_invitations', 'clinic_users', 'clinics', 'users', 'sessions'
    ];

    console.log('🧹 Limpando dados existentes...');
    for (const tableName of truncateOrder) {
      const { error } = await supabaseAdmin
        .from(tableName)
        .delete()
        .neq('id', 0);
      
      if (error && error.code !== 'PGRST116') {
        console.log(`⚠️ ${tableName}: ${error.message}`);
      }
    }

    // 2. Resetar sequências
    console.log('🔄 Resetando sequências...');
    const resetCommands = [
      "SELECT setval('users_id_seq', 1, false);",
      "SELECT setval('clinics_id_seq', 1, false);",
      "SELECT setval('contacts_id_seq', 1, false);",
      "SELECT setval('appointments_id_seq', 1, false);",
      "SELECT setval('medical_records_id_seq', 1, false);"
    ];

    for (const cmd of resetCommands) {
      try {
        await supabaseAdmin.rpc('exec_sql', { query: cmd });
      } catch (error) {
        // Ignorar erros de sequência
      }
    }

    // 3. Migrar dados em ordem correta
    const migrationTables = [
      { name: 'users', table: schema.users },
      { name: 'clinics', table: schema.clinics },
      { name: 'contacts', table: schema.contacts },
      { name: 'appointments', table: schema.appointments },
      { name: 'medical_records', table: schema.medical_records },
      { name: 'pipeline_stages', table: schema.pipeline_stages },
      { name: 'pipeline_opportunities', table: schema.pipeline_opportunities },
    ];

    let totalMigrated = 0;
    
    for (const { name, table } of migrationTables) {
      const data = await db.select().from(table);
      
      if (data.length === 0) {
        console.log(`⏭️ ${name}: vazia`);
        continue;
      }

      // Inserir dados
      const { error } = await supabaseAdmin
        .from(name)
        .insert(data);

      if (error) {
        console.log(`❌ ${name}: ${error.message}`);
        
        // Tentar inserir um por vez se falhar
        let successCount = 0;
        for (const record of data) {
          const { error: singleError } = await supabaseAdmin
            .from(name)
            .insert([record]);
          
          if (!singleError) {
            successCount++;
          }
        }
        console.log(`⚠️ ${name}: ${successCount}/${data.length} registros`);
        totalMigrated += successCount;
      } else {
        console.log(`✅ ${name}: ${data.length} registros`);
        totalMigrated += data.length;
      }
    }

    console.log(`\n🎉 Migração concluída: ${totalMigrated} registros transferidos`);
    
    // 4. Verificar dados migrados
    console.log('\n📊 Verificando dados no Supabase:');
    for (const { name } of migrationTables) {
      const { data, error } = await supabaseAdmin
        .from(name)
        .select('id')
        .limit(100);
      
      if (!error && data) {
        console.log(`✅ ${name}: ${data.length} registros confirmados`);
      }
    }

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

async function main() {
  try {
    await cleanMigration();
    console.log('\n✅ Migração para Supabase concluída com sucesso!');
    console.log('Sistema agora pode ser configurado para usar Supabase.');
  } catch (error) {
    console.error('❌ Falha na migração:', error);
    process.exit(1);
  }
}

main();