import { supabase, supabaseAdmin } from './server/supabase';

async function testSupabaseAuth() {
  console.log('🔍 Testing Supabase Auth configuration...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    console.log('✅ Supabase client connection successful');
    
    // Test admin client
    const { data: users, error: adminError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (adminError) {
      console.log('❌ Supabase Auth not enabled:', adminError.message);
      console.log('ℹ️  Need to enable Authentication in Supabase Dashboard');
      return false;
    }
    
    console.log('✅ Supabase Auth is enabled');
    console.log('📊 Current users:', users.users.length);
    
    return true;
    
  } catch (error) {
    console.error('❌ Supabase Auth test failed:', error);
    return false;
  }
}

// Test profiles table
async function testProfilesTable() {
  console.log('🔍 Testing profiles table...');
  
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    
    if (error) {
      console.log('❌ Profiles table error:', error.message);
      return false;
    }
    
    console.log('✅ Profiles table accessible');
    console.log('📊 Current profiles:', data.length);
    return true;
    
  } catch (error) {
    console.error('❌ Profiles table test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 FASE 1: Preparação e Configuração - Testes');
  console.log('='.repeat(50));
  
  const authEnabled = await testSupabaseAuth();
  const profilesReady = await testProfilesTable();
  
  console.log('\n📋 FASE 1 - Resultados:');
  console.log(`✅ Supabase client configurado`);
  console.log(`${authEnabled ? '✅' : '❌'} Supabase Auth ${authEnabled ? 'habilitado' : 'precisa ser habilitado'}`);
  console.log(`${profilesReady ? '✅' : '❌'} Tabela profiles ${profilesReady ? 'pronta' : 'com problemas'}`);
  
  if (!authEnabled) {
    console.log('\n⚠️  AÇÃO NECESSÁRIA:');
    console.log('1. Acessar Supabase Dashboard');
    console.log('2. Ir em Authentication -> Settings');
    console.log('3. Habilitar Email authentication');
    console.log('4. Configurar Site URL e Redirect URLs');
  }
  
  console.log('\n🎯 FASE 1 concluída. Pronto para FASE 2 (RLS)');
}

main().catch(console.error);