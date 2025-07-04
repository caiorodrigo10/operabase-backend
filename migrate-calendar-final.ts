#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';

async function migrateCalendarIntegrationsFinal() {
  console.log('Migrando integrações do Google Calendar para Supabase...');
  
  try {
    // Buscar integrações no PostgreSQL local
    const localIntegrations = await db.select().from(schema.calendar_integrations);
    console.log(`Encontradas ${localIntegrations.length} integrações no PostgreSQL`);
    
    if (localIntegrations.length === 0) {
      console.log('Nenhuma integração para migrar');
      return;
    }
    
    for (const integration of localIntegrations) {
      // Mapear campos do PostgreSQL para Supabase
      const supabaseIntegration = {
        id: integration.id,
        user_id: integration.user_id,
        clinic_id: integration.clinic_id,
        provider: integration.provider || 'google',
        email: integration.email,
        calendar_id: integration.calendar_id,
        access_token: integration.access_token,
        refresh_token: integration.refresh_token,
        token_expires_at: integration.token_expires_at,
        is_active: integration.is_active,
        sync_enabled: integration.sync_preference || true,
        last_sync_at: integration.last_sync,
        sync_errors: integration.sync_errors,
        created_at: integration.created_at,
        updated_at: integration.updated_at
      };
      
      // Remover campos undefined
      Object.keys(supabaseIntegration).forEach(key => {
        if (supabaseIntegration[key] === undefined) {
          delete supabaseIntegration[key];
        }
      });
      
      const { error } = await supabaseAdmin
        .from('calendar_integrations')
        .insert([supabaseIntegration]);
      
      if (error) {
        console.log(`Erro ao migrar integração ${integration.id}: ${error.message}`);
      } else {
        console.log(`Integração ${integration.id} migrada com sucesso`);
      }
    }
    
    // Verificar resultado
    const { data: result } = await supabaseAdmin
      .from('calendar_integrations')
      .select('*');
    
    console.log(`\nTotal de integrações no Supabase: ${result?.length || 0}`);
    
    if (result && result.length > 0) {
      result.forEach(integration => {
        console.log(`- ID: ${integration.id}, Usuário: ${integration.user_id}, Email: ${integration.email}`);
      });
    }
    
  } catch (error) {
    console.error('Erro na migração:', error);
  }
}

migrateCalendarIntegrationsFinal();