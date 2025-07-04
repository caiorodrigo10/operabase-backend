#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';
import { isNotNull } from 'drizzle-orm';

async function checkCalendarConfiguration() {
  console.log('Verificando configuração do calendário para agendamentos...');
  
  try {
    // 1. Verificar integrações ativas
    const integrations = await db.select().from(schema.calendar_integrations);
    
    if (integrations.length > 0) {
      console.log('\nIntegrações do Google Calendar:');
      integrations.forEach(integration => {
        console.log(`- ID: ${integration.id}`);
        console.log(`  Calendário: ${integration.calendar_id}`);
        console.log(`  Email: ${integration.email}`);
        console.log(`  Usuário: ${integration.user_id}`);
        console.log(`  Clínica: ${integration.clinic_id}`);
        console.log(`  Ativo: ${integration.is_active}`);
        console.log(`  Sincronização: ${integration.sync_preference}`);
      });
    }
    
    // 2. Verificar configurações da clínica
    const clinicSettings = await db.select().from(schema.clinic_settings);
    const calendarRelated = clinicSettings.filter(s => 
      s.setting_key?.includes('calendar') || 
      s.setting_key?.includes('google')
    );
    
    console.log('\nConfigurações relacionadas ao calendário:');
    if (calendarRelated.length > 0) {
      calendarRelated.forEach(setting => {
        console.log(`- ${setting.setting_key}: ${setting.setting_value}`);
      });
    } else {
      console.log('- Nenhuma configuração específica encontrada');
    }
    
    // 3. Verificar agendamentos com eventos do Google
    const appointmentsWithEvents = await db
      .select()
      .from(schema.appointments)
      .where(isNotNull(schema.appointments.google_calendar_event_id))
      .limit(3);
    
    console.log('\nAgendamentos sincronizados com Google:');
    if (appointmentsWithEvents.length > 0) {
      appointmentsWithEvents.forEach(apt => {
        console.log(`- Agendamento ${apt.id}: evento ${apt.google_calendar_event_id}`);
      });
    } else {
      console.log('- Nenhum agendamento sincronizado encontrado');
    }
    
    // 4. Verificar no Supabase
    const { data: supabaseIntegrations } = await supabaseAdmin
      .from('calendar_integrations')
      .select('*');
    
    console.log('\nIntegrações no Supabase:');
    if (supabaseIntegrations && supabaseIntegrations.length > 0) {
      supabaseIntegrations.forEach(integration => {
        console.log(`- Calendário: ${integration.calendar_id}`);
        console.log(`  Email: ${integration.email}`);
        console.log(`  Ativo: ${integration.is_active}`);
      });
    } else {
      console.log('- Nenhuma integração no Supabase');
    }
    
    console.log('\n=== RESUMO ===');
    console.log('O calendário selecionado para agendamentos fica armazenado em:');
    console.log('1. Tabela: calendar_integrations');
    console.log('2. Campo: calendar_id (ID do calendário no Google)');
    console.log('3. Campo: email (conta Google proprietária)');
    console.log('4. Filtro: is_active = true (apenas integrações ativas)');
    console.log('5. Associação: user_id (por usuário) e clinic_id (por clínica)');
    
    const activeIntegration = integrations.find(i => i.is_active);
    if (activeIntegration) {
      console.log('\nConfiguração atual ativa:');
      console.log(`Calendário selecionado: ${activeIntegration.calendar_id}`);
      console.log(`Conta Google: ${activeIntegration.email}`);
      console.log(`Para usuário: ${activeIntegration.user_id}`);
      console.log(`Na clínica: ${activeIntegration.clinic_id}`);
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

checkCalendarConfiguration();