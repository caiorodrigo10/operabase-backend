#!/usr/bin/env tsx

/**
 * Script para verificar completamente a migração do Neon para Supabase
 * Analisa tabelas, dados, sequências, e funcionamento completo
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

// Conexões
const neonConnection = postgres(process.env.DATABASE_URL!, { max: 1 });
const neonDb = drizzle(neonConnection);

const supabaseConnection = postgres(process.env.SUPABASE_POOLER_URL!, { max: 1 });
const supabaseDb = drizzle(supabaseConnection);

const supabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface MigrationReport {
  tablesComparison: any;
  dataComparison: any;
  sequencesComparison: any;
  authComparison: any;
  functionalityTests: any;
  recommendations: string[];
  migrationComplete: boolean;
}

async function analyzeTableStructures() {
  console.log('📊 Analyzing table structures...');
  
  // Get table info from both databases
  const neonTables = await neonConnection`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  const supabaseTables = await supabaseConnection`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  const neonTableNames = [...new Set(neonTables.map(t => t.table_name))];
  const supabaseTableNames = [...new Set(supabaseTables.map(t => t.table_name))];

  return {
    neonTables: neonTableNames.length,
    supabaseTables: supabaseTableNames.length,
    missingInSupabase: neonTableNames.filter(t => !supabaseTableNames.includes(t)),
    extraInSupabase: supabaseTableNames.filter(t => !neonTableNames.includes(t)),
    commonTables: neonTableNames.filter(t => supabaseTableNames.includes(t))
  };
}

async function analyzeDataCounts() {
  console.log('📈 Analyzing data counts...');
  
  const mainTables = ['users', 'clinics', 'contacts', 'appointments', 'medical_records', 'calendar_integrations'];
  const comparison: any = {};

  for (const table of mainTables) {
    try {
      const neonCount = await neonConnection`SELECT COUNT(*) as count FROM ${neonConnection(table)}`;
      const supabaseCount = await supabaseConnection`SELECT COUNT(*) as count FROM ${supabaseConnection(table)}`;
      
      comparison[table] = {
        neon: parseInt(neonCount[0].count),
        supabase: parseInt(supabaseCount[0].count),
        diff: parseInt(supabaseCount[0].count) - parseInt(neonCount[0].count)
      };
    } catch (error) {
      comparison[table] = {
        neon: 'Error',
        supabase: 'Error',
        error: error.message
      };
    }
  }

  return comparison;
}

async function analyzeSequences() {
  console.log('🔢 Analyzing sequences...');
  
  const neonSequences = await neonConnection`
    SELECT sequence_name, last_value 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
  `;

  const supabaseSequences = await supabaseConnection`
    SELECT sequence_name, last_value 
    FROM information_schema.sequences 
    WHERE sequence_schema = 'public'
  `;

  return {
    neon: neonSequences,
    supabase: supabaseSequences
  };
}

async function testSupabaseAuth() {
  console.log('🔐 Testing Supabase authentication...');
  
  try {
    // Test user creation and authentication
    const testEmail = 'test-migration@taskmed.com';
    const testPassword = 'Test123!@#';

    // Try to sign up
    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError && !signUpError.message.includes('already registered')) {
      throw signUpError;
    }

    // Try to sign in
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      throw signInError;
    }

    // Clean up test user
    if (signInData.user) {
      await supabaseClient.auth.admin.deleteUser(signInData.user.id);
    }

    return {
      working: true,
      message: 'Supabase Auth working correctly'
    };
  } catch (error) {
    return {
      working: false,
      error: error.message
    };
  }
}

async function testDatabaseOperations() {
  console.log('⚙️ Testing database operations...');
  
  const tests: any = {};

  // Test user creation
  try {
    const testUser = await supabaseConnection`
      INSERT INTO users (email, name, password, role)
      VALUES ('test-db@taskmed.com', 'Test User', 'hashed_password', 'user')
      RETURNING id, email
    `;
    
    // Clean up
    await supabaseConnection`DELETE FROM users WHERE email = 'test-db@taskmed.com'`;
    
    tests.userCreation = { working: true, message: 'User CRUD working' };
  } catch (error) {
    tests.userCreation = { working: false, error: error.message };
  }

  // Test calendar integrations
  try {
    const calendarData = await supabaseConnection`
      SELECT * FROM calendar_integrations WHERE email = 'cr@caiorodrigo.com.br'
    `;
    
    tests.calendarIntegrations = {
      working: true,
      found: calendarData.length,
      message: `Found ${calendarData.length} calendar integrations`
    };
  } catch (error) {
    tests.calendarIntegrations = { working: false, error: error.message };
  }

  return tests;
}

async function generateRecommendations(report: any): Promise<string[]> {
  const recommendations: string[] = [];

  if (report.tablesComparison.missingInSupabase.length > 0) {
    recommendations.push(`❌ Missing tables in Supabase: ${report.tablesComparison.missingInSupabase.join(', ')}`);
  }

  if (Object.values(report.dataComparison).some((table: any) => table.diff < 0)) {
    recommendations.push('❌ Some tables have less data in Supabase than Neon');
  }

  if (!report.authComparison.working) {
    recommendations.push('❌ Supabase Auth not working properly');
  }

  if (!report.functionalityTests.calendarIntegrations?.working) {
    recommendations.push('❌ Calendar integrations not working in Supabase');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Migration appears complete and functional');
    recommendations.push('✅ Safe to delete Neon database');
    recommendations.push('✅ Update environment variables to use only Supabase');
  }

  return recommendations;
}

async function main() {
  console.log('🚀 Starting complete migration analysis...\n');

  const report: MigrationReport = {
    tablesComparison: await analyzeTableStructures(),
    dataComparison: await analyzeDataCounts(),
    sequencesComparison: await analyzeSequences(),
    authComparison: await testSupabaseAuth(),
    functionalityTests: await testDatabaseOperations(),
    recommendations: [],
    migrationComplete: false
  };

  report.recommendations = await generateRecommendations(report);
  report.migrationComplete = report.recommendations.every(r => r.startsWith('✅'));

  // Print detailed report
  console.log('\n📋 MIGRATION ANALYSIS REPORT');
  console.log('=' .repeat(50));

  console.log('\n📊 Tables Comparison:');
  console.log(`  Neon: ${report.tablesComparison.neonTables} tables`);
  console.log(`  Supabase: ${report.tablesComparison.supabaseTables} tables`);
  console.log(`  Missing in Supabase: ${report.tablesComparison.missingInSupabase.length}`);
  if (report.tablesComparison.missingInSupabase.length > 0) {
    console.log(`    ${report.tablesComparison.missingInSupabase.join(', ')}`);
  }

  console.log('\n📈 Data Comparison:');
  Object.entries(report.dataComparison).forEach(([table, data]: [string, any]) => {
    if (data.error) {
      console.log(`  ${table}: ERROR - ${data.error}`);
    } else {
      const status = data.diff >= 0 ? '✅' : '❌';
      console.log(`  ${table}: Neon(${data.neon}) → Supabase(${data.supabase}) ${status}`);
    }
  });

  console.log('\n🔐 Authentication Test:');
  console.log(`  Supabase Auth: ${report.authComparison.working ? '✅' : '❌'} ${report.authComparison.message || report.authComparison.error}`);

  console.log('\n⚙️ Functionality Tests:');
  Object.entries(report.functionalityTests).forEach(([test, result]: [string, any]) => {
    const status = result.working ? '✅' : '❌';
    console.log(`  ${test}: ${status} ${result.message || result.error}`);
  });

  console.log('\n🎯 Recommendations:');
  report.recommendations.forEach(rec => console.log(`  ${rec}`));

  console.log(`\n🏁 Migration Complete: ${report.migrationComplete ? '✅ YES' : '❌ NO'}`);

  // Save detailed report
  const fs = await import('fs/promises');
  await fs.writeFile('migration-analysis-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: migration-analysis-report.json');

  process.exit(0);
}

main().catch(console.error);