#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';
import { googleCalendarService } from './server/google-calendar-service.js';

async function fixCalendarIds() {
  console.log('🔧 Corrigindo IDs dos calendários para usar IDs reais do Google...');
  
  try {
    // 1. Buscar todas as integrações ativas
    const integrations = await db.select().from(schema.calendar_integrations);
    console.log(`Encontradas ${integrations.length} integrações`);
    
    for (const integration of integrations) {
      if (!integration.is_active || !integration.access_token) {
        console.log(`⏭️ Pulando integração ${integration.id} (inativa ou sem token)`);
        continue;
      }
      
      console.log(`\n🔍 Processando integração ${integration.id}:`);
      console.log(`  Email: ${integration.email}`);
      console.log(`  Calendar ID atual: ${integration.calendar_id}`);
      
      try {
        // Configurar credenciais
        googleCalendarService.setCredentials(
          integration.access_token,
          integration.refresh_token || undefined,
          integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : undefined
        );
        
        // Buscar calendários disponíveis
        const calendars = await googleCalendarService.getUserCalendars();
        console.log(`  📅 Encontrados ${calendars.length} calendários`);
        
        // Mostrar calendários disponíveis
        calendars.forEach((cal: any) => {
          console.log(`    - ${cal.summary} (ID: ${cal.id}) ${cal.primary ? '[PRINCIPAL]' : ''}`);
        });
        
        // Determinar qual calendário usar
        let targetCalendarId = integration.calendar_id;
        
        // Se o calendar_id atual é um email, encontrar o calendário correspondente
        if (integration.calendar_id === integration.email) {
          // Buscar o calendário principal (que geralmente tem o mesmo ID do email)
          const primaryCalendar = calendars.find((cal: any) => cal.primary);
          
          if (primaryCalendar) {
            targetCalendarId = primaryCalendar.id;
            console.log(`  ✅ Calendário principal encontrado: ${targetCalendarId}`);
          } else {
            // Se não encontrar o principal, usar o primeiro disponível
            if (calendars.length > 0) {
              targetCalendarId = calendars[0].id;
              console.log(`  📝 Usando primeiro calendário disponível: ${targetCalendarId}`);
            }
          }
        } else {
          // Verificar se o calendar_id atual ainda existe
          const currentCalendar = calendars.find((cal: any) => cal.id === integration.calendar_id);
          if (!currentCalendar) {
            console.log(`  ⚠️ Calendário atual não encontrado, usando principal`);
            const primaryCalendar = calendars.find((cal: any) => cal.primary);
            if (primaryCalendar) {
              targetCalendarId = primaryCalendar.id;
            }
          } else {
            console.log(`  ✅ Calendário atual ainda válido: ${targetCalendarId}`);
          }
        }
        
        // Atualizar se necessário
        if (targetCalendarId !== integration.calendar_id) {
          console.log(`  🔄 Atualizando calendar_id de "${integration.calendar_id}" para "${targetCalendarId}"`);
          
          // Atualizar no banco local
          await db
            .update(schema.calendar_integrations)
            .set({ calendar_id: targetCalendarId })
            .where({ id: integration.id });
          
          // Atualizar no Supabase
          const { error } = await supabaseAdmin
            .from('calendar_integrations')
            .update({ calendar_id: targetCalendarId })
            .eq('id', integration.id);
          
          if (error) {
            console.error(`  ❌ Erro ao atualizar no Supabase:`, error);
          } else {
            console.log(`  ✅ Atualizado com sucesso no Supabase`);
          }
        } else {
          console.log(`  ✅ Calendar ID já está correto`);
        }
        
      } catch (calError) {
        console.error(`  ❌ Erro ao processar calendários:`, calError.message);
        
        // Se token expirou, tentar renovar
        if (calError.message.includes('401') || calError.message.includes('invalid_grant')) {
          if (integration.refresh_token) {
            try {
              console.log(`  🔄 Tentando renovar token...`);
              const refreshedTokens = await googleCalendarService.refreshAccessToken();
              
              // Atualizar tokens
              await db
                .update(schema.calendar_integrations)
                .set({
                  access_token: refreshedTokens.access_token,
                  token_expires_at: new Date(refreshedTokens.expiry_date)
                })
                .where({ id: integration.id });
              
              await supabaseAdmin
                .from('calendar_integrations')
                .update({
                  access_token: refreshedTokens.access_token,
                  token_expires_at: new Date(refreshedTokens.expiry_date).toISOString()
                })
                .eq('id', integration.id);
              
              console.log(`  ✅ Token renovado com sucesso`);
            } catch (refreshError) {
              console.error(`  ❌ Erro ao renovar token:`, refreshError.message);
            }
          }
        }
      }
    }
    
    console.log('\n🎉 Processo de correção finalizado!');
    
    // Mostrar resultado final
    const updatedIntegrations = await db.select().from(schema.calendar_integrations);
    console.log('\n📊 Estado final das integrações:');
    updatedIntegrations.forEach(integration => {
      console.log(`- ID ${integration.id}: ${integration.email} → ${integration.calendar_id}`);
    });
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixCalendarIds();