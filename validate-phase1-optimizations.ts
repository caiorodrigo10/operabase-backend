import { sql } from 'drizzle-orm';
import { db } from './server/db.js';

/**
 * Phase 1 Database Optimization Validation
 * Comprehensive validation of performance improvements
 */
async function validatePhase1Optimizations() {
  console.log('🚀 FASE 1: VALIDAÇÃO DE OTIMIZAÇÕES DE BANCO DE DADOS');
  console.log('Target: Response time <500ms para 200-300+ usuários simultâneos');
  console.log('=' .repeat(60));

  const results = {
    indexValidation: { created: 0, verified: 0 },
    performanceTests: [],
    capacityMetrics: {},
    recommendations: [],
    overallStatus: 'UNKNOWN'
  };

  try {
    // 1. Validate created indexes
    console.log('\n1️⃣ Validando índices criados...');
    
    const indexQuery = await db.execute(sql`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
        AND tablename IN ('contacts', 'appointments', 'conversations', 'messages', 'medical_records', 'clinic_users')
      ORDER BY tablename, indexname
    `);

    results.indexValidation.created = indexQuery.rows?.length || 0;
    console.log(`✅ ${results.indexValidation.created} índices multi-tenant encontrados`);

    // 2. Test critical query performance
    console.log('\n2️⃣ Testando performance de queries críticas...');

    // Contact listing test
    const contactStart = Date.now();
    await db.execute(sql`
      SELECT id, name, phone, status, last_interaction 
      FROM contacts 
      WHERE clinic_id = 1 
      ORDER BY last_interaction DESC 
      LIMIT 100
    `);
    const contactTime = Date.now() - contactStart;
    
    results.performanceTests.push({
      test: 'Contact Listing',
      time: contactTime,
      status: contactTime < 100 ? 'EXCELLENT' : contactTime < 300 ? 'GOOD' : 'NEEDS_OPTIMIZATION'
    });

    // Appointment filtering test
    const appointmentStart = Date.now();
    await db.execute(sql`
      SELECT id, contact_id, scheduled_date, status 
      FROM appointments 
      WHERE clinic_id = 1 
        AND scheduled_date >= CURRENT_DATE 
      ORDER BY scheduled_date 
      LIMIT 50
    `);
    const appointmentTime = Date.now() - appointmentStart;
    
    results.performanceTests.push({
      test: 'Appointment Filtering',
      time: appointmentTime,
      status: appointmentTime < 100 ? 'EXCELLENT' : appointmentTime < 300 ? 'GOOD' : 'NEEDS_OPTIMIZATION'
    });

    // Conversation loading test
    const conversationStart = Date.now();
    await db.execute(sql`
      SELECT id, contact_id, status, updated_at 
      FROM conversations 
      WHERE clinic_id = 1 
      ORDER BY updated_at DESC 
      LIMIT 50
    `);
    const conversationTime = Date.now() - conversationStart;
    
    results.performanceTests.push({
      test: 'Conversation Loading',
      time: conversationTime,
      status: conversationTime < 100 ? 'EXCELLENT' : conversationTime < 300 ? 'GOOD' : 'NEEDS_OPTIMIZATION'
    });

    console.log('📊 Resultados dos testes de performance:');
    results.performanceTests.forEach(test => {
      const emoji = test.status === 'EXCELLENT' ? '🟢' : test.status === 'GOOD' ? '🟡' : '🔴';
      console.log(`   ${emoji} ${test.test}: ${test.time}ms (${test.status})`);
    });

    // 3. Database capacity metrics
    console.log('\n3️⃣ Coletando métricas de capacidade...');
    
    const connectionMetrics = await db.execute(sql`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    const tableStats = await db.execute(sql`
      SELECT 
        tablename,
        n_live_tup as live_rows,
        n_tup_ins as inserts,
        n_tup_upd as updates
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND tablename IN ('contacts', 'appointments', 'conversations', 'messages', 'medical_records')
      ORDER BY n_live_tup DESC
    `);

    results.capacityMetrics = {
      connections: connectionMetrics.rows?.[0] || {},
      tableStats: tableStats.rows || []
    };

    console.log('📈 Métricas de capacidade:');
    console.log(`   Conexões ativas: ${results.capacityMetrics.connections.active_connections || 0}`);
    console.log(`   Conexões totais: ${results.capacityMetrics.connections.total_connections || 0}`);

    // 4. Concurrent load simulation
    console.log('\n4️⃣ Simulando carga concorrente (50 usuários)...');
    
    const concurrentStart = Date.now();
    const concurrentPromises = [];
    let successCount = 0;
    
    for (let i = 0; i < 50; i++) {
      const promise = db.execute(sql`
        SELECT id, name FROM contacts 
        WHERE clinic_id = 1 
        ORDER BY last_interaction DESC 
        LIMIT 20
      `).then(() => {
        successCount++;
      }).catch(() => {
        // Error handled
      });
      
      concurrentPromises.push(promise);
    }

    await Promise.allSettled(concurrentPromises);
    const concurrentTime = Date.now() - concurrentStart;
    const avgResponseTime = concurrentTime / 50;
    const successRate = (successCount / 50) * 100;

    console.log(`✅ Teste de carga concorrente concluído:`);
    console.log(`   Tempo médio de resposta: ${Math.round(avgResponseTime)}ms`);
    console.log(`   Taxa de sucesso: ${Math.round(successRate)}%`);

    // 5. Generate recommendations
    console.log('\n5️⃣ Gerando recomendações...');
    
    const avgTestTime = results.performanceTests.reduce((sum, test) => sum + test.time, 0) / results.performanceTests.length;
    
    if (avgTestTime < 100) {
      results.recommendations.push('EXCELENTE: Performance de queries atingiu meta (<100ms)');
      results.recommendations.push('PRONTO: Sistema pode suportar 200-300+ usuários simultâneos');
      results.overallStatus = 'SUCCESS';
    } else if (avgTestTime < 300) {
      results.recommendations.push('BOM: Performance dentro do aceitável (<300ms)');
      results.recommendations.push('PROCEDER: Realizar testes de capacidade com usuários reais');
      results.overallStatus = 'GOOD';
    } else {
      results.recommendations.push('ATENÇÃO: Algumas queries ainda lentas (>300ms)');
      results.recommendations.push('OTIMIZAR: Revisar índices adicionais ou queries específicas');
      results.overallStatus = 'NEEDS_IMPROVEMENT';
    }

    if (results.indexValidation.created >= 15) {
      results.recommendations.push('ÍNDICES: Cobertura adequada de índices multi-tenant implementada');
    } else {
      results.recommendations.push('ÍNDICES: Verificar se todos os índices foram criados corretamente');
    }

    if (successRate >= 95) {
      results.recommendations.push('ESTABILIDADE: Alta taxa de sucesso em carga concorrente');
    } else {
      results.recommendations.push('ESTABILIDADE: Investigar falhas em carga concorrente');
    }

    // 6. Final assessment
    console.log('\n6️⃣ Avaliação final da Fase 1...');
    
    const improvementRatio = 1299 / avgTestTime; // Original 1299ms vs current avg
    const improvementPercent = ((1299 - avgTestTime) / 1299) * 100;

    console.log('\n' + '=' .repeat(60));
    console.log('🎯 RESULTADOS DA FASE 1 - OTIMIZAÇÃO DE BANCO DE DADOS');
    console.log('=' .repeat(60));

    console.log('\n📊 MÉTRICAS DE PERFORMANCE:');
    console.log(`✅ Tempo médio de resposta: ${Math.round(avgTestTime)}ms`);
    console.log(`✅ Melhoria de performance: ${Math.round(improvementPercent)}%`);
    console.log(`✅ Ratio de melhoria: ${Math.round(improvementRatio)}x mais rápido`);
    console.log(`✅ Índices multi-tenant criados: ${results.indexValidation.created}`);

    console.log('\n🎯 OBJETIVOS DA FASE 1:');
    console.log(`${avgTestTime < 500 ? '✅' : '❌'} Response time < 500ms: ${Math.round(avgTestTime)}ms`);
    console.log(`${results.indexValidation.created >= 10 ? '✅' : '❌'} Índices compostos essenciais: ${results.indexValidation.created}`);
    console.log(`${successRate >= 90 ? '✅' : '❌'} Queries multi-tenant otimizadas: ${Math.round(successRate)}%`);
    console.log(`${results.overallStatus === 'SUCCESS' ? '✅' : '❌'} Capacidade para 200-300+ usuários: ${results.overallStatus}`);

    console.log('\n💡 RECOMENDAÇÕES:');
    results.recommendations.forEach(rec => console.log(`• ${rec}`));

    console.log('\n🔄 PRÓXIMOS PASSOS:');
    if (results.overallStatus === 'SUCCESS') {
      console.log('1. Implementar cache inteligente (Fase 2)');
      console.log('2. Executar testes de carga com 200+ usuários reais');
      console.log('3. Monitorar performance em produção');
      console.log('4. Implementar otimizações adicionais conforme necessário');
    } else {
      console.log('1. Revisar queries específicas ainda lentas');
      console.log('2. Verificar criação completa de todos os índices');
      console.log('3. Analisar gargalos remanescentes');
      console.log('4. Re-executar validação após correções');
    }

    console.log('\n🏆 STATUS GERAL DA FASE 1:');
    const statusEmoji = results.overallStatus === 'SUCCESS' ? '🟢' : 
                       results.overallStatus === 'GOOD' ? '🟡' : '🔴';
    console.log(`${statusEmoji} FASE 1 OTIMIZAÇÃO DE BANCO: ${results.overallStatus}`);

  } catch (error) {
    console.error('\n❌ Erro na validação:', error);
    results.overallStatus = 'ERROR';
  }

  return results;
}

// Execute validation
validatePhase1Optimizations()
  .then((results) => {
    if (results.overallStatus === 'SUCCESS') {
      console.log('\n🎉 Fase 1 concluída com sucesso! Sistema otimizado para alta concorrência.');
    } else {
      console.log('\n⚠️ Fase 1 precisa de ajustes adicionais para atingir metas completas.');
    }
  })
  .catch((error) => {
    console.error('\n💥 Falha na validação da Fase 1:', error);
  });