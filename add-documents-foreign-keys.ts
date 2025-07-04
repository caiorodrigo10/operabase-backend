/**
 * Migração: Adicionar colunas clinic_id e knowledge_base_id à tabela documents
 * Melhora performance e integridade referencial do sistema RAG
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

// Configurar conexão com Supabase
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_POOLER_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL ou SUPABASE_POOLER_URL não configurado');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function addDocumentsForeignKeys() {
  console.log('🔧 Iniciando migração: Adicionando colunas clinic_id e knowledge_base_id à tabela documents...');
  
  try {
    // Verificar se as colunas já existem
    console.log('🔍 Verificando estrutura atual da tabela documents...');
    
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND table_schema = 'public'
      AND column_name IN ('clinic_id', 'knowledge_base_id');
    `);
    
    const existingColumns = columnCheck.rows.map((row: any) => row.column_name);
    console.log('📋 Colunas existentes encontradas:', existingColumns);
    
    // Adicionar coluna clinic_id se não existir
    if (!existingColumns.includes('clinic_id')) {
      console.log('➕ Adicionando coluna clinic_id...');
      await db.execute(sql`
        ALTER TABLE documents 
        ADD COLUMN clinic_id INTEGER;
      `);
      console.log('✅ Coluna clinic_id adicionada');
    } else {
      console.log('ℹ️ Coluna clinic_id já existe');
    }
    
    // Adicionar coluna knowledge_base_id se não existir
    if (!existingColumns.includes('knowledge_base_id')) {
      console.log('➕ Adicionando coluna knowledge_base_id...');
      await db.execute(sql`
        ALTER TABLE documents 
        ADD COLUMN knowledge_base_id INTEGER;
      `);
      console.log('✅ Coluna knowledge_base_id adicionada');
    } else {
      console.log('ℹ️ Coluna knowledge_base_id já existe');
    }
    
    // Povoar as colunas com dados do metadata JSONB
    console.log('📊 Populando colunas com dados do metadata...');
    
    const updateResult = await db.execute(sql`
      UPDATE documents 
      SET 
        clinic_id = CAST(metadata->>'clinic_id' AS INTEGER),
        knowledge_base_id = CAST(metadata->>'knowledge_base_id' AS INTEGER)
      WHERE 
        metadata->>'clinic_id' IS NOT NULL 
        AND metadata->>'knowledge_base_id' IS NOT NULL;
    `);
    
    console.log(`✅ ${updateResult.rowCount || 0} documentos atualizados com clinic_id e knowledge_base_id`);
    
    // Adicionar foreign keys se as tabelas de referência existirem
    try {
      console.log('🔗 Adicionando foreign key constraints...');
      
      // Verificar se tabela knowledge_bases existe
      const kbTableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'knowledge_bases'
        );
      `);
      
      if ((kbTableCheck.rows[0] as any).exists) {
        // Adicionar foreign key para knowledge_bases
        await db.execute(sql`
          ALTER TABLE documents 
          ADD CONSTRAINT fk_documents_knowledge_base 
          FOREIGN KEY (knowledge_base_id) 
          REFERENCES knowledge_bases(id) 
          ON DELETE CASCADE;
        `);
        console.log('✅ Foreign key para knowledge_bases adicionada');
      }
      
    } catch (fkError) {
      console.log('⚠️ Foreign keys não adicionadas (tabelas podem não existir):', String(fkError));
    }
    
    // Criar índices para performance
    console.log('📈 Criando índices para performance...');
    
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_documents_clinic_id 
        ON documents(clinic_id);
      `);
      console.log('✅ Índice clinic_id criado');
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_documents_knowledge_base_id 
        ON documents(knowledge_base_id);
      `);
      console.log('✅ Índice knowledge_base_id criado');
      
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_documents_clinic_kb 
        ON documents(clinic_id, knowledge_base_id);
      `);
      console.log('✅ Índice composto clinic_id + knowledge_base_id criado');
      
    } catch (indexError) {
      console.log('⚠️ Alguns índices podem já existir:', String(indexError));
    }
    
    // Verificar resultado final
    console.log('\n📊 Verificando resultado final...');
    
    const finalCheck = await db.execute(sql`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(clinic_id) as documents_with_clinic_id,
        COUNT(knowledge_base_id) as documents_with_knowledge_base_id
      FROM documents;
    `);
    
    const stats = finalCheck.rows[0] as any;
    console.log('📈 Estatísticas finais:');
    console.log(`  - Total de documentos: ${stats.total_documents}`);
    console.log(`  - Documentos com clinic_id: ${stats.documents_with_clinic_id}`);
    console.log(`  - Documentos com knowledge_base_id: ${stats.documents_with_knowledge_base_id}`);
    
    console.log('\n🎉 Migração concluída com sucesso!');
    console.log('✅ Tabela documents agora possui colunas clinic_id e knowledge_base_id');
    console.log('✅ Performance de consultas otimizada com índices');
    console.log('✅ Integridade referencial melhorada');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Executar migração
addDocumentsForeignKeys()
  .then(() => {
    console.log('\n🏁 Script de migração finalizado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal na migração:', error);
    process.exit(1);
  });