/**
 * Script para testar o novo tipo audio_file
 * Cria uma mensagem com anexo de áudio que deve mostrar "Áudio encaminhado"
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAudioFileType() {
  try {
    console.log('🧪 Testando novo tipo audio_file...');
    
    // 1. Verificar mensagens existentes
    const conversationId = '5598876940345511948922493';
    
    console.log('🔍 Verificando conversa atual:', conversationId);
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, message_type, content')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });
    
    if (messagesError) throw messagesError;
    
    console.log('📊 Mensagens atuais:', messages.length);
    messages.forEach(msg => {
      console.log(`  - ID: ${msg.id}, Tipo: ${msg.message_type}`);
    });
    
    // 2. Criar nova mensagem com tipo audio_file
    console.log('\n💾 Criando mensagem com audio_file...');
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'professional',
        content: '🎵 Áudio do médico enviado',
        message_type: 'audio_file', // Novo tipo!
        evolution_status: 'sent',
        ai_action: 'file_upload'
      })
      .select()
      .single();
    
    if (messageError) throw messageError;
    console.log('✅ Mensagem criada:', newMessage.id);
    
    // 3. Criar anexo de áudio básico
    console.log('📎 Criando anexo de áudio...');
    const { data: attachment, error: attachmentError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: newMessage.id,
        clinic_id: 1,
        file_name: 'consulta-medica.mp3',
        file_type: 'audio/mp3',
        file_size: 2458921,
        file_url: 'https://example.com/audio/consulta-medica.mp3'
      })
      .select()
      .single();
    
    if (attachmentError) throw attachmentError;
    console.log('✅ Anexo criado:', attachment.id);
    
    console.log('\n🎯 Teste completo!');
    console.log('📋 Resultado esperado:');
    console.log('  - Mensagem deve aparecer como áudio normal');
    console.log('  - Deve mostrar "Áudio encaminhado" em texto pequeno');
    console.log('  - Diferente dos áudios do WhatsApp que não têm esse texto');
    
    console.log('\n🔍 Para verificar:');
    console.log('  1. Abra a conversa do Caio Rodrigo');
    console.log('  2. Veja a última mensagem');
    console.log('  3. Verifique se aparece "Áudio encaminhado" abaixo da barra');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testAudioFileType();