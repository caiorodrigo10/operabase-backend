/**
 * Script para sincronizar knowledge_base_id na tabela rag_embeddings
 * Conecta embeddings aos suas bases de conhecimento corretas
 */

import { sql } from 'drizzle-orm';
import { db } from './server/db.js';

async function syncKnowledgeBaseIds() {
  console.log('🔄 Iniciando sincronização de knowledge_base_id...');
  
  try {
    // ETAPA 1: Verificar dados atuais
    console.log('\n📊 ETAPA 1: Verificando estrutura atual...');
    
    const currentEmbeddings = await db.execute(sql`
      SELECT re.id, re.chunk_id, re.clinic_id, re.knowledge_base_id,
             rc.document_id,
             rd.external_user_id, rd.title
      FROM rag_embeddings re
      JOIN rag_chunks rc ON re.chunk_id = rc.id  
      JOIN rag_documents rd ON rc.document_id = rd.id
      ORDER BY re.id;
    `);
    
    const embeddingsArray = currentEmbeddings.rows || currentEmbeddings;
    console.log(`📈 Total embeddings: ${embeddingsArray.length}`);
    embeddingsArray.forEach((emb, idx) => {
      console.log(`   ${idx + 1}. ID: ${emb.id}, Chunk: ${emb.chunk_id}, Clinic: ${emb.clinic_id}, KB: ${emb.knowledge_base_id}, Doc: "${emb.title}"`);
    });

    // ETAPA 2: Verificar bases de conhecimento disponíveis
    console.log('\n📚 ETAPA 2: Verificando bases de conhecimento...');
    
    const knowledgeBases = await db.execute(sql`
      SELECT id, external_user_id, name, description
      FROM rag_knowledge_bases
      ORDER BY id;
    `);
    
    const kbArray = knowledgeBases.rows || knowledgeBases;
    console.log(`📈 Total bases: ${kbArray.length}`);
    kbArray.forEach((kb, idx) => {
      console.log(`   ${idx + 1}. ID: ${kb.id}, User: ${kb.external_user_id}, Nome: "${kb.name}"`);
    });

    if (kbArray.length === 0) {
      console.log('⚠️ Nenhuma base de conhecimento encontrada. Criando base padrão...');
      
      // Criar base de conhecimento padrão para clínica 1
      const defaultKB = await db.execute(sql`
        INSERT INTO rag_knowledge_bases (external_user_id, name, description, created_by)
        VALUES ('1', 'Base Padrão Clínica 1', 'Base de conhecimento padrão para embeddings existentes', 'system')
        RETURNING id, name;
      `);
      
      const defaultKBData = defaultKB.rows || defaultKB;
      console.log(`✅ Base padrão criada: ID ${defaultKBData[0].id} - "${defaultKBData[0].name}"`);
      kbArray.push(...defaultKBData);
    }

    // ETAPA 3: Sincronizar knowledge_base_id
    console.log('\n🔄 ETAPA 3: Sincronizando knowledge_base_id...');
    
    if (embeddingsArray.length > 0) {
      // Estratégia: Associar baseado no external_user_id (clinic_id)
      const syncResult = await db.execute(sql`
        UPDATE rag_embeddings 
        SET knowledge_base_id = (
          SELECT kb.id 
          FROM rag_knowledge_bases kb
          WHERE kb.external_user_id = rag_embeddings.clinic_id::text
          LIMIT 1
        )
        WHERE knowledge_base_id IS NULL;
      `);
      
      console.log(`✅ Atualizados ${syncResult.rowCount} embeddings com knowledge_base_id`);

      // Se não houver correspondência, usar a primeira base disponível
      const remainingNulls = await db.execute(sql`
        UPDATE rag_embeddings 
        SET knowledge_base_id = (
          SELECT id FROM rag_knowledge_bases ORDER BY id LIMIT 1
        )
        WHERE knowledge_base_id IS NULL;
      `);
      
      if (remainingNulls.rowCount > 0) {
        console.log(`✅ Preenchidos ${remainingNulls.rowCount} embeddings restantes com base padrão`);
      }
    }

    // ETAPA 4: Verificar resultado final
    console.log('\n📊 ETAPA 4: Verificando resultado final...');
    
    const finalResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_embeddings,
        COUNT(knowledge_base_id) as with_kb_id,
        COUNT(*) - COUNT(knowledge_base_id) as missing_kb_id,
        COUNT(DISTINCT knowledge_base_id) as unique_kbs
      FROM rag_embeddings;
    `);
    
    const statsArray = finalResult.rows || finalResult;
    const stats = statsArray[0];
    console.log('📈 Estatísticas finais:');
    console.log(`   • Total embeddings: ${stats.total_embeddings}`);
    console.log(`   • Com knowledge_base_id: ${stats.with_kb_id}`);
    console.log(`   • Sem knowledge_base_id: ${stats.missing_kb_id}`);
    console.log(`   • Bases únicas utilizadas: ${stats.unique_kbs}`);

    // ETAPA 5: Mostrar mapeamento final
    console.log('\n🔗 ETAPA 5: Mapeamento final...');
    
    const finalMappings = await db.execute(sql`
      SELECT re.clinic_id, re.knowledge_base_id, kb.name as kb_name, 
             COUNT(*) as embedding_count
      FROM rag_embeddings re
      LEFT JOIN rag_knowledge_bases kb ON re.knowledge_base_id = kb.id
      GROUP BY re.clinic_id, re.knowledge_base_id, kb.name
      ORDER BY re.clinic_id, re.knowledge_base_id;
    `);
    
    const mappingsArray = finalMappings.rows || finalMappings;
    mappingsArray.forEach((mapping, idx) => {
      console.log(`   ${idx + 1}. Clínica ${mapping.clinic_id} → KB ${mapping.knowledge_base_id} ("${mapping.kb_name}"): ${mapping.embedding_count} embeddings`);
    });

    console.log('\n🎉 Sincronização concluída com sucesso!');
    console.log('✅ Todos os embeddings agora têm knowledge_base_id definido');
    
  } catch (error) {
    console.error('❌ Erro durante sincronização:', error);
    throw error;
  }
}

// Executar sincronização
syncKnowledgeBaseIds()
  .then(() => {
    console.log('\n✅ Script executado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Falha na execução do script:', error);
    process.exit(1);
  });

export { syncKnowledgeBaseIds };