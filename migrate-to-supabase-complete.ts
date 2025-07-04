import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./shared/schema";

// PostgreSQL local connection
const localPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const localDb = drizzle(localPool, { schema });

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

// Extract project reference from Supabase URL
const urlParts = supabaseUrl.replace('https://', '').split('.');
const projectRef = urlParts[0];
const supabaseConnectionString = `postgresql://postgres:${supabaseKey}@db.${projectRef}.supabase.co:5432/postgres`;

const supabasePool = new Pool({
  connectionString: supabaseConnectionString,
  ssl: { rejectUnauthorized: false },
});

const supabaseDb = drizzle(supabasePool, { schema });

interface MigrationStats {
  table: string;
  recordsExported: number;
  recordsImported: number;
  errors: string[];
}

async function migrateToSupabase(): Promise<void> {
  console.log('🚀 Iniciando migração completa para Supabase...');
  
  try {
    // Test connections
    console.log('🔌 Testando conexões...');
    await testConnections();
    
    // Migration order (respecting foreign keys)
    const migrationOrder = [
      { name: 'users', table: schema.users },
      { name: 'clinics', table: schema.clinics },
      { name: 'clinic_users', table: schema.clinic_users },
      { name: 'contacts', table: schema.contacts },
      { name: 'appointments', table: schema.appointments },
      { name: 'medical_records', table: schema.medical_records },
      { name: 'calendar_integrations', table: schema.calendar_integrations },
      { name: 'pipeline_stages', table: schema.pipeline_stages },
      { name: 'pipeline_opportunities', table: schema.pipeline_opportunities },
      { name: 'pipeline_history', table: schema.pipeline_history },
      { name: 'pipeline_activities', table: schema.pipeline_activities },
    ];

    const allStats: MigrationStats[] = [];
    
    for (const { name, table } of migrationOrder) {
      console.log(`\n📋 Migrando tabela: ${name}`);
      const stats = await migrateTable(name, table);
      allStats.push(stats);
    }
    
    // Print summary
    console.log('\n📊 RESUMO DA MIGRAÇÃO:');
    console.log('====================');
    let totalRecords = 0;
    let totalErrors = 0;
    
    for (const stats of allStats) {
      console.log(`${stats.table}: ${stats.recordsImported}/${stats.recordsExported} registros migrados`);
      if (stats.errors.length > 0) {
        console.log(`  ⚠️  ${stats.errors.length} erros encontrados`);
        totalErrors += stats.errors.length;
      }
      totalRecords += stats.recordsImported;
    }
    
    console.log(`\n✅ Migração concluída: ${totalRecords} registros migrados com ${totalErrors} erros`);
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    await localPool.end();
    await supabasePool.end();
  }
}

async function testConnections(): Promise<void> {
  try {
    // Test local connection
    const localClient = await localPool.connect();
    await localClient.query('SELECT NOW()');
    localClient.release();
    console.log('✅ Conexão PostgreSQL local OK');
    
    // Test Supabase connection
    const supabaseClient = await supabasePool.connect();
    await supabaseClient.query('SELECT NOW()');
    supabaseClient.release();
    console.log('✅ Conexão Supabase OK');
    
  } catch (error) {
    console.error('❌ Erro ao testar conexões:', error);
    throw error;
  }
}

async function migrateTable(tableName: string, table: any): Promise<MigrationStats> {
  const stats: MigrationStats = {
    table: tableName,
    recordsExported: 0,
    recordsImported: 0,
    errors: []
  };

  try {
    // Export data from local database
    console.log(`📤 Exportando dados de ${tableName}...`);
    const localData = await localDb.select().from(table);
    stats.recordsExported = localData.length;
    
    if (localData.length === 0) {
      console.log(`⏭️  Tabela ${tableName} está vazia, pulando...`);
      return stats;
    }
    
    console.log(`📥 Importando ${localData.length} registros para Supabase...`);
    
    // Clear existing data in Supabase
    try {
      await supabaseDb.delete(table);
      console.log(`🗑️  Dados existentes removidos de ${tableName}`);
    } catch (error) {
      console.log(`ℹ️  Nenhum dado existente em ${tableName} para remover`);
    }
    
    // Import data to Supabase in batches
    const batchSize = 100;
    for (let i = 0; i < localData.length; i += batchSize) {
      const batch = localData.slice(i, i + batchSize);
      
      try {
        await supabaseDb.insert(table).values(batch);
        stats.recordsImported += batch.length;
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} registros importados`);
      } catch (error) {
        console.error(`❌ Erro no batch ${Math.floor(i/batchSize) + 1}:`, error);
        stats.errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Erro ao migrar ${tableName}:`, error);
    stats.errors.push(`Erro geral: ${error}`);
  }

  return stats;
}

async function main() {
  try {
    await migrateToSupabase();
    console.log('\n🎉 Migração para Supabase concluída com sucesso!');
  } catch (error) {
    console.error('\n💥 Falha na migração:', error);
    process.exit(1);
  }
}

// Execute if this is the main module
main();