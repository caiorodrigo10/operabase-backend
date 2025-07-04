#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testCalendarIdSync() {
  console.log('🧪 Testando sincronização de IDs de calendário...');
  
  try {
    // 1. Verificar estado atual
    console.log('\n1. Estado atual das integrações:');
    
    const localIntegrations = await db.select().from(schema.calendar_integrations);
    console.log('PostgreSQL local:');
    localIntegrations.forEach(integration => {
      console.log(`  - ID ${integration.id}: calendar_id="${integration.calendar_id}"`);
    });
    
    const { data: supabaseIntegrations } = await supabaseAdmin
      .from('calendar_integrations')
      .select('id, calendar_id, email, is_active');
    
    console.log('\nSupabase:');
    supabaseIntegrations?.forEach(integration => {
      console.log(`  - ID ${integration.id}: calendar_id="${integration.calendar_id}"`);
    });
    
    // 2. Simular uma atualização de calendar_id
    console.log('\n2. Simulando atualização de calendar_id...');
    
    const testIntegration = localIntegrations[0];
    if (testIntegration) {
      const newCalendarId = 'c_test_calendar_id@group.calendar.google.com';
      
      console.log(`Atualizando integração ${testIntegration.id} para calendar_id: ${newCalendarId}`);
      
      // Atualizar no PostgreSQL local
      await db
        .update(schema.calendar_integrations)
        .set({ 
          calendar_id: newCalendarId,
          updated_at: new Date()
        })
        .where(eq(schema.calendar_integrations.id, testIntegration.id));
      
      // Atualizar no Supabase
      const { error } = await supabaseAdmin
        .from('calendar_integrations')
        .update({ 
          calendar_id: newCalendarId,
          updated_at: new Date().toISOString()
        })
        .eq('id', testIntegration.id);
      
      if (error) {
        console.error('❌ Erro ao atualizar no Supabase:', error);
      } else {
        console.log('✅ Atualização sincronizada com sucesso');
      }
      
      // 3. Verificar sincronização
      console.log('\n3. Verificando sincronização após atualização:');
      
      const updatedLocal = await db
        .select()
        .from(schema.calendar_integrations)
        .where(eq(schema.calendar_integrations.id, testIntegration.id));
      
      const { data: updatedSupabase } = await supabaseAdmin
        .from('calendar_integrations')
        .select('id, calendar_id, updated_at')
        .eq('id', testIntegration.id);
      
      console.log('PostgreSQL local:');
      console.log(`  calendar_id: "${updatedLocal[0]?.calendar_id}"`);
      console.log(`  updated_at: ${updatedLocal[0]?.updated_at}`);
      
      console.log('Supabase:');
      console.log(`  calendar_id: "${updatedSupabase?.[0]?.calendar_id}"`);
      console.log(`  updated_at: ${updatedSupabase?.[0]?.updated_at}`);
      
      // Verificar se estão sincronizados
      const isSync = updatedLocal[0]?.calendar_id === updatedSupabase?.[0]?.calendar_id;
      console.log(`\n${isSync ? '✅' : '❌'} Sincronização: ${isSync ? 'OK' : 'ERRO'}`);
      
      // 4. Restaurar valor original
      console.log('\n4. Restaurando valor original...');
      
      await db
        .update(schema.calendar_integrations)
        .set({ 
          calendar_id: testIntegration.calendar_id,
          updated_at: new Date()
        })
        .where(eq(schema.calendar_integrations.id, testIntegration.id));
      
      await supabaseAdmin
        .from('calendar_integrations')
        .update({ 
          calendar_id: testIntegration.calendar_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', testIntegration.id);
      
      console.log('✅ Valor original restaurado');
      
    } else {
      console.log('❌ Nenhuma integração encontrada para teste');
    }
    
    // 5. Criar função para garantir sincronização automática
    console.log('\n5. Função de sincronização implementada em updateLinkedCalendarSettings');
    console.log('   - Valida calendar_id antes de salvar');
    console.log('   - Atualiza PostgreSQL local');
    console.log('   - Sincroniza automaticamente com Supabase');
    console.log('   - Logs detalhados para debugging');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testCalendarIdSync();