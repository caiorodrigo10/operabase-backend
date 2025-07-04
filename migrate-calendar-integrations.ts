#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';

async function migrateCalendarIntegrations() {
  console.log('🔍 Verificando integrações do Google Calendar...');
  
  try {
    // Buscar integrações no PostgreSQL local
    const localIntegrations = await db.select().from(schema.calendar_integrations);
    console.log(`📊 Integrações encontradas no PostgreSQL: ${localIntegrations.length}`);
    
    if (localIntegrations.length === 0) {
      console.log('ℹ️ Nenhuma integração para migrar');
      return;
    }
    
    // Mostrar detalhes das integrações locais
    localIntegrations.forEach((integration, index) => {
      console.log(`\nIntegração ${index + 1} (PostgreSQL):`);
      console.log(`- ID: ${integration.id}`);
      console.log(`- Usuário: ${integration.user_id}`);
      console.log(`- Email: ${integration.email || 'Não definido'}`);
      console.log(`- Provider: ${integration.provider}`);
      console.log(`- Ativo: ${integration.is_active ? 'Sim' : 'Não'}`);
    });
    
    // Migrar para Supabase
    console.log('\n🚀 Migrando integrações para Supabase...');
    
    const { data, error } = await supabaseAdmin
      .from('calendar_integrations')
      .insert(localIntegrations)
      .select();
    
    if (error) {
      console.log('❌ Erro na migração:', error.message);
      
      // Tentar uma por vez se falhar
      let successCount = 0;
      for (const integration of localIntegrations) {
        const { error: singleError } = await supabaseAdmin
          .from('calendar_integrations')
          .insert([integration]);
        
        if (!singleError) {
          successCount++;
        } else {
          console.log(`❌ Erro ao migrar integração ${integration.id}: ${singleError.message}`);
        }
      }
      console.log(`✅ Migradas ${successCount}/${localIntegrations.length} integrações`);
    } else {
      console.log(`✅ Todas as ${data?.length || 0} integrações migradas com sucesso`);
    }
    
    // Verificar resultado no Supabase
    const { data: supabaseIntegrations } = await supabaseAdmin
      .from('calendar_integrations')
      .select('*');
    
    console.log(`\n📊 Total no Supabase: ${supabaseIntegrations?.length || 0} integrações`);
    
  } catch (error) {
    console.log('❌ Erro:', error);
  }
}

async function showCalendarIntegrationsLocation() {
  console.log('📍 LOCALIZAÇÃO DAS INTEGRAÇÕES DO GOOGLE CALENDAR');
  console.log('================================================');
  
  // Verificar PostgreSQL local
  try {
    const localIntegrations = await db.select().from(schema.calendar_integrations);
    console.log(`PostgreSQL Local: ${localIntegrations.length} integrações`);
  } catch (error) {
    console.log('PostgreSQL Local: Erro ao acessar');
  }
  
  // Verificar Supabase
  try {
    const { data: supabaseIntegrations } = await supabaseAdmin
      .from('calendar_integrations')
      .select('*');
    console.log(`Supabase: ${supabaseIntegrations?.length || 0} integrações`);
  } catch (error) {
    console.log('Supabase: Erro ao acessar');
  }
  
  console.log('\nTabela: calendar_integrations');
  console.log('Campos principais:');
  console.log('- user_id: ID do usuário');
  console.log('- clinic_id: ID da clínica');
  console.log('- provider: "google"');
  console.log('- email: Email da conta Google');
  console.log('- calendar_id: ID do calendário do Google');
  console.log('- access_token: Token de acesso (criptografado)');
  console.log('- refresh_token: Token de renovação');
  console.log('- is_active: Status da integração');
  console.log('- sync_enabled: Se sincronização está habilitada');
}

async function main() {
  await showCalendarIntegrationsLocation();
  console.log('\n');
  await migrateCalendarIntegrations();
}

main();