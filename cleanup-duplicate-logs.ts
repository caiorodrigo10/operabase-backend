import { db } from './server/db';
import { system_logs } from './shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Script para limpar logs duplicados históricos e corrigir o middleware
 */
async function cleanupDuplicateLogs() {
  try {
    console.log('🧹 Iniciando limpeza de logs duplicados...');
    
    // 1. Identificar duplicatas por conteúdo
    const duplicates = await db.execute(sql`
      WITH duplicate_groups AS (
        SELECT 
          entity_type,
          entity_id,
          action_type,
          clinic_id,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY entity_type, entity_id, action_type, clinic_id, 
            DATE_TRUNC('second', created_at)
            ORDER BY id ASC
          ) as rn,
          COUNT(*) OVER (
            PARTITION BY entity_type, entity_id, action_type, clinic_id, 
            DATE_TRUNC('second', created_at)
          ) as duplicate_count
        FROM system_logs
      )
      SELECT 
        sl.id,
        sl.entity_type,
        sl.entity_id,
        sl.action_type,
        sl.clinic_id,
        sl.created_at,
        dg.duplicate_count
      FROM system_logs sl
      JOIN duplicate_groups dg ON 
        sl.entity_type = dg.entity_type AND
        sl.entity_id = dg.entity_id AND
        sl.action_type = dg.action_type AND
        sl.clinic_id = dg.clinic_id AND
        DATE_TRUNC('second', sl.created_at) = DATE_TRUNC('second', dg.created_at)
      WHERE dg.rn > 1 AND dg.duplicate_count > 1
      ORDER BY sl.entity_type, sl.entity_id, sl.created_at
    `);
    
    console.log(`📊 Encontrados ${duplicates.length} logs duplicados para remoção`);
    
    if (duplicates.length > 0) {
      // 2. Remover duplicatas (manter apenas o primeiro de cada grupo)
      const idsToDelete = duplicates.map(row => row.id);
      
      console.log('🗑️ Removendo logs duplicados...');
      console.log('IDs a remover:', idsToDelete);
      
      const deleteResult = await db.execute(sql`
        DELETE FROM system_logs 
        WHERE id = ANY(${sql`ARRAY[${idsToDelete.join(',')}]::integer[]`})
      `);
      
      console.log(`✅ ${idsToDelete.length} logs duplicados removidos com sucesso`);
    } else {
      console.log('✅ Nenhum log duplicado encontrado');
    }
    
    // 3. Verificar resultado final
    const finalCount = await db.select({ count: sql`count(*)` }).from(system_logs);
    console.log(`📈 Total de logs após limpeza: ${finalCount[0].count}`);
    
    // 4. Mostrar logs restantes
    const remainingLogs = await db
      .select()
      .from(system_logs)
      .orderBy(sql`created_at DESC`)
      .limit(10);
    
    console.log('\n📋 Últimos 10 logs restantes:');
    remainingLogs.forEach((log, index) => {
      console.log(`${index + 1}. ID: ${log.id} | ${log.entity_type}.${log.action_type} | Entity: ${log.entity_id} | ${log.created_at}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
    process.exit(1);
  }
}

cleanupDuplicateLogs();