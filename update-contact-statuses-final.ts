/**
 * Final Contact Status Migration
 * Updates all contact statuses to use only: lead, ativo, inativo
 * Maps legacy statuses to new standard statuses
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateContactStatuses() {
  console.log('🔄 Starting contact status migration...');
  
  try {
    // First, check current status distribution
    const { data: statusCounts, error: countError } = await supabase
      .from('contacts')
      .select('status')
      .not('status', 'in', '("lead","ativo","inativo")');
    
    if (countError) {
      console.error('❌ Error checking current statuses:', countError);
      return;
    }

    console.log(`📊 Found ${statusCounts?.length || 0} contacts with non-standard statuses`);
    
    if (!statusCounts || statusCounts.length === 0) {
      console.log('✅ All contact statuses are already standardized!');
      return;
    }

    // Group by status to see what we're working with
    const statusGroups: Record<string, number> = {};
    statusCounts.forEach(contact => {
      statusGroups[contact.status] = (statusGroups[contact.status] || 0) + 1;
    });
    
    console.log('📋 Current non-standard statuses:', statusGroups);

    // Update legacy statuses to new standard statuses
    const statusMappings = [
      { from: 'novo', to: 'lead', description: 'New contacts → Lead' },
      { from: 'em_conversa', to: 'ativo', description: 'In conversation → Ativo' },
      { from: 'agendado', to: 'ativo', description: 'Scheduled → Ativo' },
      { from: 'realizado', to: 'ativo', description: 'Completed → Ativo' },
      { from: 'pos_atendimento', to: 'inativo', description: 'Post-service → Inativo' },
      { from: 'arquivado', to: 'inativo', description: 'Archived → Inativo' },
      { from: 'perdido', to: 'inativo', description: 'Lost → Inativo' },
      { from: 'cancelado', to: 'inativo', description: 'Cancelled → Inativo' }
    ];

    let totalUpdated = 0;

    for (const mapping of statusMappings) {
      const { data: updateResult, error: updateError } = await supabase
        .from('contacts')
        .update({ status: mapping.to })
        .eq('status', mapping.from)
        .select('id');

      if (updateError) {
        console.error(`❌ Error updating ${mapping.from} to ${mapping.to}:`, updateError);
        continue;
      }

      const updatedCount = updateResult?.length || 0;
      if (updatedCount > 0) {
        console.log(`✅ ${mapping.description}: ${updatedCount} contacts updated`);
        totalUpdated += updatedCount;
      }
    }

    // Handle any remaining non-standard statuses by setting them to 'lead'
    const { data: remainingContacts, error: remainingError } = await supabase
      .from('contacts')
      .select('id, status')
      .not('status', 'in', '("lead","ativo","inativo")');

    if (remainingError) {
      console.error('❌ Error checking remaining statuses:', remainingError);
    } else if (remainingContacts && remainingContacts.length > 0) {
      console.log(`🔧 Found ${remainingContacts.length} contacts with other statuses, setting to 'lead'`);
      
      const { data: fallbackResult, error: fallbackError } = await supabase
        .from('contacts')
        .update({ status: 'lead' })
        .not('status', 'in', '("lead","ativo","inativo")')
        .select('id');

      if (fallbackError) {
        console.error('❌ Error updating remaining statuses:', fallbackError);
      } else {
        const fallbackCount = fallbackResult?.length || 0;
        console.log(`✅ Fallback: ${fallbackCount} contacts set to 'lead'`);
        totalUpdated += fallbackCount;
      }
    }

    console.log(`\n🎉 Migration completed! Total contacts updated: ${totalUpdated}`);

    // Verify final status distribution
    const { data: finalCounts, error: finalError } = await supabase
      .from('contacts')
      .select('status')
      .order('status');

    if (finalError) {
      console.error('❌ Error checking final status distribution:', finalError);
    } else {
      const finalGroups: Record<string, number> = {};
      finalCounts?.forEach(contact => {
        finalGroups[contact.status] = (finalGroups[contact.status] || 0) + 1;
      });
      console.log('\n📊 Final status distribution:', finalGroups);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
updateContactStatuses().then(() => {
  console.log('✅ Contact status migration script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Migration script failed:', error);
  process.exit(1);
});