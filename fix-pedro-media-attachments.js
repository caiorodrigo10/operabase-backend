/**
 * Script para corrigir as mensagens de mídia do Pedro Oliveira
 * Remove os prefixos do conteúdo e cria anexos na tabela message_attachments
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPedroMediaAttachments() {
  try {
    console.log('🔍 Corrigindo mensagens de mídia do Pedro Oliveira (conversa ID: 4)...');
    
    // Buscar mensagens com prefixos de mídia
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', 4)
      .order('timestamp', { ascending: true });

    if (fetchError) {
      console.error('❌ Erro ao buscar mensagens:', fetchError);
      return;
    }

    console.log(`📊 Encontradas ${messages.length} mensagens`);

    // Encontrar mensagens de mídia e processar
    const mediaMessages = messages.filter(msg => 
      msg.content && (
        msg.content.startsWith('[ÁUDIO]') ||
        msg.content.startsWith('[IMAGEM]') ||
        msg.content.startsWith('[DOCUMENTO]')
      )
    );

    console.log(`🎬 Encontradas ${mediaMessages.length} mensagens de mídia para processar`);

    if (mediaMessages.length === 0) {
      console.log('✅ Nenhuma mensagem de mídia encontrada');
      return;
    }

    // Processar cada mensagem de mídia
    for (const message of mediaMessages) {
      let mediaType = '';
      let fileName = '';
      let fileType = '';
      let cleanContent = '';

      if (message.content.startsWith('[ÁUDIO]')) {
        mediaType = 'audio';
        fileType = 'audio/mp3';
        cleanContent = message.content.replace('[ÁUDIO] ', '');
        fileName = `audio_${message.id}.mp3`;
        
        // Extrair nome do arquivo se houver
        const match = cleanContent.match(/Áudio sobre (.+?) \((\d+:\d+)\)/);
        if (match) {
          fileName = `audio_${match[1].replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
        }
      } else if (message.content.startsWith('[IMAGEM]')) {
        mediaType = 'image';
        fileType = 'image/jpeg';
        cleanContent = message.content.replace('[IMAGEM] ', '');
        fileName = `image_${message.id}.jpg`;
        
        // Extrair nome do arquivo se houver
        if (cleanContent.includes('receita')) {
          fileName = 'receita_medica.jpg';
        }
      } else if (message.content.startsWith('[DOCUMENTO]')) {
        mediaType = 'document';
        fileType = 'application/pdf';
        cleanContent = message.content.replace('[DOCUMENTO] ', '');
        fileName = cleanContent || `document_${message.id}.pdf`;
      }

      console.log(`📎 Processando ${mediaType}: ${fileName}`);

      // Atualizar o conteúdo da mensagem (remover prefixo)
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          content: cleanContent
        })
        .eq('id', message.id);

      if (updateError) {
        console.error(`❌ Erro ao atualizar mensagem ${message.id}:`, updateError);
        continue;
      }

      // Criar anexo na tabela message_attachments
      const { error: attachmentError } = await supabase
        .from('message_attachments')
        .insert({
          message_id: message.id,
          clinic_id: 1, // Clínica do Pedro
          file_name: fileName,
          file_type: fileType,
          file_size: mediaType === 'audio' ? 45000 : mediaType === 'image' ? 150000 : 250000, // Tamanhos estimados
          file_url: `/uploads/${fileName}`, // URL local simulada
          whatsapp_media_id: `media_${message.id}`,
          whatsapp_media_url: `https://media.whatsapp.net/${message.id}`,
          duration: mediaType === 'audio' ? 45 : null, // 45 segundos para áudio
          width: mediaType === 'image' ? 1080 : null,
          height: mediaType === 'image' ? 1920 : null,
        });

      if (attachmentError) {
        console.error(`❌ Erro ao criar anexo para mensagem ${message.id}:`, attachmentError);
      } else {
        console.log(`✅ Anexo criado para mensagem ${message.id}`);
      }
    }

    console.log('🎉 Correções aplicadas com sucesso!');
    
    // Verificar resultado final
    console.log('\n📊 Resumo final:');
    const { data: finalAttachments } = await supabase
      .from('message_attachments')
      .select('file_type, file_name')
      .in('message_id', mediaMessages.map(m => m.id));

    if (finalAttachments) {
      console.log(`📎 ${finalAttachments.length} anexos criados:`);
      finalAttachments.forEach(att => {
        console.log(`  - ${att.file_name} (${att.file_type})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixPedroMediaAttachments();