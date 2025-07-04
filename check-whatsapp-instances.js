import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkWhatsAppInstances() {
  try {
    console.log('🔍 Verificando instâncias WhatsApp disponíveis...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('clinic_id', 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao consultar:', error);
      return;
    }
    
    console.log('📊 Instâncias encontradas:');
    data.forEach((instance, i) => {
      console.log(`${i + 1}. ${instance.instance_name}`);
      console.log(`   📱 Phone: ${instance.phone_number}`);
      console.log(`   🔗 Status: ${instance.status}`);
      console.log(`   📅 Created: ${instance.created_at}`);
      console.log('');
    });
    
    const openInstances = data.filter(i => i.status === 'open');
    console.log(`✅ Instâncias ABERTAS: ${openInstances.length}`);
    
    if (openInstances.length > 0) {
      console.log('🟢 Instância ativa atual:');
      console.log(`   Nome: ${openInstances[0].instance_name}`);
      console.log(`   Phone: ${openInstances[0].phone_number}`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkWhatsAppInstances();