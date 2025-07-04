/**
 * Script para adicionar profile pictures a mais contatos para teste completo
 */

import { createClient } from '@supabase/supabase-js';

async function addMoreProfilePictures() {
  try {
    console.log('🚀 Adicionando profile pictures a mais contatos...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Contatos específicos para testar
    const contactsToUpdate = [
      { name: 'Carla Mendes', id: 2 },
      { name: 'Sofia Almeida', id: 4 },
      { name: 'Maria Oliveira Santos', id: 33 }
    ];

    for (const contact of contactsToUpdate) {
      const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(contact.name)}&backgroundColor=0f766e&color=ffffff`;
      
      console.log(`\n🔧 Atualizando ${contact.name} (ID: ${contact.id})`);
      console.log(`📷 Avatar: ${avatarUrl}`);
      
      const { data, error } = await supabase
        .from('contacts')
        .update({ profile_picture: avatarUrl })
        .eq('id', contact.id)
        .select()
        .single();

      if (error) {
        console.error(`❌ Erro ao atualizar ${contact.name}:`, error);
        continue;
      }

      console.log(`✅ ${contact.name} atualizado com sucesso!`);
      
      // Verificar conversas
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('clinic_id', 1);

      console.log(`🗨️ Conversas: ${conversations?.length || 0}`);
    }

    console.log('\n🎯 Todos os profile pictures adicionados! Teste o sistema na interface.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar automaticamente
addMoreProfilePictures().then(() => {
  console.log('✅ Script concluído');
}).catch((error) => {
  console.error('❌ Erro no script:', error);
});