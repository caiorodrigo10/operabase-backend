// Teste do sistema RAG
const testRAGSystem = async () => {
  try {
    console.log('🚀 Testando sistema RAG...');
    
    // Teste 1: Criar documento de texto
    console.log('📝 Testando upload de texto...');
    const textResponse = await fetch('http://localhost:5000/api/rag/documents/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=test-session'
      },
      body: JSON.stringify({
        title: 'Documento de Teste RAG',
        content: 'Este é um documento de teste para verificar se o sistema RAG está funcionando corretamente. O sistema deve processar este texto e criar embeddings para busca semântica. Tópicos incluem: medicina, cardiologia, consultas médicas, agendamentos.'
      })
    });
    
    if (textResponse.ok) {
      const result = await textResponse.json();
      console.log('✅ Upload de texto funcionando:', result);
    } else {
      console.log('❌ Falha no upload de texto:', textResponse.status);
    }
    
    // Teste 2: Listar documentos
    console.log('📋 Testando listagem de documentos...');
    const listResponse = await fetch('http://localhost:5000/api/rag/documents', {
      headers: {
        'Cookie': 'connect.sid=test-session'
      }
    });
    
    if (listResponse.ok) {
      const documents = await listResponse.json();
      console.log('✅ Listagem funcionando. Total de documentos:', documents.length);
    } else {
      console.log('❌ Falha na listagem:', listResponse.status);
    }
    
    console.log('🎯 Teste concluído');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Executar teste
testRAGSystem();