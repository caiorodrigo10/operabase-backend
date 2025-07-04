import { sql } from 'drizzle-orm';
import { db } from '../db.js';

/**
 * Performance Validation Service
 * Validates database optimization results and monitors performance metrics
 */
export class PerformanceValidatorService {
  
  /**
   * Validate database performance improvements
   */
  async validatePerformanceOptimizations(): Promise<{
    indexesCreated: number;
    queryPerformance: any[];
    capacityMetrics: any;
    recommendations: string[];
  }> {
    console.log('🔍 Validating Phase 1 Database Performance Optimizations');
    
    try {
      // Check created indexes
      const indexesResult = await db.execute(sql`
        SELECT 
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
          AND (indexname LIKE '%clinic%' OR indexname LIKE '%idx_%')
          AND tablename IN ('contacts', 'appointments', 'conversations', 'messages', 'medical_records', 'clinic_users')
        ORDER BY tablename, indexname
      `);

      // Test query performance on critical operations
      const performanceTests = await this.runPerformanceTests();

      // Get database capacity metrics
      const capacityMetrics = await this.getCapacityMetrics();

      // Generate recommendations
      const recommendations = this.generateOptimizationRecommendations(performanceTests, capacityMetrics);

      return {
        indexesCreated: indexesResult.rows?.length || 0,
        queryPerformance: performanceTests,
        capacityMetrics,
        recommendations
      };

    } catch (error) {
      console.error('Performance validation error:', error);
      throw error;
    }
  }

  /**
   * Run performance tests on critical queries
   */
  private async runPerformanceTests() {
    const tests = [];

    // Test 1: Contact listing with clinic filter
    const contactTest = await this.measureQueryTime(sql`
      SELECT * FROM contacts 
      WHERE clinic_id = 1 
      ORDER BY last_interaction DESC 
      LIMIT 100
    `, 'Contact listing');

    tests.push(contactTest);

    // Test 2: Appointment filtering by clinic and date
    const appointmentTest = await this.measureQueryTime(sql`
      SELECT * FROM appointments 
      WHERE clinic_id = 1 
        AND scheduled_date >= CURRENT_DATE 
      ORDER BY scheduled_date 
      LIMIT 50
    `, 'Appointment filtering');

    tests.push(appointmentTest);

    // Test 3: Conversation loading for clinic
    const conversationTest = await this.measureQueryTime(sql`
      SELECT * FROM conversations 
      WHERE clinic_id = 1 
      ORDER BY updated_at DESC 
      LIMIT 50
    `, 'Conversation loading');

    tests.push(conversationTest);

    // Test 4: Medical records lookup
    const medicalRecordsTest = await this.measureQueryTime(sql`
      SELECT * FROM medical_records 
      WHERE clinic_id = 1 
        AND contact_id = 1
      ORDER BY updated_at DESC
    `, 'Medical records lookup');

    tests.push(medicalRecordsTest);

    return tests;
  }

  /**
   * Measure query execution time
   */
  private async measureQueryTime(query: any, testName: string) {
    const startTime = Date.now();
    
    try {
      const result = await db.execute(query);
      const executionTime = Date.now() - startTime;
      
      return {
        testName,
        executionTime,
        recordCount: result.rows?.length || 0,
        status: 'success',
        performance: executionTime < 100 ? 'excellent' : 
                    executionTime < 300 ? 'good' : 
                    executionTime < 500 ? 'acceptable' : 'needs_optimization'
      };
    } catch (error) {
      return {
        testName,
        executionTime: Date.now() - startTime,
        recordCount: 0,
        status: 'error',
        error: (error as Error).message,
        performance: 'failed'
      };
    }
  }

