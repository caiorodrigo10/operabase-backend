import { createClient } from '@supabase/supabase-js';

async function debugWhatsAppConversation() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('🔍 Verificando conversa do Caio Rodrigo...');
    
    // Verificar a conversa atual
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id, contact_id, whatsapp_chat_id, clinic_id, contacts!inner(name, phone)')
      .eq('id', '5511965860124551150391104')
      .single();

    if (error) {
      console.log('❌ Erro ao buscar conversa:', error);
      return;
    }

    console.log('📋 Estado atual da conversa:', {
      id: conversation.id,
      contact_id: conversation.contact_id,
      whatsapp_chat_id: conversation.whatsapp_chat_id || 'AUSENTE',
      clinic_id: conversation.clinic_id,
      contact_name: conversation.contacts.name,
      contact_phone: conversation.contacts.phone
    });

    // Verificar instância WhatsApp ativa
    const { data: whatsappInstance, error: instanceError } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('clinic_id', conversation.clinic_id)
      .eq('status', 'open')
      .single();

    if (instanceError) {
      console.log('❌ Erro ao buscar instância WhatsApp:', instanceError);
    } else {
      console.log('📱 Instância WhatsApp ativa encontrada:', {
        instance_id: whatsappInstance.instance_id,
        phone_number: whatsappInstance.phone_number,
        status: whatsappInstance.status
      });
    }

    // CORREÇÃO: Se não tem whatsapp_chat_id, usar o phone do contato
    if (!conversation.whatsapp_chat_id && conversation.contacts.phone) {
      const cleanPhone = conversation.contacts.phone.replace(/\D/g, '');
      console.log('🔧 Atualizando whatsapp_chat_id com phone do contato:', cleanPhone);
      
      const { data: updated, error: updateError } = await supabase
        .from('conversations')
        .update({ whatsapp_chat_id: cleanPhone })
        .eq('id', conversation.id)
        .select()
        .single();

      if (updateError) {
        console.log('❌ Erro ao atualizar conversa:', updateError);
      } else {
        console.log('✅ Conversa atualizada com whatsapp_chat_id:', updated.whatsapp_chat_id);
      }
    } else if (conversation.whatsapp_chat_id) {
      console.log('✅ Conversa já possui whatsapp_chat_id:', conversation.whatsapp_chat_id);
    } else {
      console.log('❌ Contato não possui telefone para configurar WhatsApp');
    }

  } catch (error) {
    console.log('❌ Erro geral:', error);
  }
}

debugWhatsAppConversation();