#!/usr/bin/env tsx

import { supabaseAdmin } from './server/supabase-client.js';

async function checkCalendarIntegrations() {
  console.log('🔍 Verificando integrações do Google Calendar no Supabase...');
  
  try {
    const { data, error } = await supabaseAdmin
      .from('calendar_integrations')
      .select('*');
    
    if (error) {
      console.log('❌ Erro:', error.message);
      return;
    }
    
    console.log('📊 Integrações encontradas:', data?.length || 0);
    
    if (data && data.length > 0) {
      data.forEach((integration, index) => {
        console.log(`\nIntegração ${index + 1}:`);
        console.log(`- ID: ${integration.id}`);
        console.log(`- Usuário: ${integration.user_id}`);
        console.log(`- Clínica: ${integration.clinic_id}`);
        console.log(`- Provider: ${integration.provider}`);
        console.log(`- Email: ${integration.email || 'Não definido'}`);
        console.log(`- Calendar ID: ${integration.calendar_id || 'Não definido'}`);
        console.log(`- Ativo: ${integration.is_active ? 'Sim' : 'Não'}`);
        console.log(`- Sync habilitado: ${integration.sync_enabled ? 'Sim' : 'Não'}`);
        console.log(`- Última sincronização: ${integration.last_sync_at || 'Nunca'}`);
        console.log(`- Criado em: ${integration.created_at}`);
      });
    } else {
      console.log('ℹ️  Nenhuma integração encontrada no Supabase');
      console.log('💡 As integrações podem ainda estar no PostgreSQL local');
    }
    
  } catch (err) {
    console.log('❌ Erro de conexão:', err);
  }
}

checkCalendarIntegrations();