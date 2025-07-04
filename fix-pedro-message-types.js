/**
 * Script para corrigir os tipos de mensagem do Pedro Oliveira
 * Atualiza mensagens que deveriam ser de mídia mas estão como texto
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPedroMessageTypes() {
  try {
    console.log('🔍 Verificando mensagens do Pedro Oliveira (conversa ID: 4)...');
    
    // Buscar todas as mensagens da conversa 4 (Pedro Oliveira)
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

    // Mensagens que precisam ser corrigidas baseado no conteúdo
    const corrections = [];

    messages.forEach(msg => {
      let newContent = msg.content;
      let needsUpdate = false;

      // Detectar mensagens de áudio (que têm 🎤) e formatar corretamente
      if (msg.content && msg.content.includes('🎤')) {
        // Remover emoji e formatar como áudio
        newContent = `[ÁUDIO] ${msg.content.replace('🎤 ', '')}`;
        needsUpdate = true;
      }
      
      // Detectar mensagens de imagem (que têm 📷) e formatar corretamente
      else if (msg.content && msg.content.includes('📷')) {
        // Remover emoji e formatar como imagem
        newContent = `[IMAGEM] ${msg.content.replace('📷 ', '')}`;
        needsUpdate = true;
      }
      
      // Detectar mensagens de documento (que têm 📎) e formatar corretamente
      else if (msg.content && msg.content.includes('📎')) {
        // Remover emoji e formatar como documento
        newContent = `[DOCUMENTO] ${msg.content.replace('📎 ', '')}`;
        needsUpdate = true;
      }

      // Se houve mudança, adicionar à lista de correções
      if (needsUpdate) {
        corrections.push({
          id: msg.id,
          oldContent: msg.content,
          newContent: newContent
        });
      }
    });

    console.log(`🔧 Encontradas ${corrections.length} mensagens para corrigir`);

    if (corrections.length === 0) {
      console.log('✅ Nenhuma correção necessária');
      return;
    }

    // Aplicar as correções
    for (const correction of corrections) {
      console.log(`📝 Corrigindo mensagem ${correction.id}`);
      console.log(`   De: ${correction.oldContent}`);
      console.log(`   Para: ${correction.newContent}`);
      
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          content: correction.newContent
        })
        .eq('id', correction.id);

      if (updateError) {
        console.error(`❌ Erro ao atualizar mensagem ${correction.id}:`, updateError);
      } else {
        console.log(`✅ Mensagem ${correction.id} atualizada com sucesso`);
      }
    }

    console.log('🎉 Correções aplicadas com sucesso!');
    
    // Verificar o resultado final
    console.log('\n📊 Resumo final:');
    const { data: finalMessages } = await supabase
      .from('messages')
      .select('content')
      .eq('conversation_id', 4);

    if (finalMessages) {
      const typeCounts = finalMessages.reduce((acc, msg) => {
        if (msg.content.startsWith('[ÁUDIO]')) acc.audio = (acc.audio || 0) + 1;
        else if (msg.content.startsWith('[IMAGEM]')) acc.image = (acc.image || 0) + 1;
        else if (msg.content.startsWith('[DOCUMENTO]')) acc.document = (acc.document || 0) + 1;
        else acc.text = (acc.text || 0) + 1;
        return acc;
      }, {});

      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} mensagens`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixPedroMessageTypes();