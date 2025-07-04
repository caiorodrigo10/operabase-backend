#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';

async function checkCalendarSettings() {
  console.log('🔍 Verificando onde fica o calendário selecionado para agendamentos...');
  
  try {
    // 1. Verificar na tabela calendar_integrations
    console.log('\n1. Verificando calendar_integrations:');
    const integrations = await db.select().from(schema.calendar_integrations);
    integrations.forEach(integration => {
      console.log(`- Integração ID ${integration.id}:`);
      console.log(`  Calendar ID: ${integration.calendar_id}`);
      console.log(`  Email: ${integration.email}`);
      console.log(`  Ativo: ${integration.is_active}`);
      console.log(`  Sync habilitado: ${integration.sync_preference}`);
    });
    
    // 2. Verificar na tabela clinic_settings
    console.log('\n2. Verificando clinic_settings:');
    const clinicSettings = await db.select().from(schema.clinic_settings);
    const calendarSettings = clinicSettings.filter(setting => 
      setting.setting_key?.toLowerCase().includes('calendar') ||
      setting.setting_key?.toLowerCase().includes('google')
    );
    
    if (calendarSettings.length > 0) {
      calendarSettings.forEach(setting => {
        console.log(`- ${setting.setting_key}: ${setting.setting_value}`);
        console.log(`  Clínica: ${setting.clinic_id}`);
        console.log(`  Tipo: ${setting.setting_type}`);
      });
    } else {
      console.log('- Nenhuma configuração de calendário encontrada');
    }
    
    // 3. Verificar appointments com google_calendar_event_id
    console.log('\n3. Verificando appointments com eventos do Google:');
    const appointmentsWithCalendar = await db
      .select()
      .from(schema.appointments)
      .where('google_calendar_event_id IS NOT NULL')
      .limit(5);
    
    if (appointmentsWithCalendar.length > 0) {
      appointmentsWithCalendar.forEach(appointment => {
        console.log(`- Appointment ID ${appointment.id}:`);
        console.log(`  Google Event ID: ${appointment.google_calendar_event_id}`);
        console.log(`  Usuário: ${appointment.user_id}`);
        console.log(`  Data: ${appointment.scheduled_date}`);
      });
    } else {
      console.log('- Nenhum agendamento com evento do Google encontrado');
    }
    
    // 4. Verificar no Supabase também
    console.log('\n4. Verificando no Supabase:');
    try {
      const { data: supabaseIntegrations } = await supabaseAdmin
        .from('calendar_integrations')
        .select('*');
      
      if (supabaseIntegrations && supabaseIntegrations.length > 0) {
        supabaseIntegrations.forEach(integration => {
          console.log(`- Supabase Integração ID ${integration.id}:`);
          console.log(`  Calendar ID: ${integration.calendar_id}`);
          console.log(`  Email: ${integration.email}`);
          console.log(`  Ativo: ${integration.is_active}`);
        });
      } else {
        console.log('- Nenhuma integração no Supabase');
      }
    } catch (error) {
      console.log('- Erro ao acessar Supabase:', error.message);
    }
    
    // 5. Analisar estrutura de dados
    console.log('\n📊 ANÁLISE:');
    console.log('O calendário selecionado para agendamentos está definido em:');
    console.log('1. calendar_integrations.calendar_id - ID do calendário específico');
    console.log('2. calendar_integrations.email - Conta Google proprietária');
    console.log('3. calendar_integrations.is_active - Se está ativo para uso');
    console.log('4. Por usuário (user_id) - cada usuário pode ter seu calendário');
    console.log('5. Por clínica (clinic_id) - configuração por clínica');
    
    // 6. Mostrar configuração atual
    const activeIntegration = integrations.find(i => i.is_active);
    if (activeIntegration) {
      console.log('\n✅ CONFIGURAÇÃO ATUAL ATIVA:');
      console.log(`Calendário: ${activeIntegration.calendar_id}`);
      console.log(`Email: ${activeIntegration.email}`);
      console.log(`Usuário: ${activeIntegration.user_id}`);
      console.log(`Clínica: ${activeIntegration.clinic_id}`);
    } else {
      console.log('\n⚠️  Nenhuma integração ativa encontrada');
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

checkCalendarSettings();