/**
 * Script para testar a integração N8N - validar se mensagens do chat interno
 * são salvas corretamente na tabela n8n_chat_messages
 */

async function testN8NIntegration() {
  try {
    console.log('🧪 Iniciando teste da integração N8N...');
    
    // Primeiro verificar dados existentes
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('\n1️⃣ Verificando dados existentes na tabela n8n_chat_messages...');
    const { data: existingMessages, error: existingError } = await supabase
      .from('n8n_chat_messages')
      .select('*')
      .order('id', { ascending: false })
      .limit(5);
      
    if (existingError) {
      console.error('❌ Erro ao buscar mensagens existentes:', existingError);
      return;
    }
    
    console.log('📊 Mensagens existentes:', existingMessages?.length || 0);
    if (existingMessages && existingMessages.length > 0) {
      console.log('📋 Últimas mensagens:');
      existingMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ID: ${msg.id}, Session: ${msg.session_id}, Content: "${msg.message?.content?.substring(0, 30)}..."`);
      });
    }

    console.log('\n2️⃣ Testando envio de mensagem via API...');
    
    // Buscar uma conversa existente para testar
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        contact_id,
        contacts!inner(name, phone)
      `)
      .eq('clinic_id', 1)
      .limit(1)
      .single();
      
    if (convError || !conversation) {
      console.error('❌ Não foi possível encontrar conversa para teste:', convError);
      return;
    }
    
    console.log('✅ Conversa encontrada para teste:', {
      id: conversation.id,
      contact: conversation.contacts.name,
      phone: conversation.contacts.phone
    });

    // Enviar mensagem de teste via API
    const testMessage = `Teste N8N Integration - ${new Date().toISOString()}`;
    console.log('\n📤 Enviando mensagem de teste:', testMessage);
    
    const response = await fetch(`http://localhost:5000/api/conversations-simple/${conversation.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: testMessage
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao enviar mensagem:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Mensagem enviada com sucesso:', {
      message_id: result.message?.id,
      content: result.message?.content?.substring(0, 30) + '...'
    });
    
    // Aguardar um momento para a integração N8N processar
    console.log('\n⏳ Aguardando processamento da integração N8N (3 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n3️⃣ Verificando se mensagem foi salva na tabela n8n_chat_messages...');
    
    const { data: newMessages, error: newError } = await supabase
      .from('n8n_chat_messages')
      .select('*')
      .filter('message->>content', 'ilike', `%${testMessage}%`)
      .order('id', { ascending: false });
      
    if (newError) {
      console.error('❌ Erro ao verificar nova mensagem:', newError);
      return;
    }
    
    if (newMessages && newMessages.length > 0) {
      console.log('🎉 SUCESSO! Mensagem encontrada na tabela n8n_chat_messages:');
      newMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ID: ${msg.id}`);
        console.log(`     Session ID: ${msg.session_id}`);
        console.log(`     Type: ${msg.message?.type}`);
        console.log(`     Content: "${msg.message?.content}"`);
        console.log(`     Additional kwargs: ${JSON.stringify(msg.message?.additional_kwargs)}`);
        console.log(`     Response metadata: ${JSON.stringify(msg.message?.response_metadata)}`);
      });
      
      // Validar formato do session_id
      const sessionId = newMessages[0].session_id;
      if (sessionId && sessionId.includes('-')) {
        const [contactPhone, clinicPhone] = sessionId.split('-');
        console.log('✅ Formato do session_id correto:', {
          contact_phone: contactPhone,
          clinic_phone: clinicPhone,
          format: 'CONTACT_NUMBER-RECEIVING_NUMBER'
        });
      } else {
        console.log('⚠️ Formato do session_id pode estar incorreto:', sessionId);
      }
      
    } else {
      console.log('❌ FALHA! Mensagem não foi encontrada na tabela n8n_chat_messages');
      console.log('🔍 Verificando mensagens recentes na tabela...');
      
      const { data: recentMessages } = await supabase
        .from('n8n_chat_messages')
        .select('*')
        .order('id', { ascending: false })
        .limit(3);
        
      console.log('📋 Últimas 3 mensagens na tabela:');
      recentMessages?.forEach((msg, index) => {
        console.log(`  ${index + 1}. ID: ${msg.id}, Content: "${msg.message?.content?.substring(0, 50)}..."`);
      });
    }
    
    console.log('\n4️⃣ Verificando logs do servidor para debug...');
    console.log('🔍 Procure nos logs do servidor por:');
    console.log('   - "🔗 Iniciando integração N8N para mensagem ID:"');
    console.log('   - "✅ N8N Integration: Mensagem salva com sucesso!"');
    console.log('   - "❌ N8N Integration: Erro ao salvar mensagem:"');
    
    console.log('\n✅ Teste da integração N8N concluído!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

testN8NIntegration();