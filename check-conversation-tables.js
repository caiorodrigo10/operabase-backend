import { db } from './server/db.ts';

async function checkTables() {
  try {
    const result = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%message%' OR table_name LIKE '%conversation%')
      ORDER BY table_name;
    `);
    
    console.log('Tabelas relacionadas a conversas encontradas:');
    if (result.rows.length === 0) {
      console.log('- Nenhuma tabela encontrada');
    } else {
      result.rows.forEach(row => {
        console.log('- ' + row.table_name);
      });
    }
    
    // Verificar especificamente message_attachments
    const attachmentCheck = await db.execute(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'message_attachments'
      );
    `);
    
    console.log('\nVerificação da tabela message_attachments:');
    console.log('- Existe:', attachmentCheck.rows[0].exists ? 'SIM' : 'NÃO');
    
  } catch (error) {
    console.error('Erro ao verificar tabelas:', error);
  } finally {
    process.exit(0);
  }
}

checkTables();