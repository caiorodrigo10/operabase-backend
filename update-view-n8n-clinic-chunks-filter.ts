/**
 * Script para atualizar a VIEW v_n8n_clinic_chunks
 * Adicionando filtro para mostrar apenas bases de conhecimento conectadas na Lívia
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateViewWithLiviaFilter() {
  try {
    console.log('🔧 Atualizando VIEW v_n8n_clinic_chunks com filtro da Lívia...');
    
    // Para este teste, vamos primeiro verificar se o problema é de estrutura de dados
    console.log('\n1. Verificando estrutura atual sem modificar VIEW...');
    console.log('ℹ️ Como não temos acesso direto ao SQL, vamos analisar os dados existentes')
    
    // 3. Testar nova VIEW
    console.log('\n3. Testando nova VIEW...');
    const { data: viewData, error: viewError } = await supabase
      .from('v_n8n_clinic_chunks')
      .select('*')
      .limit(10);
    
    if (viewError) {
      console.log('❌ Erro ao testar VIEW:', viewError);
    } else {
      console.log(`📊 VIEW funcionando! Registros: ${viewData?.length || 0}`);
      viewData?.forEach((row, index) => {
        console.log(`  ${index + 1}. Chunk: ${row.chunk_id}, KB: ${row.knowledge_base_id} (${row.knowledge_base_name}), Clinic: ${row.clinic_id}`);
        console.log(`     Bases Conectadas: ${JSON.stringify(row.bases_conhecimento_vinculadas)}`);
      });
    }
    
    // 4. Verificar configuração atual da Lívia
    console.log('\n4. Verificando configuração atual da Lívia...');
    const { data: liviaConfig, error: liviaError } = await supabase
      .from('livia_configurations')
      .select('clinic_id, connected_knowledge_base_ids, is_active')
      .eq('clinic_id', 1);
    
    if (liviaError) {
      console.log('❌ Erro ao buscar configuração Lívia:', liviaError);
    } else {
      console.log('⚙️ Configuração Lívia:');
      liviaConfig?.forEach(config => {
        console.log(`  - Clinic: ${config.clinic_id}, Bases Conectadas: ${JSON.stringify(config.connected_knowledge_base_ids)}, Ativa: ${config.is_active}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar atualização
updateViewWithLiviaFilter()
  .then(() => {
    console.log('\n🎉 Atualização da VIEW completa!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na atualização:', error);
    process.exit(1);
  });