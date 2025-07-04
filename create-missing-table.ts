#!/usr/bin/env tsx

import { supabaseAdmin } from './server/supabase-client.js';
import { db } from './server/db.js';
import * as schema from './shared/schema.js';

async function createMissingTable() {
  console.log('🔧 Criando tabela clinic_settings no Supabase...');
  
  try {
    // Criar a tabela clinic_settings
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.clinic_settings (
        id SERIAL PRIMARY KEY,
        clinic_id INTEGER NOT NULL,
        setting_key VARCHAR(255) NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'string',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
      sql: createTableSQL
    });
    
    if (createError) {
      console.log('Tentando criar tabela diretamente...');
      // Alternativa: usar insert direto para testar se existe
      const { error: testError } = await supabaseAdmin
        .from('clinic_settings')
        .select('*')
        .limit(1);
      
      if (testError && testError.message.includes('does not exist')) {
        console.log('❌ Tabela não existe. Vou migrar os dados e a estrutura será criada automaticamente.');
      }
    } else {
      console.log('✅ Tabela clinic_settings criada com sucesso');
    }
    
    // Migrar dados da tabela clinic_settings
    console.log('📦 Migrando dados de clinic_settings...');
    
    const localSettings = await db.select().from(schema.clinic_settings);
    console.log(`Encontradas ${localSettings.length} configurações`);
    
    if (localSettings.length > 0) {
      for (const setting of localSettings) {
        const cleanSetting = {
          clinic_id: setting.clinic_id,
          setting_key: setting.setting_key,
          setting_value: setting.setting_value,
          setting_type: setting.setting_type || 'string',
          created_at: setting.created_at || new Date(),
          updated_at: setting.updated_at || new Date()
        };
        
        const { error: insertError } = await supabaseAdmin
          .from('clinic_settings')
          .insert([cleanSetting]);
        
        if (insertError) {
          console.log(`❌ Erro ao inserir configuração ${setting.setting_key}: ${insertError.message}`);
        } else {
          console.log(`✅ Configuração migrada: ${setting.setting_key}`);
        }
      }
    } else {
      console.log('ℹ️ Nenhuma configuração encontrada para migrar');
    }
    
    // Verificar resultado final
    const { data: finalSettings, error: checkError } = await supabaseAdmin
      .from('clinic_settings')
      .select('*');
    
    if (checkError) {
      console.log(`❌ Erro ao verificar configurações: ${checkError.message}`);
    } else {
      console.log(`✅ Total de configurações no Supabase: ${finalSettings?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

createMissingTable();