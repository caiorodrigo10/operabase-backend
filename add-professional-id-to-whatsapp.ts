import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function addProfessionalIdColumn() {
  try {
    console.log('🔧 Adicionando coluna professional_id na tabela whatsapp_numbers...');
    
    // Add professional_id column
    await db.execute(sql`
      ALTER TABLE whatsapp_numbers 
      ADD COLUMN IF NOT EXISTS professional_id INTEGER;
    `);
    
    console.log('✅ Coluna professional_id adicionada com sucesso');
    
    // Add index for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_professional 
      ON whatsapp_numbers(professional_id);
    `);
    
    console.log('✅ Índice criado para professional_id');
    
    console.log('🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

addProfessionalIdColumn();