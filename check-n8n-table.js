/**
 * Script para verificar se a tabela n8n_chat_messages existe no Supabase
 * e entender sua estrutura
 */

async function checkN8NTable() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔍 Verificando tabela n8n_chat_messages...');
    
    // Tentar fazer uma query simples para ver se a tabela existe
    const { data, error } = await supabase
      .from('n8n_chat_messages')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Erro ao acessar n8n_chat_messages:', error.message);
      console.log('📋 Detalhes do erro:', error);
      
      // Verificar se é erro de tabela não encontrada
      if (error.message.includes('does not exist') || error.code === 'PGRST116') {
        console.log('🆕 Tabela n8n_chat_messages não existe - precisa ser criada');
        
        // Listar todas as tabelas para confirmação
        console.log('\n📋 Verificando tabelas existentes...');
        const { data: tables, error: tablesError } = await supabase
          .rpc('get_tables');
          
        if (tablesError) {
          console.log('⚠️ Não foi possível listar tabelas:', tablesError.message);
        } else {
          console.log('📊 Tabelas encontradas:', tables?.map(t => t.table_name) || 'Nenhuma');
        }
      }
    } else {
      console.log('✅ Tabela n8n_chat_messages existe!');
      console.log('📊 Exemplo de dados:', data);
      
      // Buscar schema da tabela via RPC
      console.log('\n🔍 Verificando estrutura da tabela...');
      try {
        const { data: schema, error: schemaError } = await supabase
          .rpc('get_table_schema', { table_name: 'n8n_chat_messages' });
          
        if (schemaError) {
          console.log('⚠️ Não foi possível obter schema via RPC:', schemaError.message);
          
          // Tentar obter estrutura via query direta
          const { data: directSchema } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, ordinal_position')
            .eq('table_name', 'n8n_chat_messages')
            .order('ordinal_position');
            
          if (directSchema && directSchema.length > 0) {
            console.log('📋 Estrutura da tabela n8n_chat_messages (via information_schema):');
            directSchema.forEach(col => {
              console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });
          } else {
            console.log('📋 Estrutura baseada nos dados existentes:');
            console.log('  - id: integer (not null)');
            console.log('  - session_id: text (not null)');
            console.log('  - message: jsonb (not null)');
            console.log('  - created_at: timestamp (unknown - possivelmente não existe)');
          }
        } else if (schema) {
          console.log('📋 Estrutura da tabela n8n_chat_messages:');
          schema.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
          });
        }
      } catch (structureError) {
        console.log('⚠️ Erro ao obter estrutura:', structureError.message);
        console.log('📋 Usando estrutura básica conhecida:');
        console.log('  - id: serial (primary key)');
        console.log('  - session_id: varchar(255) (not null)');
        console.log('  - message: jsonb (not null)');
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkN8NTable();