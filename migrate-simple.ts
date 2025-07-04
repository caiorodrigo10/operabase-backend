import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./shared/schema";

async function migrateToSupabase() {
  console.log('Iniciando migração para Supabase...');
  
  // Local database connection
  const localPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  const localDb = drizzle(localPool, { schema });

  // Supabase connection using the same logic as server/db.ts
  let supabaseUrl = process.env.SUPABASE_POOLER_URL;
  
  if (supabaseUrl) {
    // Fix common issues with Supabase URLs
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
    // Test connections
    await localPool.query('SELECT NOW()');
    console.log('✅ Conexão local OK');
    
    await supabasePool.query('SELECT NOW()');
    console.log('✅ Conexão Supabase OK');

    // Migrate users
    console.log('Migrando usuários...');
    const users = await localDb.select().from(schema.users);
    if (users.length > 0) {
      await supabaseDb.delete(schema.users);
      await supabaseDb.insert(schema.users).values(users);
      console.log(`✅ ${users.length} usuários migrados`);
    }

    // Migrate clinics
    console.log('Migrando clínicas...');
    const clinics = await localDb.select().from(schema.clinics);
    if (clinics.length > 0) {
      await supabaseDb.delete(schema.clinics);
      await supabaseDb.insert(schema.clinics).values(clinics);
      console.log(`✅ ${clinics.length} clínicas migradas`);
    }

    // Migrate clinic_users
    console.log('Migrando usuários das clínicas...');
    const clinicUsers = await localDb.select().from(schema.clinic_users);
    if (clinicUsers.length > 0) {
      await supabaseDb.delete(schema.clinic_users);
      await supabaseDb.insert(schema.clinic_users).values(clinicUsers);
      console.log(`✅ ${clinicUsers.length} usuários de clínicas migrados`);
    }

    // Migrate contacts
    console.log('Migrando contatos...');
    const contacts = await localDb.select().from(schema.contacts);
    if (contacts.length > 0) {
      await supabaseDb.delete(schema.contacts);
      await supabaseDb.insert(schema.contacts).values(contacts);
      console.log(`✅ ${contacts.length} contatos migrados`);
    }

    // Migrate appointments
    console.log('Migrando consultas...');
    const appointments = await localDb.select().from(schema.appointments);
    if (appointments.length > 0) {
      await supabaseDb.delete(schema.appointments);
      await supabaseDb.insert(schema.appointments).values(appointments);
      console.log(`✅ ${appointments.length} consultas migradas`);
    }

    // Migrate medical records
    console.log('Migrando prontuários...');
    const medicalRecords = await localDb.select().from(schema.medical_records);
    if (medicalRecords.length > 0) {
      await supabaseDb.delete(schema.medical_records);
      await supabaseDb.insert(schema.medical_records).values(medicalRecords);
      console.log(`✅ ${medicalRecords.length} prontuários migrados`);
    }

    // Migrate calendar integrations
    console.log('Migrando integrações de calendário...');
    const calendarIntegrations = await localDb.select().from(schema.calendar_integrations);
    if (calendarIntegrations.length > 0) {
      await supabaseDb.delete(schema.calendar_integrations);
      await supabaseDb.insert(schema.calendar_integrations).values(calendarIntegrations);
      console.log(`✅ ${calendarIntegrations.length} integrações de calendário migradas`);
    }

    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await localPool.end();
    await supabasePool.end();
  }
}

migrateToSupabase().catch(console.error);