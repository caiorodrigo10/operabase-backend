/**
 * Script para atualizar a VIEW v_n8n_clinic_livia
 * Adiciona nome/email do profissional e remove campos desnecessários
 */

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function updateViewN8NClinicLivia() {
  try {
    console.log('🔧 Atualizando VIEW v_n8n_clinic_livia...');
    
    // PASSO 1: Remover VIEW existente
    console.log('\n🗑️ Removendo VIEW antiga...');
    await db.execute(sql`DROP VIEW IF EXISTS v_n8n_clinic_livia;`);
    console.log('✅ VIEW removida');
    
    // PASSO 2: Criar nova VIEW com estrutura otimizada
    console.log('\n🔧 Criando nova VIEW otimizada...');
    await db.execute(sql`
      CREATE VIEW v_n8n_clinic_livia AS
      SELECT 
        -- Dados do WhatsApp
        wn.phone_number,
        wn.instance_name,
        wn.clinic_id,
        
        -- Dados RAG (apenas chunk essencial)
        rc.id as chunk_id,
        
        -- Configurações da Lívia por clínica
        lc.general_prompt as prompt_personalizado,
        lc.selected_professional_ids as profissionais_vinculados,
        lc.connected_knowledge_base_ids as bases_conhecimento_vinculadas,
        lc.is_active as livia_ativa,
        
        -- Dados do profissional vinculado (JOIN com users)
        u.name as profissional_nome,
        u.email as profissional_email,
        
        -- Timestamps
        lc.created_at as livia_configurada_em,
        lc.updated_at as livia_atualizada_em
        
      FROM whatsapp_numbers wn
      
      -- JOIN com configurações da Lívia por clínica
      LEFT JOIN livia_configurations lc ON lc.clinic_id = wn.clinic_id
      
      -- JOIN com sistema RAG (apenas chunks)
      LEFT JOIN rag_documents rd ON rd.external_user_id = wn.clinic_id::text
      LEFT JOIN rag_chunks rc ON rc.document_id = rd.id
      
      -- JOIN com profissional vinculado (assumindo apenas 1 profissional por configuração)
      LEFT JOIN users u ON u.id = lc.selected_professional_ids[1]
      
      WHERE 
        wn.status = 'open' 
        AND (rd.processing_status = 'completed' OR rd.processing_status IS NULL)
      
      ORDER BY wn.clinic_id, rc.id;
    `);
    
    console.log('✅ Nova VIEW v_n8n_clinic_livia criada!');
    
    // PASSO 3: Testar nova estrutura
    console.log('\n🧪 Testando nova estrutura...');
    const testResult = await db.execute(sql`
      SELECT 
        phone_number,
        clinic_id,
        chunk_id,
        prompt_personalizado,
        profissionais_vinculados,
        profissional_nome,
        profissional_email,
        bases_conhecimento_vinculadas,
        livia_ativa
      FROM v_n8n_clinic_livia 
      LIMIT 5;
    `);
    
    console.log(`📊 Nova VIEW retorna ${testResult.rows?.length || 0} registros:`);
    testResult.rows?.forEach((row, index) => {
      console.log(`${index + 1}. Phone: ${row.phone_number} | Clinic: ${row.clinic_id} | Chunk: ${row.chunk_id}`);
      console.log(`   Profissional: ${row.profissional_nome} (${row.profissional_email})`);
      console.log(`   Prompt: ${row.prompt_personalizado?.slice(0, 50)}...`);
      console.log(`   Lívia Ativa: ${row.livia_ativa}`);
    });
    
    // PASSO 4: Verificar dados únicos de configuração
    console.log('\n🤖 Verificando configurações únicas...');
    const configResult = await db.execute(sql`
      SELECT DISTINCT
        clinic_id,
        profissional_nome,
        profissional_email,
        prompt_personalizado,
        livia_ativa,
        COUNT(chunk_id) as total_chunks
      FROM v_n8n_clinic_livia 
      GROUP BY clinic_id, profissional_nome, profissional_email, prompt_personalizado, livia_ativa;
    `);
    
    console.log('📋 Configurações por clínica:');
    configResult.rows?.forEach(config => {
      console.log(`✅ Clínica ${config.clinic_id}:`);
      console.log(`   👨‍⚕️ Profissional: ${config.profissional_nome} (${config.profissional_email})`);
      console.log(`   🤖 Lívia Ativa: ${config.livia_ativa}`);
      console.log(`   📚 Total Chunks: ${config.total_chunks}`);
      console.log(`   💬 Prompt: ${config.prompt_personalizado?.slice(0, 80)}...`);
    });
    
    console.log('\n✅ VIEW v_n8n_clinic_livia atualizada com sucesso!');
    console.log('🎯 Campos removidos: chunk_content, document_id, documento_titulo, documento_tipo, tempo_ausencia, unidade_tempo');
    console.log('➕ Campos adicionados: profissional_nome, profissional_email');
    console.log('📝 Exemplo de uso N8N: SELECT chunk_id, prompt_personalizado, profissional_nome FROM v_n8n_clinic_livia WHERE phone_number = \'{{ $json.from }}\'');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar VIEW:', error);
    throw error;
  }
}

// Executar atualização
updateViewN8NClinicLivia().catch(console.error);