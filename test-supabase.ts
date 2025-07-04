#!/usr/bin/env tsx

import { supabaseAdmin } from './server/supabase-client.js';

async function testSupabaseConnection() {
  try {
    console.log('🔍 Testando conexão com Supabase...');
    
    // Testar conexão básica
    const { data, error } = await supabaseAdmin
      .from('_placeholder')
      .select('*')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('✅ Conexão estabelecida - tabela não existe (esperado)');
    } else if (error) {
      console.error('❌ Erro de conexão:', error);
      return false;
    } else {
      console.log('✅ Conexão estabelecida');
    }

    // Verificar se podemos listar tabelas
    const { data: tables, error: tablesError } = await supabaseAdmin
      .rpc('get_table_names');

    if (tablesError) {
      console.log('⚠️  Não foi possível listar tabelas:', tablesError.message);
    } else {
      console.log('📋 Tabelas existentes:', tables || []);
    }

    return true;
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
    return false;
  }
}

testSupabaseConnection();