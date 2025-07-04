/**
 * Debug Completo: Upload de Áudio - Sistema vs Evolution API
 * Identifica exatamente onde está falhando o envio para WhatsApp
 */

import { createClient } from '@supabase/supabase-js';

async function debugAudioUploadComplete() {
  console.log('🔧 DEBUG COMPLETO: Sistema de Upload de Áudio');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Credenciais Supabase não encontradas');
    return;
  }

  if (!evolutionUrl || !evolutionApiKey) {
    console.error('❌ Credenciais Evolution API não encontradas');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('\n📋 PASSO 1: Verificar mensagens de áudio recentes');
    const { data: audioMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        message_attachments(*)
      `)
      .eq('message_type', 'audio_voice')
      .order('created_at', { ascending: false })
      .limit(3);

    if (messagesError) throw messagesError;
    
    console.log(`✅ Encontradas ${audioMessages.length} mensagens de áudio recentes:`);
    audioMessages.forEach((msg, idx) => {
      console.log(`  ${idx + 1}. ID: ${msg.id}, Status: ${msg.evolution_status}, Anexos: ${msg.message_attachments.length}`);
    });

    if (audioMessages.length === 0) {
      console.log('❌ Nenhuma mensagem de áudio encontrada');
      return;
    }

    const latestAudio = audioMessages[0];
    const attachment = latestAudio.message_attachments[0];

    console.log('\n📋 PASSO 2: Analisar última mensagem de áudio');
    console.log('💾 Mensagem:', {
      id: latestAudio.id,
      conversation_id: latestAudio.conversation_id,
      evolution_status: latestAudio.evolution_status,
      timestamp: latestAudio.timestamp
    });

    console.log('📎 Anexo:', {
      id: attachment.id,
      file_name: attachment.file_name,
      file_type: attachment.file_type,
      file_size: attachment.file_size,
      file_url: attachment.file_url ? 'DEFINIDO' : 'NÃO DEFINIDO'
    });

    console.log('\n📋 PASSO 3: Testar acesso ao arquivo no Supabase Storage');
    try {
      const fileResponse = await fetch(attachment.file_url, { method: 'HEAD' });
      console.log('✅ Arquivo acessível no Supabase:', fileResponse.ok, `(${fileResponse.status})`);
      
      if (fileResponse.ok) {
        const headers = {};
        fileResponse.headers.forEach((value, key) => {
          headers[key] = value;
        });
        console.log('📊 Headers do arquivo:', headers);
      }
    } catch (fetchError) {
      console.error('❌ Erro ao acessar arquivo:', fetchError.message);
    }

    console.log('\n📋 PASSO 4: Verificar configuração da conversa');
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        contacts(phone)
      `)
      .eq('id', latestAudio.conversation_id)
      .single();

    if (convError) throw convError;

    console.log('📞 Conversa:', {
      id: conversation.id,
      clinic_id: conversation.clinic_id,
      contact_phone: conversation.contacts?.phone
    });

    console.log('\n📋 PASSO 5: Verificar instância WhatsApp');
    const { data: whatsappInstance, error: instanceError } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('clinic_id', conversation.clinic_id)
      .eq('status', 'open')
      .single();

    if (instanceError) {
      console.error('❌ Erro ao buscar instância WhatsApp:', instanceError);
      console.log('🔍 Tentando buscar todas as instâncias da clínica...');
      
      const { data: allInstances } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('clinic_id', conversation.clinic_id);
      
      console.log('📱 Instâncias encontradas:', allInstances?.length || 0);
      allInstances?.forEach((inst, idx) => {
        console.log(`  ${idx + 1}. Nome: ${inst.instance_name}, Status: ${inst.status}`);
      });
    } else {
      console.log('✅ Instância WhatsApp:', {
        instance_name: whatsappInstance.instance_name,
        status: whatsappInstance.status
      });

      console.log('\n📋 PASSO 6: Testar Evolution API diretamente');
      const phoneNumber = conversation.contacts.phone.replace(/\D/g, '');
      const testPayload = {
        number: phoneNumber,
        audio: attachment.file_url
      };

      console.log('🔧 Payload para Evolution API:', testPayload);
      console.log('🌐 URL:', `${evolutionUrl}/message/sendWhatsAppAudio/${whatsappInstance.instance_name}`);

      try {
        const evolutionResponse = await fetch(`${evolutionUrl}/message/sendWhatsAppAudio/${whatsappInstance.instance_name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey
          },
          body: JSON.stringify(testPayload)
        });

        const responseText = await evolutionResponse.text();
        console.log('📡 Evolution API Response:', {
          status: evolutionResponse.status,
          statusText: evolutionResponse.statusText,
          ok: evolutionResponse.ok
        });

        try {
          const responseJson = JSON.parse(responseText);
          console.log('📋 Response JSON:', responseJson);
        } catch (parseError) {
          console.log('📋 Response Text (não é JSON):', responseText);
        }

        if (!evolutionResponse.ok) {
          console.log('\n❌ ERRO IDENTIFICADO NA EVOLUTION API');
          console.log('🔍 Status Code:', evolutionResponse.status);
          console.log('🔍 Status Text:', evolutionResponse.statusText);
          console.log('🔍 Response Body:', responseText);
          
          // Testar outros endpoints
          console.log('\n🧪 Testando endpoint alternativo /sendMedia...');
          const mediaPayload = {
            number: phoneNumber,
            mediatype: 'audio',
            media: attachment.file_url,
            fileName: attachment.file_name
          };

          const mediaResponse = await fetch(`${evolutionUrl}/message/sendMedia/${whatsappInstance.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            body: JSON.stringify(mediaPayload)
          });

          const mediaResponseText = await mediaResponse.text();
          console.log('📡 /sendMedia Response:', {
            status: mediaResponse.status,
            statusText: mediaResponse.statusText,
            ok: mediaResponse.ok,
            body: mediaResponseText
          });
        }

      } catch (evolutionError) {
        console.error('❌ Erro na chamada Evolution API:', evolutionError.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
}

debugAudioUploadComplete();