#!/usr/bin/env tsx

import { runMigration } from './server/supabase-migration.js';

async function main() {
  try {
    console.log('🚀 Iniciando migração para Supabase...');
    await runMigration();
    console.log('✅ Migração concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

main();