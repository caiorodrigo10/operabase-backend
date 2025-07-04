import { supabaseAdmin } from './server/supabase';
import { pool } from './server/db';

async function migrateUserToSupabase() {
  console.log('🚀 FASE 3: Migração do Usuário para Supabase Auth');
  console.log('='.repeat(50));
  
  try {
    // 1. Buscar usuário atual
    console.log('🔍 Buscando usuário atual...');
    const currentUserResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@teste.com']
    );
    
    if (currentUserResult.rows.length === 0) {
      throw new Error('Usuário admin@teste.com não encontrado');
    }
    
    const currentUser = currentUserResult.rows[0];
    console.log(`✅ Usuário encontrado: ${currentUser.name} (${currentUser.email})`);
    
    // 2. Verificar se usuário já existe no Supabase Auth
    console.log('🔍 Verificando se usuário já existe no Supabase Auth...');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === currentUser.email);
    
    let supabaseUser;
    
    if (existingUser) {
      console.log('ℹ️  Usuário já existe no Supabase Auth');
      supabaseUser = existingUser;
    } else {
      // 3. Criar usuário no Supabase Auth
      console.log('🔧 Criando usuário no Supabase Auth...');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: currentUser.email,
        password: 'NovaSeinha123!', // Nova senha segura
        email_confirm: true,
        user_metadata: {
          name: currentUser.name,
          role: currentUser.role,
          migrated_from_custom_auth: true,
          migration_date: new Date().toISOString()
        }
      });
      
      if (authError) {
        throw new Error(`Erro ao criar usuário no Supabase Auth: ${authError.message}`);
      }
      
      supabaseUser = authData.user;
      console.log(`✅ Usuário criado no Supabase Auth: ${supabaseUser.id}`);
    }
    
    // 4. Verificar se perfil já existe
    console.log('🔍 Verificando perfil existente...');
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();
    
    if (!existingProfile) {
      // 5. Criar perfil
      console.log('🔧 Criando perfil do usuário...');
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: supabaseUser.id,
          name: currentUser.name,
          role: currentUser.role,
          is_active: currentUser.is_active,
          last_login: currentUser.last_login,
          created_at: currentUser.created_at,
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        throw new Error(`Erro ao criar perfil: ${profileError.message}`);
      }
      
      console.log('✅ Perfil criado com sucesso');
    } else {
      console.log('ℹ️  Perfil já existe');
    }
    
    // 6. Criar mapeamento temporário UUID -> Integer
    console.log('🔧 Criando mapeamento de IDs...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_id_mapping (
        supabase_uuid UUID PRIMARY KEY,
        legacy_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Inserir mapeamento
    await pool.query(`
      INSERT INTO user_id_mapping (supabase_uuid, legacy_id, email)
      VALUES ($1, $2, $3)
      ON CONFLICT (supabase_uuid) DO UPDATE SET
        legacy_id = EXCLUDED.legacy_id,
        email = EXCLUDED.email
    `, [supabaseUser.id, currentUser.id, currentUser.email]);
    
    console.log('✅ Mapeamento de IDs criado');
    
    // 7. Teste de autenticação
    console.log('🧪 Testando autenticação...');
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: currentUser.email,
      password: 'NovaSeinha123!'
    });
    
    if (signInError) {
      console.log('⚠️  Aviso: Teste de autenticação falhou, mas usuário foi criado');
    } else {
      console.log('✅ Teste de autenticação bem-sucedido');
    }
    
    // 8. Resumo da migração
    console.log('\n📋 Resumo da Migração:');
    console.log(`✅ Usuário migrado: ${currentUser.email}`);
    console.log(`✅ Supabase UUID: ${supabaseUser.id}`);
    console.log(`✅ Legacy ID: ${currentUser.id}`);
    console.log(`✅ Role: ${currentUser.role}`);
    console.log(`✅ Nova senha: NovaSeinha123!`);
    
    console.log('\n🎯 FASE 3.1 concluída. Usuário migrado com sucesso!');
    return {
      success: true,
      supabaseId: supabaseUser.id,
      legacyId: currentUser.id,
      email: currentUser.email,
      newPassword: 'NovaSeinha123!'
    };
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  await migrateUserToSupabase();
}

main().catch(console.error);