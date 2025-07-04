/**
 * Script para testar sistema de profile pictures
 * Adiciona profile_picture de exemplo a um contato para testar a funcionalidade
 */

import { createClient } from '@supabase/supabase-js';

async function addProfilePictureTest() {
  try {
    console.log('🚀 Iniciando teste de profile picture...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar contatos existentes na clínica 1
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, name, phone, profile_picture')
      .eq('clinic_id', 1)
      .limit(5);

    if (contactsError) {
      console.error('❌ Erro ao buscar contatos:', contactsError);
      return;
    }

    console.log('📋 Contatos encontrados:', contacts?.length || 0);
    contacts?.forEach(contact => {
      console.log(`  - ${contact.name} (ID: ${contact.id}) | Phone: ${contact.phone} | Avatar: ${contact.profile_picture || 'NENHUM'}`);
    });

    // Adicionar profile_picture de exemplo ao primeiro contato
    if (contacts && contacts.length > 0) {
      const testContact = contacts[0];
      
      // URL de exemplo de avatar (Gravatar de teste)
      const testAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(testContact.name)}&backgroundColor=0f766e&color=ffffff`;
      
      console.log(`\n🔧 Adicionando profile_picture ao contato: ${testContact.name}`);
      console.log(`📷 URL do avatar: ${testAvatarUrl}`);
      
      const { data: updatedContact, error: updateError } = await supabase
        .from('contacts')
        .update({ profile_picture: testAvatarUrl })
        .eq('id', testContact.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erro ao atualizar contato:', updateError);
        return;
      }

      console.log('✅ Profile picture adicionado com sucesso!');
      console.log('📊 Dados atualizados:', {
        id: updatedContact.id,
        name: updatedContact.name,
        profile_picture: updatedContact.profile_picture
      });

      // Verificar se há conversas para este contato
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, contact_id')
        .eq('contact_id', testContact.id)
        .eq('clinic_id', 1);

      if (convError) {
        console.error('❌ Erro ao buscar conversas:', convError);
        return;
      }

      console.log(`🗨️ Conversas encontradas para ${testContact.name}: ${conversations?.length || 0}`);
      conversations?.forEach(conv => {
        console.log(`  - Conversa ID: ${conv.id}`);
      });

      console.log('\n🎯 Teste concluído! Verifique na interface se o avatar aparece nas conversas.');
    } else {
      console.log('❌ Nenhum contato encontrado para teste');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar automaticamente
addProfilePictureTest().then(() => {
  console.log('✅ Script concluído');
}).catch((error) => {
  console.error('❌ Erro no script:', error);
});