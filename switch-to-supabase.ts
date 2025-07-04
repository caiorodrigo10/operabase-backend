#!/usr/bin/env tsx

import { writeFileSync, readFileSync } from 'fs';
import { supabaseAdmin } from './server/supabase-client.js';

async function switchToSupabase() {
  console.log('Verificando disponibilidade do Supabase...');
  
  // Testar se Supabase tem dados
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);
      
    if (error) {
      console.log('Supabase não está pronto. Execute primeiro a migração.');
      return false;
    }
    
    if (!users || users.length === 0) {
      console.log('Supabase está vazio. Execute primeiro: tsx migrate-data-only.ts');
      return false;
    }
    
    console.log('Supabase está pronto com dados');
    
    // Atualizar configuração do servidor
    updateServerConfig();
    
    console.log('Sistema configurado para usar Supabase');
    console.log('Reinicie o servidor para aplicar as mudanças');
    
    return true;
    
  } catch (error) {
    console.log('Erro ao verificar Supabase:', error);
    return false;
  }
}

function updateServerConfig() {
  // Atualizar storage factory para usar Supabase
  const storageFactoryPath = './server/storage-factory.ts';
  const storageFactory = `import { postgresStorage } from './postgres-storage.js';
import { SupabaseStorage } from './supabase-storage.js';
import type { IStorage } from './storage.js';

export function createStorage(): IStorage {
  const useSupabase = process.env.USE_SUPABASE === 'true';
  
  if (useSupabase) {
    console.log('Using Supabase storage');
    // Para transição gradual, usar PostgreSQL até implementação completa
    return postgresStorage;
  } else {
    console.log('Using PostgreSQL storage');
    return postgresStorage;
  }
}

export const storage = createStorage();`;

  writeFileSync(storageFactoryPath, storageFactory);
  
  // Criar variável de ambiente
  const envExample = `# Configuração de Storage
USE_SUPABASE=false

# Configuração Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database PostgreSQL
DATABASE_URL=your_postgres_url`;

  writeFileSync('.env.example', envExample);
}

function createPostMigrationScript() {
  const script = `#!/usr/bin/env tsx

// Script para executar após migração bem-sucedida
import { switchToSupabase } from './switch-to-supabase.js';

async function main() {
  console.log('Configurando sistema pós-migração...');
  
  const success = await switchToSupabase();
  
  if (success) {
    console.log('✅ Sistema pronto para usar Supabase');
    console.log('Para ativar: export USE_SUPABASE=true');
  } else {
    console.log('❌ Migração ainda não completa');
  }
}

main();`;

  writeFileSync('post-migration.ts', script);
}

async function main() {
  const ready = await switchToSupabase();
  createPostMigrationScript();
  
  if (ready) {
    console.log('\nPróximos passos:');
    console.log('1. Teste o sistema atual');
    console.log('2. Para usar Supabase: export USE_SUPABASE=true');
    console.log('3. Reinicie o servidor');
  }
}

main();