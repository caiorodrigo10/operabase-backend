import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { contacts } from './server/domains/contacts/contacts.schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Migration script: Update contact statuses to new three-status system
 * Maps old statuses to: lead, ativo, inativo
 */
async function updateContactStatuses() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not found');
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('🔄 Starting contact status migration...');

  try {
    // Update existing statuses to new three-status system
    const statusMapping = {
      'novo': 'lead',
      'em_conversa': 'ativo', 
      'agendado': 'ativo',
      'realizado': 'ativo',
      'pos_atendimento': 'inativo',
      'active': 'ativo',
      'inactive': 'inativo'
    };

    let totalUpdated = 0;

    for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
      const result = await db
        .update(contacts)
        .set({ status: newStatus })
        .where(eq(contacts.status, oldStatus))
        .returning({ id: contacts.id });

      console.log(`✅ Updated ${result.length} contacts from '${oldStatus}' to '${newStatus}'`);
      totalUpdated += result.length;
    }

    // Check for any unmapped statuses
    const unmappedStatuses = await db
      .select({ status: contacts.status, count: sql<number>`count(*)` })
      .from(contacts)
      .where(sql`${contacts.status} NOT IN ('lead', 'ativo', 'inativo')`)
      .groupBy(contacts.status);

    if (unmappedStatuses.length > 0) {
      console.log('⚠️ Found unmapped statuses:');
      unmappedStatuses.forEach(row => {
        console.log(`  - ${row.status}: ${row.count} contacts`);
      });

      // Set unmapped statuses to 'lead' as default
      await db
        .update(contacts)
        .set({ status: 'lead' })
        .where(sql`${contacts.status} NOT IN ('lead', 'ativo', 'inativo')`);

      console.log('✅ Set unmapped statuses to "lead"');
    }

    // Final status distribution
    const finalDistribution = await db
      .select({ status: contacts.status, count: sql<number>`count(*)` })
      .from(contacts)
      .groupBy(contacts.status);

    console.log('\n📊 Final status distribution:');
    finalDistribution.forEach(row => {
      console.log(`  - ${row.status}: ${row.count} contacts`);
    });

    console.log(`\n✅ Migration completed successfully! Total contacts updated: ${totalUpdated}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
updateContactStatuses().catch(console.error);