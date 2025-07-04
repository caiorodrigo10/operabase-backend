#!/usr/bin/env tsx

import { db } from './server/db.js';
import { supabaseAdmin } from './server/supabase-client.js';
import * as schema from './shared/schema.js';

async function verifyCompleteMigration() {
  console.log('🔍 Verificação completa da migração para Supabase...\n');
  
  const results = {
    tables: {},
    errors: [],
    summary: {
      totalTables: 0,
      migratedTables: 0,
      totalRecords: 0,
      migratedRecords: 0
    }
  };

  try {
    // Lista de tabelas principais para verificar
    const tablesToCheck = [
      'users',
      'clinics', 
      'contacts',
      'appointments',
      'medical_records',
      'calendar_integrations',
      'clinic_settings'
    ];

    for (const tableName of tablesToCheck) {
      console.log(`📊 Verificando tabela: ${tableName}`);
      results.summary.totalTables++;
      
      try {
        // Contar registros no PostgreSQL local
        let localCount = 0;
        let localData = [];
        
        if (tableName === 'users') {
          localData = await db.select().from(schema.users);
        } else if (tableName === 'clinics') {
          localData = await db.select().from(schema.clinics);
        } else if (tableName === 'contacts') {
          localData = await db.select().from(schema.contacts);
        } else if (tableName === 'appointments') {
          localData = await db.select().from(schema.appointments);
        } else if (tableName === 'medical_records') {
          localData = await db.select().from(schema.medical_records);
        } else if (tableName === 'calendar_integrations') {
          localData = await db.select().from(schema.calendar_integrations);
        } else if (tableName === 'clinic_settings') {
          localData = await db.select().from(schema.clinic_settings);
        }
        
        localCount = localData.length;
        
        // Contar registros no Supabase
        const { data: supabaseData, error: supabaseError, count: supabaseCount } = await supabaseAdmin
          .from(tableName)
          .select('*', { count: 'exact' });
        
        if (supabaseError) {
          console.log(`  ❌ Erro no Supabase: ${supabaseError.message}`);
          results.errors.push(`${tableName}: ${supabaseError.message}`);
          results.tables[tableName] = {
            local: localCount,
            supabase: 0,
            status: 'ERRO',
            error: supabaseError.message
          };
        } else {
          const actualSupabaseCount = supabaseData?.length || 0;
          const isMatching = localCount === actualSupabaseCount;
          
          console.log(`  PostgreSQL: ${localCount} registros`);
          console.log(`  Supabase: ${actualSupabaseCount} registros`);
          console.log(`  Status: ${isMatching ? '✅ MIGRADO' : '⚠️ DIFERENÇA'}\n`);
          
          results.tables[tableName] = {
            local: localCount,
            supabase: actualSupabaseCount,
            status: isMatching ? 'MIGRADO' : 'DIFERENÇA'
          };
          
          if (isMatching && actualSupabaseCount > 0) {
            results.summary.migratedTables++;
          }
          
          results.summary.totalRecords += localCount;
          results.summary.migratedRecords += actualSupabaseCount;
        }
        
      } catch (tableError) {
        console.log(`  ❌ Erro na tabela ${tableName}: ${tableError.message}\n`);
        results.errors.push(`${tableName}: ${tableError.message}`);
        results.tables[tableName] = {
          local: 0,
          supabase: 0,
          status: 'ERRO',
          error: tableError.message
        };
      }
    }
    
    // Verificações específicas importantes
    console.log('🔎 Verificações específicas:\n');
    
    // 1. Integrações do Google Calendar
    console.log('1. Integrações do Google Calendar:');
    try {
      const localIntegrations = await db.select().from(schema.calendar_integrations);
      const { data: supabaseIntegrations } = await supabaseAdmin
        .from('calendar_integrations')
        .select('*');
      
      if (localIntegrations.length > 0 && supabaseIntegrations && supabaseIntegrations.length > 0) {
        const localIntegration = localIntegrations[0];
        const supabaseIntegration = supabaseIntegrations[0];
        
        console.log(`   Local: calendar_id="${localIntegration.calendar_id}"`);
        console.log(`   Supabase: calendar_id="${supabaseIntegration.calendar_id}"`);
        console.log(`   Tokens migrados: ${supabaseIntegration.access_token ? 'SIM' : 'NÃO'}`);
        console.log(`   Status: ${localIntegration.is_active === supabaseIntegration.is_active ? '✅' : '⚠️'}\n`);
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}\n`);
    }
    
    // 2. Agendamentos com eventos do Google
    console.log('2. Agendamentos sincronizados:');
    try {
      const { data: appointmentsWithEvents } = await supabaseAdmin
        .from('appointments')
        .select('id, google_calendar_event_id')
        .not('google_calendar_event_id', 'is', null);
      
      console.log(`   Agendamentos com Google Calendar: ${appointmentsWithEvents?.length || 0}`);
      if (appointmentsWithEvents && appointmentsWithEvents.length > 0) {
        appointmentsWithEvents.slice(0, 3).forEach(apt => {
          console.log(`   - ID ${apt.id}: ${apt.google_calendar_event_id}`);
        });
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}\n`);
    }
    
    // 3. Prontuários médicos
    console.log('3. Prontuários médicos:');
    try {
      const { data: medicalRecords } = await supabaseAdmin
        .from('medical_records')
        .select('id, contact_id, content')
        .limit(3);
      
      console.log(`   Prontuários migrados: ${medicalRecords?.length || 0}`);
      if (medicalRecords && medicalRecords.length > 0) {
        medicalRecords.forEach(record => {
          const contentLength = record.content?.length || 0;
          console.log(`   - ID ${record.id}: ${contentLength} caracteres`);
        });
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}\n`);
    }
    
    // Resumo final
    console.log('📋 RESUMO DA MIGRAÇÃO:');
    console.log('========================');
    console.log(`Tabelas verificadas: ${results.summary.totalTables}`);
    console.log(`Tabelas migradas: ${results.summary.migratedTables}`);
    console.log(`Total registros local: ${results.summary.totalRecords}`);
    console.log(`Total registros Supabase: ${results.summary.migratedRecords}`);
    console.log(`Taxa de migração: ${((results.summary.migratedRecords / results.summary.totalRecords) * 100).toFixed(1)}%`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ ERROS ENCONTRADOS:');
      results.errors.forEach(error => console.log(`- ${error}`));
    }
    
    console.log('\n📊 DETALHES POR TABELA:');
    Object.entries(results.tables).forEach(([table, data]: [string, any]) => {
      console.log(`${table}: ${data.local} → ${data.supabase} (${data.status})`);
    });
    
    const migrationComplete = results.summary.migratedTables === results.summary.totalTables && results.errors.length === 0;
    console.log(`\n${migrationComplete ? '✅' : '⚠️'} Status geral: ${migrationComplete ? 'MIGRAÇÃO COMPLETA' : 'MIGRAÇÃO PARCIAL'}`);
    
  } catch (error) {
    console.error('❌ Erro geral na verificação:', error);
  }
}

verifyCompleteMigration();