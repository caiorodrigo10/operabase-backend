/**
 * Migração para adicionar coluna email e migrar dados de admin_email
 */

import { sql } from "drizzle-orm";
import { db } from "./server/db";

async function addEmailColumnMigration() {
  console.log('🔧 Adicionando coluna email à tabela clinic_invitations...');
  
  try {
    // 1. Adicionar coluna email se não existir
    await db.execute(sql`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT column_name 
                         FROM information_schema.columns 
                         WHERE table_name='clinic_invitations' AND column_name='email') THEN
              ALTER TABLE clinic_invitations ADD COLUMN email VARCHAR(255);
              RAISE NOTICE 'Coluna email adicionada';
          END IF;
      END $$;
    `);
    
    // 2. Migrar dados de admin_email para email se admin_email existir
    await db.execute(sql`
      DO $$
      BEGIN
          IF EXISTS (SELECT column_name 
                     FROM information_schema.columns 
                     WHERE table_name='clinic_invitations' AND column_name='admin_email') THEN
              UPDATE clinic_invitations SET email = admin_email WHERE email IS NULL;
              RAISE NOTICE 'Dados migrados de admin_email para email';
          END IF;
      END $$;
    `);
    
    // 3. Tornar coluna email NOT NULL se ela existe e tem dados
    await db.execute(sql`
      DO $$
      BEGIN
          IF EXISTS (SELECT column_name 
                     FROM information_schema.columns 
                     WHERE table_name='clinic_invitations' AND column_name='email') THEN
              ALTER TABLE clinic_invitations ALTER COLUMN email SET NOT NULL;
              RAISE NOTICE 'Coluna email definida como NOT NULL';
          END IF;
      END $$;
    `);
    
    // 4. Remover coluna admin_email se existir (após migração)
    await db.execute(sql`
      DO $$
      BEGIN
          IF EXISTS (SELECT column_name 
                     FROM information_schema.columns 
                     WHERE table_name='clinic_invitations' AND column_name='admin_email') THEN
              ALTER TABLE clinic_invitations DROP COLUMN admin_email;
              RAISE NOTICE 'Coluna admin_email removida';
          END IF;
      END $$;
    `);
    
    // Verificar estrutura final
    const checkStructure = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'clinic_invitations'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estrutura final da tabela clinic_invitations:');
    checkStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'}`);
    });
    
    console.log('\n✅ Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

// Executar migração
addEmailColumnMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Falha na migração:', error);
    process.exit(1);
  });