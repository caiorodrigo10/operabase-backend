/**
 * Teste de Compatibilidade: Metadata JSONB com clinic_id e knowledge_base_id
 * Valida que novos documentos incluem campos na coluna metadata para compatibilidade LangChain
 */

async function testMetadataCompatibility() {
  console.log('🧪 Iniciando teste de compatibilidade de metadata...');
  
  try {
    // 1. Login para obter token
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cr@caiorodrigo.com.br',
        password: '123456'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Falha no login');
    }
    
    const { token } = await loginResponse.json();
    console.log('✅ Login realizado com sucesso');
    
    // 2. Criar documento de texto
    console.log('📝 Criando documento de texto...');
    const textDocResponse = await fetch('http://localhost:5000/api/rag/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Teste Metadata Compatibility',
        content: 'Este é um documento de teste para validar que o metadata contém clinic_id e knowledge_base_id para compatibilidade com LangChain/Supabase estrutura oficial.',
        knowledge_base_id: 2, // Base "Oi"
        source: 'text'
      })
    });
    
    if (!textDocResponse.ok) {
      const error = await textDocResponse.text();
      throw new Error(`Falha ao criar documento: ${error}`);
    }
    
    const textDocResult = await textDocResponse.json();
    console.log('✅ Documento de texto criado:', textDocResult.data?.id);
    
    // 3. Verificar metadata no banco diretamente
    console.log('🔍 Verificando metadata no banco de dados...');
    const checkResponse = await fetch(`http://localhost:5000/api/rag/documents/${textDocResult.data?.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (checkResponse.ok) {
      const docData = await checkResponse.json();
      console.log('📊 Documento recuperado:', {
        id: docData.id,
        clinic_id_direct: docData.clinic_id,
        knowledge_base_id_direct: docData.knowledge_base_id,
        metadata: docData.metadata
      });
      
      // 4. Validar compatibilidade
      const metadata = docData.metadata || {};
      
      console.log('\n🧪 VALIDAÇÃO DE COMPATIBILIDADE:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Verificar colunas diretas
      const hasDirectClinicId = docData.clinic_id === 1;
      const hasDirectKnowledgeBaseId = docData.knowledge_base_id === 2;
      
      console.log(`✅ Coluna direta clinic_id: ${hasDirectClinicId ? '✓' : '✗'} (${docData.clinic_id})`);
      console.log(`✅ Coluna direta knowledge_base_id: ${hasDirectKnowledgeBaseId ? '✓' : '✗'} (${docData.knowledge_base_id})`);
      
      // Verificar metadata JSONB
      const hasMetadataClinicId = metadata.clinic_id === '1';
      const hasMetadataKnowledgeBaseId = metadata.knowledge_base_id === '2';
      
      console.log(`✅ Metadata clinic_id: ${hasMetadataClinicId ? '✓' : '✗'} (${metadata.clinic_id})`);
      console.log(`✅ Metadata knowledge_base_id: ${hasMetadataKnowledgeBaseId ? '✓' : '✗'} (${metadata.knowledge_base_id})`);
      
      // Verificar outros campos metadata
      console.log(`✅ Metadata title: ${metadata.title ? '✓' : '✗'} (${metadata.title})`);
      console.log(`✅ Metadata source: ${metadata.source ? '✓' : '✗'} (${metadata.source})`);
      console.log(`✅ Metadata created_by: ${metadata.created_by ? '✓' : '✗'} (${metadata.created_by})`);
      
      console.log('\n📋 COMPATIBILIDADE FINAL:');
      const isFullyCompatible = hasDirectClinicId && hasDirectKnowledgeBaseId && 
                               hasMetadataClinicId && hasMetadataKnowledgeBaseId;
      
      if (isFullyCompatible) {
        console.log('🎉 SUCESSO: Sistema 100% compatível com LangChain/Supabase!');
        console.log('   • Colunas diretas para performance ✓');
        console.log('   • Metadata JSONB para compatibilidade ✓');
        console.log('   • Campos obrigatórios presentes ✓');
      } else {
        console.log('❌ FALHA: Sistema não está totalmente compatível');
      }
      
    } else {
      console.log('❌ Erro ao recuperar documento para verificação');
    }
    
    console.log('\n✅ Teste de compatibilidade de metadata concluído');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testMetadataCompatibility();