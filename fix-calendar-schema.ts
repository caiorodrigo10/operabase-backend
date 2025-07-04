#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';

async function fixCalendarIntegrationsSchema() {
  console.log('Corrigindo schema da tabela calendar_integrations no Supabase...');
  
  try {
    // Buscar estrutura atual no PostgreSQL local
    const localIntegration = await db.select().from(schema.calendar_integrations).limit(1);
    
    if (localIntegration.length > 0) {
      console.log('Estrutura encontrada no PostgreSQL:');
      console.log(Object.keys(localIntegration[0]));
    }
    
    // Recriar tabela no Supabase com estrutura correta
    const alterTableSQL = `
    -- Dropar e recriar tabela calendar_integrations
    DROP TABLE IF EXISTS calendar_integrations CASCADE;
    
    CREATE TABLE calendar_integrations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      clinic_id INTEGER NOT NULL REFERENCES clinics(id),
      provider TEXT NOT NULL DEFAULT 'google',
      provider_user_id TEXT,
      email TEXT,
      calendar_id TEXT,
      calendar_name TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      sync_enabled BOOLEAN DEFAULT true,
      last_sync_at TIMESTAMP,
      sync_errors JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX idx_calendar_integrations_user ON calendar_integrations(user_id);
    CREATE INDEX idx_calendar_integrations_clinic ON calendar_integrations(clinic_id);
    `;
    
    console.log('Executando correção de schema...');
    
    // Tentar via API administrativa (pode não funcionar)
    try {
      await supabaseAdmin.rpc('exec_sql', { query: alterTableSQL });
      console.log('Schema corrigido via API');
    } catch (apiError) {
      console.log('Não foi possível corrigir via API, usando inserção direta...');
      
      // Approach alternativa: inserir dados corrigindo campos problemáticos
      const localIntegrations = await db.select().from(schema.calendar_integrations);
      
      if (localIntegrations.length > 0) {
        for (const integration of localIntegrations) {
          // Criar objeto apenas com campos que existem no Supabase
          const cleanIntegration = {
            id: integration.id,
            user_id: integration.user_id,
            clinic_id: integration.clinic_id,
            provider: integration.provider || 'google',
            provider_user_id: integration.provider_user_id,
            email: integration.email,
            calendar_id: integration.calendar_id,
            calendar_name: integration.calendar_name,
            access_token: integration.access_token,
            refresh_token: integration.refresh_token,
            token_expires_at: integration.token_expires_at,
            is_active: integration.is_active,
            sync_enabled: integration.sync_enabled,
            last_sync_at: integration.last_sync_at,
            sync_errors: integration.sync_errors,
            created_at: integration.created_at,
            updated_at: integration.updated_at
          };
          
          // Remover campos undefined/null que podem causar problemas
          Object.keys(cleanIntegration).forEach(key => {
            if (cleanIntegration[key] === undefined) {
              delete cleanIntegration[key];
            }
          });
          
          console.log('Inserindo integração limpa:', cleanIntegration.id);
          
          const { error } = await supabaseAdmin
            .from('calendar_integrations')
            .insert([cleanIntegration]);
          
          if (error) {
            console.log(`Erro ao inserir integração ${integration.id}:`, error.message);
            console.log('Detalhes do erro:', error);
          } else {
            console.log(`✅ Integração ${integration.id} migrada com sucesso`);
          }
        }
      }
    }
    
    // Verificar resultado final
    const { data: finalIntegrations, error: selectError } = await supabaseAdmin
      .from('calendar_integrations')
      .select('*');
    
    if (selectError) {
      console.log('Erro ao verificar resultado:', selectError.message);
    } else {
      console.log(`\nResultado final: ${finalIntegrations?.length || 0} integrações no Supabase`);
      
      if (finalIntegrations && finalIntegrations.length > 0) {
        finalIntegrations.forEach(integration => {
          console.log(`- Integração ID ${integration.id}: usuário ${integration.user_id}, email: ${integration.email}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

fixCalendarIntegrationsSchema();