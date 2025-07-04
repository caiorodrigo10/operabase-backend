#!/usr/bin/env tsx

import { supabaseAdmin } from './server/supabase-client.js';
import { db } from './server/db.js';
import * as schema from './shared/schema.js';

async function completeClinicSettingsMigration() {
  console.log('🔄 Completando migração da tabela clinic_settings...');
  
  try {
    // Buscar dados locais
    const localSettings = await db.select().from(schema.clinic_settings);
    console.log(`Encontradas ${localSettings.length} configurações locais`);
    
    // Inserir dados um por um com tratamento de erro
    for (const setting of localSettings) {
      try {
        const { data, error } = await supabaseAdmin
          .from('clinic_settings')
          .insert({
            clinic_id: setting.clinic_id,
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            setting_type: setting.setting_type || 'string',
            created_at: setting.created_at?.toISOString() || new Date().toISOString(),
            updated_at: setting.updated_at?.toISOString() || new Date().toISOString()
          })
          .select();
        
        if (error) {
          console.log(`Erro em ${setting.setting_key}: ${error.message}`);
        } else {
          console.log(`✅ Migrado: ${setting.setting_key} = ${setting.setting_value}`);
        }
      } catch (insertError) {
        console.log(`Erro de inserção em ${setting.setting_key}: ${insertError.message}`);
      }
    }
    
    // Verificar resultado final
    const { data: finalCheck, error: finalError } = await supabaseAdmin
      .from('clinic_settings')
      .select('*');
    
    if (finalError) {
      console.log(`Erro na verificação final: ${finalError.message}`);
    } else {
      console.log(`\nResultado final: ${finalCheck?.length || 0} configurações no Supabase`);
      finalCheck?.forEach(setting => {
        console.log(`- ${setting.setting_key}: ${setting.setting_value}`);
      });
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

completeClinicSettingsMigration();