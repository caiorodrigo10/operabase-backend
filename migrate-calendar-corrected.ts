#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';

async function migrateCalendarIntegrationsCorrect() {
  console.log('Migrando integrações do Google Calendar (corrigida)...');
  
  try {
    const localIntegrations = await db.select().from(schema.calendar_integrations);
    console.log(`Encontradas ${localIntegrations.length} integrações`);
    
    for (const integration of localIntegrations) {
      console.log('Dados originais:', integration);
      
      // Converter sync_preference para boolean se necessário
      let syncEnabled = true;
      if (integration.sync_preference === 'bidirectional' || integration.sync_preference === true) {
        syncEnabled = true;
      } else if (integration.sync_preference === 'disabled' || integration.sync_preference === false) {
        syncEnabled = false;
      }
      
      const cleanIntegration = {
        user_id: integration.user_id,
        clinic_id: integration.clinic_id,
        provider: 'google',
        email: integration.email,
        calendar_id: integration.calendar_id,
        access_token: integration.access_token,
        refresh_token: integration.refresh_token,
        token_expires_at: integration.token_expires_at,
        is_active: integration.is_active !== false,
        sync_enabled: syncEnabled,
        last_sync_at: integration.last_sync,
        sync_errors: integration.sync_errors,
        created_at: integration.created_at || new Date(),
        updated_at: integration.updated_at || new Date()
      };
      
      console.log('Dados limpos:', cleanIntegration);
      
      const { data, error } = await supabaseAdmin
        .from('calendar_integrations')
        .insert([cleanIntegration])
        .select();
      
      if (error) {
        console.log(`Erro: ${error.message}`);
        console.log('Detalhes:', error);
      } else {
        console.log(`Migração bem-sucedida: ${data[0].id}`);
      }
    }
    
    const { data: result } = await supabaseAdmin
      .from('calendar_integrations')
      .select('*');
    
    console.log(`\nIntegrações no Supabase: ${result?.length || 0}`);
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

migrateCalendarIntegrationsCorrect();