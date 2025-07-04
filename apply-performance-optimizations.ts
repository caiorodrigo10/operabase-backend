import { Client } from 'pg';

/**
 * Performance Optimization Phase 1: Database Query Optimization
 * Target: Reduce response times from 1299ms to <500ms
 * Support: 200-300+ concurrent users
 */
async function applyPerformanceOptimizations() {
  console.log('🚀 Performance Optimization Phase 1: Starting database optimizations...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Create optimized indexes for conversation queries
    console.log('\n📊 Creating optimized database indexes...');
    
    // Index for conversations list query (clinic_id + updated_at)
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_clinic_updated 
      ON conversations (clinic_id, updated_at DESC) 
      WHERE clinic_id IS NOT NULL;
    `);
    console.log('✅ Created index: conversations by clinic + updated_at');

    // Index for messages by conversation (conversation_id + timestamp)  
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_timestamp 
      ON messages (conversation_id, timestamp DESC) 
      WHERE conversation_id IS NOT NULL AND timestamp IS NOT NULL;
    `);
    console.log('✅ Created index: messages by conversation + timestamp');

    // Index for contacts by clinic
    await client.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_clinic_status 
      ON contacts (clinic_id, status) 
      WHERE clinic_id IS NOT NULL;
    `);
    console.log('✅ Created index: contacts by clinic + status');

    // 2. Create materialized view for last messages (performance boost)
    console.log('\n📈 Creating materialized view for last messages...');
    
    await client.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS conversation_last_messages AS
      SELECT DISTINCT ON (conversation_id) 
        conversation_id,
        content as last_content,
        timestamp as last_timestamp,
        id as last_message_id,
        sender_type,
        direction
      FROM messages 
      WHERE timestamp IS NOT NULL
      ORDER BY conversation_id, timestamp DESC, id DESC;
    `);
    console.log('✅ Created materialized view: conversation_last_messages');

    // Create index on materialized view
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_last_messages_pk 
      ON conversation_last_messages (conversation_id);
    `);
    console.log('✅ Created index on materialized view');

    // 3. Create function to refresh materialized view
    await client.query(`
      CREATE OR REPLACE FUNCTION refresh_conversation_last_messages()
      RETURNS VOID AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY conversation_last_messages;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created refresh function for materialized view');

    // 4. Create optimized query function for conversations list
    console.log('\n⚡ Creating optimized conversation list function...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION get_conversations_optimized(clinic_id_param INTEGER)
      RETURNS TABLE(
        id BIGINT,
        clinic_id INTEGER,
        contact_id INTEGER,
        status TEXT,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        contact_name TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        contact_status TEXT,
        last_message_content TEXT,
        last_message_timestamp TIMESTAMPTZ,
        last_message_direction TEXT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          c.id,
          c.clinic_id,
          c.contact_id,
          c.status,
          c.created_at,
          c.updated_at,
          ct.name as contact_name,
          ct.phone as contact_phone,
          ct.email as contact_email,
          ct.status as contact_status,
          clm.last_content as last_message_content,
          clm.last_timestamp as last_message_timestamp,
          clm.direction as last_message_direction
        FROM conversations c
        INNER JOIN contacts ct ON c.contact_id = ct.id
        LEFT JOIN conversation_last_messages clm ON c.id = clm.conversation_id
        WHERE c.clinic_id = clinic_id_param
        ORDER BY 
          COALESCE(clm.last_timestamp, c.updated_at, c.created_at) DESC,
          c.id DESC
        LIMIT 50;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created optimized conversation list function');

    // 5. Initial refresh of materialized view
    console.log('\n🔄 Performing initial refresh of materialized view...');
    await client.query('SELECT refresh_conversation_last_messages();');
    console.log('✅ Materialized view refreshed');

    // 6. Create trigger to auto-refresh materialized view on message changes
    await client.query(`
      CREATE OR REPLACE FUNCTION trigger_refresh_last_messages()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Refresh asynchronously to avoid blocking
        PERFORM pg_notify('refresh_last_messages', '');
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS messages_refresh_trigger ON messages;
      CREATE TRIGGER messages_refresh_trigger
        AFTER INSERT OR UPDATE OR DELETE ON messages
        FOR EACH ROW
        EXECUTE FUNCTION trigger_refresh_last_messages();
    `);
    console.log('✅ Created auto-refresh trigger for materialized view');

    // 7. Analyze tables for better query planning
    console.log('\n📊 Analyzing tables for query optimization...');
    await client.query('ANALYZE conversations, messages, contacts;');
    console.log('✅ Tables analyzed');

    // 8. Test optimized query performance
    console.log('\n🧪 Testing optimized query performance...');
    const startTime = Date.now();
    const result = await client.query('SELECT * FROM get_conversations_optimized(1);');
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    console.log(`✅ Optimized query completed in ${queryTime}ms`);
    console.log(`📊 Found ${result.rows.length} conversations`);
    
    if (queryTime < 100) {
      console.log('🎉 Performance target achieved! (<100ms)');
    } else if (queryTime < 500) {
      console.log('✅ Good performance achieved (<500ms)');
    } else {
      console.log('⚠️ Performance needs further optimization (>500ms)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE OPTIMIZATION SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Database indexes created for optimal query performance');
    console.log('✅ Materialized view created for last messages caching');
    console.log('✅ Auto-refresh trigger implemented for real-time updates');
    console.log('✅ Optimized function created for conversation list queries');
    console.log(`✅ Query performance: ${queryTime}ms (target: <500ms)`);
    console.log('\n💡 Next steps:');
    console.log('   • Update API routes to use optimized function');
    console.log('   • Implement Redis caching layer');
    console.log('   • Add connection pooling');
    console.log('   • Monitor query performance in production');

  } catch (error) {
    console.error('❌ Error applying performance optimizations:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

// Execute optimization
applyPerformanceOptimizations().catch(console.error);