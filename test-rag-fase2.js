// Teste completo do sistema RAG Fase 2
const testRAGPhase2 = async () => {
  try {
    console.log('🚀 Testando RAG Fase 2 - Processamento de documentos...');
    
    // Teste 1: Criar documento de texto e processar
    console.log('📝 Testando processamento de texto...');
    const textResponse = await fetch('http://localhost:5000/api/rag/documents/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        title: 'Protocolo Cardiologia - Teste RAG',
        content: `Protocolo para Consulta de Cardiologia

1. Anamnese Inicial
- Histórico familiar de doenças cardiovasculares
- Sintomas como dor torácica, dispneia, palpitações
- Fatores de risco: tabagismo, diabetes, hipertensão

2. Exame Físico
- Verificação de pressão arterial
- Ausculta cardíaca e pulmonar
- Palpação de pulsos periféricos
- Avaliação de edema

3. Exames Complementares
- Eletrocardiograma (ECG) de repouso
- Ecocardiograma quando indicado
- Teste ergométrico para avaliação de capacidade funcional

4. Orientações ao Paciente
- Mudanças no estilo de vida
- Dieta cardioprotetora
- Atividade física regular
- Controle de fatores de risco

Este protocolo deve ser seguido em todas as consultas de cardiologia para garantir um atendimento padronizado e de qualidade.`
      })
    });
    
    let documentId;
    if (textResponse.ok) {
      const result = await textResponse.json();
      documentId = result.documentId;
      console.log(`✅ Documento criado: ID ${documentId}`);
      
      // Aguardar processamento
      console.log('⏳ Aguardando processamento...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verificar status
      const statusResponse = await fetch(`http://localhost:5000/api/rag/processing/${documentId}`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('📊 Status do processamento:', status);
      }
      
    } else {
      console.log('❌ Falha no upload de texto:', await textResponse.text());
    }
    
    // Teste 2: Listar documentos
    console.log('📋 Verificando documentos processados...');
    const listResponse = await fetch('http://localhost:5000/api/rag/documents', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (listResponse.ok) {
      const documents = await listResponse.json();
      console.log(`✅ Total de documentos: ${documents.length}`);
      documents.forEach(doc => {
        console.log(`- ${doc.title}: ${doc.processing_status}`);
      });
    } else {
      console.log('❌ Falha na listagem:', listResponse.status);
    }
    
    console.log('🎯 Teste da Fase 2 concluído');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Executar teste
testRAGPhase2();