  /**
   * Get database capacity and performance metrics
   */
  private async getCapacityMetrics() {
    try {
      // Connection and activity metrics
      const connectionMetrics = await db.execute(sql`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      // Database size and table statistics
      const tableStats = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
          AND tablename IN ('contacts', 'appointments', 'conversations', 'messages', 'medical_records')
        ORDER BY n_live_tup DESC
      `);

      // Index usage statistics
      const indexStats = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
          AND tablename IN ('contacts', 'appointments', 'conversations', 'messages', 'medical_records')
          AND idx_tup_read > 0
        ORDER BY idx_tup_read DESC
        LIMIT 20
      `);

      return {
        connections: connectionMetrics.rows?.[0] || {},
        tableStatistics: tableStats.rows || [],
        indexUsage: indexStats.rows || []
      };

    } catch (error) {
      console.error('Error getting capacity metrics:', error);
      return {
        connections: {},
        tableStatistics: [],
        indexUsage: []
      };
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(performanceTests: any[], capacityMetrics: any): string[] {
    const recommendations = [];

    // Analyze performance test results
    const slowTests = performanceTests.filter(test => test.executionTime > 300);
    const failedTests = performanceTests.filter(test => test.status === 'error');

    if (slowTests.length > 0) {
      recommendations.push('Some queries still taking >300ms - consider additional indexing or query optimization');
    }

    if (failedTests.length > 0) {
      recommendations.push('Query execution errors detected - review database schema and permissions');
    }

    // Analyze connection metrics
    const connections = capacityMetrics.connections;
    if (connections.total_connections > 80) {
      recommendations.push('High connection count detected - implement connection pooling optimization');
    }

    // Analyze table statistics
    const largestTable = capacityMetrics.tableStatistics[0];
    if (largestTable && largestTable.live_rows > 10000) {
      recommendations.push(`Large table detected (${largestTable.tablename}: ${largestTable.live_rows} rows) - monitor query performance`);
    }

    // Check index usage
    if (capacityMetrics.indexUsage.length === 0) {
      recommendations.push('Limited index usage detected - verify indexes are being utilized by queries');
    }

    // General recommendations based on success
    const avgExecutionTime = performanceTests.reduce((sum, test) => sum + test.executionTime, 0) / performanceTests.length;
    
    if (avgExecutionTime < 100) {
      recommendations.push('Excellent query performance achieved - ready for 200-300+ concurrent users');
    } else if (avgExecutionTime < 300) {
      recommendations.push('Good query performance - proceed with capacity testing');
    } else {
      recommendations.push('Query performance needs additional optimization before scaling');
    }

    return recommendations;
  }

  /**
   * Test concurrent load simulation
   */
  async simulateConcurrentLoad(clinicId: number, concurrentUsers: number = 50): Promise<{
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    errors: string[];
  }> {
    console.log(`🧪 Simulating concurrent load: ${concurrentUsers} users for clinic ${clinicId}`);
    
    const startTime = Date.now();
    const promises = [];
    const errors: string[] = [];
    let successfulRequests = 0;

    // Create concurrent requests
    for (let i = 0; i < concurrentUsers; i++) {
      const promise = this.simulateUserRequest(clinicId)
        .then(() => {
          successfulRequests++;
        })
        .catch((error) => {
          errors.push(`User ${i}: ${error.message}`);
        });
      
      promises.push(promise);
    }

    // Wait for all requests to complete
    await Promise.allSettled(promises);

    const totalTime = Date.now() - startTime;
    const averageResponseTime = totalTime / concurrentUsers;
    const successRate = (successfulRequests / concurrentUsers) * 100;

    return {
      averageResponseTime,
      successRate,
      totalRequests: concurrentUsers,
      errors
    };
  }

  /**
   * Simulate a typical user request pattern
   */
  private async simulateUserRequest(clinicId: number): Promise<void> {
    // Simulate typical user workflow: load contacts → view appointments → check conversations
    await db.execute(sql`
      SELECT * FROM contacts 
      WHERE clinic_id = ${clinicId} 
      ORDER BY last_interaction DESC 
      LIMIT 20
    `);

    await db.execute(sql`
      SELECT * FROM appointments 
      WHERE clinic_id = ${clinicId} 
        AND scheduled_date >= CURRENT_DATE 
      ORDER BY scheduled_date 
      LIMIT 10
    `);

    await db.execute(sql`
      SELECT * FROM conversations 
      WHERE clinic_id = ${clinicId} 
      ORDER BY updated_at DESC 
      LIMIT 10
    `);
  }

  /**
   * Get real-time performance metrics
   */
  async getRealTimeMetrics() {
    const currentTime = new Date().toISOString();
    
    const activeConnections = await db.execute(sql`
      SELECT count(*) as active_count
      FROM pg_stat_activity 
      WHERE state = 'active' AND datname = current_database()
    `);

    const recentActivity = await db.execute(sql`
      SELECT 
        count(*) as total_queries,
        avg(mean_time) as avg_response_time
      FROM pg_stat_statements 
      WHERE last_call >= NOW() - INTERVAL '1 minute'
    `);

    return {
      timestamp: currentTime,
      activeConnections: activeConnections.rows?.[0]?.active_count || 0,
      avgResponseTime: recentActivity.rows?.[0]?.avg_response_time || 0,
      totalQueries: recentActivity.rows?.[0]?.total_queries || 0
    };
  }
}

// Singleton instance
export const performanceValidator = new PerformanceValidatorService();