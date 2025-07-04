import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './shared/schema';

async function migrateToSupabaseComplete() {
  // Local PostgreSQL connection
  const localPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  const localDb = drizzle(localPool, { schema });

  // Supabase connection
  let supabaseUrl = process.env.SUPABASE_POOLER_URL;
  
  if (supabaseUrl) {
    if (supabaseUrl.startsWith('postgres://')) {
      supabaseUrl = supabaseUrl.replace('postgres://', 'postgresql://');
    }
    if (supabaseUrl.includes('#')) {
      supabaseUrl = supabaseUrl.replace(/#/g, '%23');
    }
  }
  
  const supabasePool = new Pool({
    connectionString: supabaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  const supabaseDb = drizzle(supabasePool, { schema });

  try {
    console.log('Iniciando migração completa para Supabase...');
    
    // Test connections
    await localPool.query('SELECT 1');
    console.log('✅ Conexão local OK');
    
    await supabasePool.query('SELECT 1');
    console.log('✅ Conexão Supabase OK');

    // Migrate in correct order to respect foreign key constraints
    
    // 1. Users (no dependencies)
    console.log('Migrando usuários...');
    const users = await localDb.select().from(schema.users);
    if (users.length > 0) {
      await supabaseDb.insert(schema.users).values(users);
      console.log(`✅ ${users.length} usuários migrados`);
    }

    // 2. Clinics (no dependencies)
    console.log('Migrando clínicas...');
    const clinics = await localDb.select().from(schema.clinics);
    if (clinics.length > 0) {
      await supabaseDb.insert(schema.clinics).values(clinics);
      console.log(`✅ ${clinics.length} clínicas migradas`);
    }

    // 3. Contacts (depends on clinics)
    console.log('Migrando contatos...');
    const contacts = await localDb.select().from(schema.contacts);
    if (contacts.length > 0) {
      await supabaseDb.insert(schema.contacts).values(contacts);
      console.log(`✅ ${contacts.length} contatos migrados`);
    }

    // 4. Appointments (depends on users and contacts)
    console.log('Migrando agendamentos...');
    const appointments = await localDb.select().from(schema.appointments);
    if (appointments.length > 0) {
      await supabaseDb.insert(schema.appointments).values(appointments);
      console.log(`✅ ${appointments.length} agendamentos migrados`);
    }

    // 5. Medical records - skip as table doesn't exist in current schema
    console.log('Pulando prontuários (tabela não existe no schema atual)...');

    // 6. Calendar integrations (depends on users)
    console.log('Migrando integrações de calendário...');
    const calendarIntegrations = await localDb.select().from(schema.calendar_integrations);
    if (calendarIntegrations.length > 0) {
      await supabaseDb.insert(schema.calendar_integrations).values(calendarIntegrations);
      console.log(`✅ ${calendarIntegrations.length} integrações de calendário migradas`);
    }

    // 7. Conversations (depends on contacts)
    console.log('Migrando conversas...');
    const conversations = await localDb.select().from(schema.conversations);
    if (conversations.length > 0) {
      await supabaseDb.insert(schema.conversations).values(conversations);
      console.log(`✅ ${conversations.length} conversas migradas`);
    }

    // 8. Messages (depends on conversations)
    console.log('Migrando mensagens...');
    const messages = await localDb.select().from(schema.messages);
    if (messages.length > 0) {
      await supabaseDb.insert(schema.messages).values(messages);
      console.log(`✅ ${messages.length} mensagens migradas`);
    }

    // 9. Pipeline opportunities (depends on contacts)
    console.log('Migrando oportunidades do pipeline...');
    const pipelineOpportunities = await localDb.select().from(schema.pipeline_opportunities);
    if (pipelineOpportunities.length > 0) {
      await supabaseDb.insert(schema.pipeline_opportunities).values(pipelineOpportunities);
      console.log(`✅ ${pipelineOpportunities.length} oportunidades do pipeline migradas`);
    }

    // 10. Pipeline activities (depends on pipeline opportunities)
    console.log('Migrando atividades do pipeline...');
    const pipelineActivities = await localDb.select().from(schema.pipeline_activities);
    if (pipelineActivities.length > 0) {
      await supabaseDb.insert(schema.pipeline_activities).values(pipelineActivities);
      console.log(`✅ ${pipelineActivities.length} atividades do pipeline migradas`);
    }

    // 11. Pipeline history (depends on pipeline opportunities)
    console.log('Migrando histórico do pipeline...');
    const pipelineHistory = await localDb.select().from(schema.pipeline_history);
    if (pipelineHistory.length > 0) {
      await supabaseDb.insert(schema.pipeline_history).values(pipelineHistory);
      console.log(`✅ ${pipelineHistory.length} registros de histórico migrados`);
    }

    console.log('🎉 Migração completa finalizada com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await localPool.end();
    await supabasePool.end();
  }
}

migrateToSupabaseComplete().catch(console.error);