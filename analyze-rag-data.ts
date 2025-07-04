/**
 * Script para analisar por que a VIEW v_n8n_clinic_chunks está vazia
 */

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function analyzeRAGData() {
  try {
    console.log('🔍 Analisando dados RAG...');
    
    // 1. Verificar documentos RAG
    const docs = await db.execute(sql`SELECT id, external_user_id, title, processing_status FROM rag_documents ORDER BY id;`);
    console.log('📄 Documentos RAG:', docs.rows?.length || 0);
    docs.rows?.forEach(doc => {
      console.log(`  - ID: ${doc.id}, User: ${doc.external_user_id}, Status: ${doc.processing_status}, Título: ${doc.title}`);
    });
    
    // 2. Verificar chunks
    const chunks = await db.execute(sql`SELECT COUNT(*) as total FROM rag_chunks;`);
    console.log('🔗 Chunks RAG:', chunks.rows?.[0]?.total || 0);
    
    // 3. Verificar WhatsApp numbers
    const whatsapp = await db.execute(sql`SELECT id, clinic_id, phone_number, instance_name, status FROM whatsapp_numbers ORDER BY id;`);
    console.log('📱 WhatsApp Numbers:', whatsapp.rows?.length || 0);
    whatsapp.rows?.forEach(wa => {
      console.log(`  - ID: ${wa.id}, Clinic: ${wa.clinic_id}, Status: ${wa.status}, Instance: ${wa.instance_name}`);
    });
    
    // 4. Testar o JOIN manualmente
    console.log('\n🔍 Testando JOIN manual...');
    const join1 = await db.execute(sql`
      SELECT rd.id, rd.external_user_id, rd.title, wn.clinic_id, wn.status as wa_status
      FROM rag_documents rd
      JOIN whatsapp_numbers wn ON rd.external_user_id = CAST(wn.clinic_id AS TEXT)
      WHERE rd.processing_status = 'completed';
    `);
    console.log('🔗 JOIN rag_documents + whatsapp_numbers:', join1.rows?.length || 0);
    join1.rows?.forEach(row => {
      console.log(`  - Doc: ${row.title}, External_user_id: ${row.external_user_id}, Clinic_id: ${row.clinic_id}, WA_status: ${row.wa_status}`);
    });
    
    // 5. Verificar se external_user_id corresponde a clinic_id
    console.log('\n🔍 Verificando correspondência external_user_id vs clinic_id...');
    const comparison = await db.execute(sql`
      SELECT DISTINCT 
        rd.external_user_id,
        wn.clinic_id,
        CAST(wn.clinic_id AS TEXT) as clinic_id_as_text,
        (rd.external_user_id = CAST(wn.clinic_id AS TEXT)) as match
      FROM rag_documents rd
      CROSS JOIN whatsapp_numbers wn;
    `);
    comparison.rows?.forEach(row => {
      console.log(`  - External_user_id: '${row.external_user_id}' vs Clinic_id: '${row.clinic_id_as_text}' = Match: ${row.match}`);
    });
    
    // 6. Testar a VIEW diretamente
    console.log('\n🔍 Testando a VIEW diretamente...');
    const viewResult = await db.execute(sql`SELECT * FROM v_n8n_clinic_chunks LIMIT 10;`);
    console.log('📊 VIEW v_n8n_clinic_chunks resultados:', viewResult.rows?.length || 0);
    
  } catch (error) {
    console.error('❌ Erro ao analisar dados:', error);
    throw error;
  }
}

// Executar o script
analyzeRAGData()
  .then(() => {
    console.log('🎉 Análise completa!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na análise:', error);
    process.exit(1);
  });