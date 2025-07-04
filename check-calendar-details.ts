#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';
import { googleCalendarService } from './server/google-calendar-service.js';

async function checkCalendarDetails() {
  console.log('🔍 Verificando detalhes do calendário caio@avanttocrm.com...');
  
  try {
    // Buscar integração
    const integrations = await db.select().from(schema.calendar_integrations);
    const integration = integrations[0];
    
    if (!integration) {
      console.log('❌ Nenhuma integração encontrada');
      return;
    }
    
    console.log('\n📋 Dados da integração:');
    console.log(`Email da conta: ${integration.email}`);
    console.log(`Calendar ID armazenado: ${integration.calendar_id}`);
    console.log(`São iguais? ${integration.email === integration.calendar_id ? 'SIM' : 'NÃO'}`);
    
    // Conectar e buscar detalhes do Google
    if (integration.access_token) {
      googleCalendarService.setCredentials(
        integration.access_token,
        integration.refresh_token || undefined,
        integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : undefined
      );
      
      console.log('\n📅 Calendários disponíveis na conta Google:');
      const calendars = await googleCalendarService.getUserCalendars();
      
      calendars.forEach((cal: any, index: number) => {
        const isPrimary = cal.primary ? ' [PRINCIPAL]' : '';
        const isSelected = cal.id === integration.calendar_id ? ' [SELECIONADO]' : '';
        
        console.log(`${index + 1}. ${cal.summary}${isPrimary}${isSelected}`);
        console.log(`   ID: ${cal.id}`);
        console.log(`   Tipo: ${cal.primary ? 'Calendário principal da conta' : 'Calendário secundário/compartilhado'}`);
        
        if (cal.id === integration.calendar_id) {
          console.log(`   ✅ Este é o calendário atualmente em uso`);
        }
        console.log('');
      });
      
      // Explicação técnica
      console.log('📚 EXPLICAÇÃO TÉCNICA:');
      console.log('');
      console.log('Para o Google Calendar:');
      console.log('• Calendário PRINCIPAL: ID = email da conta (caio@avanttocrm.com)');
      console.log('• Calendários SECUNDÁRIOS: ID = hash único (c_abc123@group.calendar.google.com)');
      console.log('• Calendários COMPARTILHADOS: ID = hash do grupo (c_xyz789@group.calendar.google.com)');
      console.log('');
      console.log('No nosso caso:');
      console.log(`• caio@avanttocrm.com é o EMAIL da conta Google`);
      console.log(`• caio@avanttocrm.com é também o ID do calendário principal`);
      console.log(`• É o calendário padrão onde os eventos são criados`);
      console.log('');
      console.log('Se o usuário escolhesse um calendário secundário, seria algo como:');
      console.log('• ID: c_a3ac6b26b72ffa9a0b07c12638682dba45a19719b7408dba67b7e73b3693dfe5@group.calendar.google.com');
      console.log('• Nome: "Natural Born Leader - Support Calls"');
      
    } else {
      console.log('❌ Sem token de acesso para consultar Google');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkCalendarDetails();