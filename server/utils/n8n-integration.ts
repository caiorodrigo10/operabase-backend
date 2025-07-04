/**
 * Utilitário de Integração N8N
 * Salva mensagens na tabela n8n_chat_messages para memória da IA
 * Reutiliza lógica do sistema de mensagens de texto existente
 */

export async function saveToN8NTable(
  conversationId: string, 
  content: string, 
  messageType: 'human' | 'ai' = 'human'
): Promise<void> {
  
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    console.log('📋 N8N Integration: Iniciando para conversa:', conversationId);
    
    // 1. Buscar contato da conversa
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('contact_id')
      .eq('id', conversationId)
      .eq('clinic_id', 1)
      .single();
    
    if (conversationError || !conversation) {
      console.error('❌ N8N Integration: Erro ao buscar conversa:', conversationError?.message);
      return;
    }
    
    // 2. Buscar telefone do contato
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('phone')
      .eq('id', conversation.contact_id)
      .eq('clinic_id', 1)
      .single();
    
    if (contactError || !contact?.phone) {
      console.log('⚠️ N8N Integration: Telefone do contato não encontrado');
      return;
    }
    
    console.log('✅ N8N Integration: Contato encontrado:', {
      conversationId,
      contactId: conversation.contact_id,
      contactPhone: contact.phone
    });
    
    // 3. Buscar número WhatsApp da clínica (mesma lógica do sistema atual)
    const { data: clinicWhatsApp, error: whatsappError } = await supabase
      .from('whatsapp_numbers')
      .select('phone_number')
      .eq('clinic_id', 1)
      .eq('status', 'open')
      .limit(1)
      .single();
    
    if (whatsappError || !clinicWhatsApp?.phone_number) {
      console.log('⚠️ N8N Integration: Número da clínica não encontrado:', whatsappError?.message);
      return;
    }
    
    console.log('✅ N8N Integration: Número da clínica encontrado:', clinicWhatsApp.phone_number);
    
    // 4. Formatar session_id: "CONTACT_PHONE-CLINIC_PHONE" (formato padrão identificado)
    const sessionId = `${contact.phone}-${clinicWhatsApp.phone_number}`;
    console.log('🆔 N8N Integration: Session ID formatado:', sessionId);
    
    // 4. Criar estrutura de mensagem EXATAMENTE como no sistema atual
    const n8nMessage = {
      type: messageType,
      content: content,
      additional_kwargs: {},
      response_metadata: {}
    };
    
    console.log('📝 N8N Integration: Estrutura da mensagem:', {
      type: n8nMessage.type,
      contentLength: content.length,
      contentPreview: content.substring(0, 50) + (content.length > 50 ? '...' : '')
    });
    
    // 5. Inserir na tabela n8n_chat_messages
    const { data: insertResult, error: insertError } = await supabase
      .from('n8n_chat_messages')
      .insert({
        session_id: sessionId,
        message: n8nMessage
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ N8N Integration: Erro ao inserir na tabela:', insertError);
      throw new Error(`Supabase insert error: ${insertError.message}`);
    }
    
    console.log('✅ N8N Integration: Mensagem salva com sucesso!', {
      n8n_id: insertResult?.id,
      session_id: sessionId,
      message_type: messageType,
      content_length: content.length,
      content_preview: content.substring(0, 50) + (content.length > 50 ? '...' : '')
    });
    
  } catch (error: any) {
    console.error('❌ N8N Integration: Erro geral:', {
      message: error.message,
      conversationId,
      contentLength: content?.length || 0
    });
    throw error;
  }
}

/**
 * Função para testar a integração N8N
 * Útil para debugging e validação
 */
export async function testN8NIntegration(conversationId: string, testContent: string = "Teste de integração N8N"): Promise<boolean> {
  try {
    await saveToN8NTable(conversationId, testContent, 'human');
    console.log('✅ Teste N8N Integration: Sucesso');
    return true;
  } catch (error: any) {
    console.error('❌ Teste N8N Integration: Falha -', error.message);
    return false;
  }
}