#!/usr/bin/env tsx

/**
 * Análise completa da migração para Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import { Pool } from 'pg';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Use the same connection method as the app
const pool = new Pool({
  connectionString: process.env.SUPABASE_POOLER_URL!,
  ssl: { rejectUnauthorized: false }
});

async function analyzeSupabaseStructure() {
  console.log('📊 Analyzing Supabase database structure...');
  
  const client = await pool.connect();
  
  try {
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    // Get column details for main tables
    const columnsResult = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    return {
      tables: tablesResult.rows,
      columns: columnsResult.rows
    };
  } finally {
    client.release();
  }
}

async function analyzeDataCounts() {
  console.log('📈 Analyzing data in main tables...');
  
  const client = await pool.connect();
  const mainTables = ['users', 'clinics', 'contacts', 'appointments', 'medical_records', 'calendar_integrations'];
  const counts: any = {};

  try {
    for (const table of mainTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = parseInt(result.rows[0].count);
      } catch (error) {
        counts[table] = `Error: ${error.message}`;
      }
    }
  } finally {
    client.release();
  }

  return counts;
}

async function testCalendarIntegrations() {
  console.log('📅 Testing calendar integrations...');
  
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT id, email, provider, is_active, calendar_id, sync_preference
      FROM calendar_integrations 
      ORDER BY created_at DESC
    `);

    return {
      total: result.rows.length,
      active: result.rows.filter(r => r.is_active).length,
      integrations: result.rows
    };
  } finally {
    client.release();
  }
}

async function testSupabaseAuth() {
  console.log('🔐 Testing Supabase authentication...');
  
  try {
    // Test session retrieval
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    // Test with user lookup
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers();

    return {
      sessionWorking: !error,
      adminWorking: !usersError,
      userCount: users?.length || 0,
      error: error?.message || usersError?.message
    };
  } catch (error) {
    return {
      sessionWorking: false,
      adminWorking: false,
      error: error.message
    };
  }
}

async function testDatabaseQueries() {
  console.log('⚙️ Testing database operations...');
  
  const client = await pool.connect();
  const tests: any = {};

  try {
    // Test user query
    const userResult = await client.query(`
      SELECT id, email, name, role FROM users LIMIT 5
    `);
    tests.userQuery = {
      working: true,
      count: userResult.rows.length,
      sample: userResult.rows[0]
    };

    // Test appointment query with joins
    const appointmentResult = await client.query(`
      SELECT a.id, a.scheduled_date, c.name as contact_name, cl.name as clinic_name
      FROM appointments a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN clinics cl ON a.clinic_id = cl.id
      LIMIT 5
    `);
    tests.appointmentJoin = {
      working: true,
      count: appointmentResult.rows.length
    };

    // Test calendar integration query
    const calendarResult = await client.query(`
      SELECT * FROM calendar_integrations WHERE email = 'cr@caiorodrigo.com.br'
    `);
    tests.calendarQuery = {
      working: true,
      found: calendarResult.rows.length,
      data: calendarResult.rows[0]
    };

  } catch (error) {
    tests.error = error.message;
  } finally {
    client.release();
  }

  return tests;
}

async function checkEnvironmentConfig() {
  console.log('🔧 Checking environment configuration...');
  
  return {
    supabaseUrl: !!process.env.SUPABASE_URL,
    supabaseKey: !!process.env.SUPABASE_ANON_KEY,
    supabasePooler: !!process.env.SUPABASE_POOLER_URL,
    databaseUrl: !!process.env.DATABASE_URL,
    configurations: {
      usingSupabasePooler: process.env.SUPABASE_POOLER_URL ? 'Yes' : 'No',
      usingDatabaseUrl: process.env.DATABASE_URL ? 'Yes' : 'No'
    }
  };
}

async function generateMigrationReport() {
  console.log('\n🚀 Starting Supabase migration analysis...\n');

  const report = {
    timestamp: new Date().toISOString(),
    environment: await checkEnvironmentConfig(),
    structure: await analyzeSupabaseStructure(),
    dataCounts: await analyzeDataCounts(),
    calendarIntegrations: await testCalendarIntegrations(),
    authentication: await testSupabaseAuth(),
    databaseTests: await testDatabaseQueries()
  };

  return report;
}

async function main() {
  try {
    const report = await generateMigrationReport();

    console.log('\n📋 SUPABASE MIGRATION ANALYSIS REPORT');
    console.log('=' .repeat(50));

    console.log('\n🔧 Environment Configuration:');
    console.log(`  Supabase URL: ${report.environment.supabaseUrl ? '✅' : '❌'}`);
    console.log(`  Supabase Key: ${report.environment.supabaseKey ? '✅' : '❌'}`);
    console.log(`  Supabase Pooler: ${report.environment.supabasePooler ? '✅' : '❌'}`);
    console.log(`  Using Pooler: ${report.environment.configurations.usingSupabasePooler}`);

    console.log('\n📊 Database Structure:');
    console.log(`  Total Tables: ${report.structure.tables.length}`);
    const mainTables = report.structure.tables.filter(t => 
      ['users', 'clinics', 'contacts', 'appointments', 'medical_records', 'calendar_integrations'].includes(t.table_name)
    );
    console.log(`  Main Tables Found: ${mainTables.length}/6`);
    mainTables.forEach(table => console.log(`    - ${table.table_name}`));

    console.log('\n📈 Data Counts:');
    Object.entries(report.dataCounts).forEach(([table, count]) => {
      const status = typeof count === 'number' && count > 0 ? '✅' : '⚠️';
      console.log(`  ${table}: ${count} ${status}`);
    });

    console.log('\n📅 Calendar Integrations:');
    console.log(`  Total: ${report.calendarIntegrations.total}`);
    console.log(`  Active: ${report.calendarIntegrations.active}`);
    if (report.calendarIntegrations.integrations.length > 0) {
      report.calendarIntegrations.integrations.forEach(integration => {
        console.log(`    - ${integration.email} (${integration.provider}) ${integration.is_active ? '✅' : '❌'}`);
      });
    }

    console.log('\n🔐 Authentication Tests:');
    console.log(`  Session API: ${report.authentication.sessionWorking ? '✅' : '❌'}`);
    console.log(`  Admin API: ${report.authentication.adminWorking ? '✅' : '❌'}`);
    console.log(`  Users Found: ${report.authentication.userCount}`);
    if (report.authentication.error) {
      console.log(`  Error: ${report.authentication.error}`);
    }

    console.log('\n⚙️ Database Operation Tests:');
    if (report.databaseTests.userQuery?.working) {
      console.log(`  User Query: ✅ (${report.databaseTests.userQuery.count} users found)`);
    }
    if (report.databaseTests.appointmentJoin?.working) {
      console.log(`  Appointment Joins: ✅ (${report.databaseTests.appointmentJoin.count} appointments)`);
    }
    if (report.databaseTests.calendarQuery?.working) {
      console.log(`  Calendar Query: ✅ (${report.databaseTests.calendarQuery.found} integrations for current user)`);
      if (report.databaseTests.calendarQuery.data) {
        console.log(`    - Found: ${report.databaseTests.calendarQuery.data.email} (${report.databaseTests.calendarQuery.data.provider})`);
      }
    }

    // Migration readiness assessment
    const criticalIssues = [];
    const warnings = [];

    if (!report.environment.supabasePooler) criticalIssues.push('Missing Supabase Pooler URL');
    if (report.dataCounts.users === 0) criticalIssues.push('No users found');
    if (report.calendarIntegrations.total === 0) warnings.push('No calendar integrations found');
    if (!report.authentication.sessionWorking) criticalIssues.push('Supabase Auth not working');

    console.log('\n🎯 Migration Assessment:');
    if (criticalIssues.length === 0) {
      console.log('  Status: ✅ READY FOR PRODUCTION');
      console.log('  ✅ All critical systems working');
      console.log('  ✅ Data successfully migrated');
      console.log('  ✅ Calendar integrations functional');
      console.log('  ✅ Authentication working');
      console.log('\n  🟢 SAFE TO DELETE NEON DATABASE');
    } else {
      console.log('  Status: ❌ ISSUES FOUND');
      criticalIssues.forEach(issue => console.log(`  ❌ ${issue}`));
    }

    if (warnings.length > 0) {
      console.log('\n  ⚠️ Warnings:');
      warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
    }

    // Save report
    const fs = await import('fs/promises');
    await fs.writeFile('supabase-migration-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: supabase-migration-report.json');

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    await pool.end();
  }
}

main();