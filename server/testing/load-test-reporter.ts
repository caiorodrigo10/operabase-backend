import { structuredLogger, LogCategory } from '../shared/structured-logger.service.js';
import { loadTestingService } from './load-testing.service.js';
import { medicalScenarios, ScenarioResult } from './medical-scenarios.js';
import { tenantIsolationValidator, TenantIsolationResult } from './tenant-isolation-validator.js';
import { resourceMonitor, ResourceSnapshot } from './resource-monitor.service.js';
import { performanceMonitor } from '../shared/performance-monitor.js';
import { cacheService } from '../shared/redis-cache.service.js';
import { nanoid } from 'nanoid';

/**
 * Load test report configuration
 */
export interface LoadTestReportConfig {
  includeRawData: boolean;
  includeResourceMetrics: boolean;
  includeRecommendations: boolean;
  includeGraphData: boolean;
  format: 'json' | 'html' | 'markdown';
  timeRange?: {
    start: string;
    end: string;
  };
}

/**
 * Comprehensive load test report
 */
export interface LoadTestReport {
  id: string;
  generated_at: string;
  system_info: {
    version: string;
    environment: string;
    node_version: string;
    uptime: number;
  };
  executive_summary: {
    total_tests: number;
    success_rate: number;
    max_concurrent_users: number;
    avg_response_time: number;
    peak_throughput: number;
    critical_violations: number;
    overall_rating: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL';
    readiness_status: 'PRODUCTION_READY' | 'NEEDS_OPTIMIZATION' | 'REQUIRES_FIXES' | 'NOT_READY';
  };
  performance_baseline: {
    target_users: number;
    achieved_users: number;
    breaking_point?: number;
    baseline_metrics: {
      response_time_p50: number;
      response_time_p95: number;
      response_time_p99: number;
      throughput: number;
      error_rate: number;
      cpu_usage: number;
      memory_usage: number;
      cache_hit_rate: number;
    };
  };
  test_results: {
    load_tests: any[];
    isolation_tests: TenantIsolationResult[];
    scenario_results: ScenarioResult[];
  };
  resource_analysis: {
    cpu_utilization: ResourceUtilizationAnalysis;
    memory_utilization: ResourceUtilizationAnalysis;
    database_performance: DatabasePerformanceAnalysis;
    cache_performance: CachePerformanceAnalysis;
    network_performance: NetworkPerformanceAnalysis;
  };
  bottleneck_analysis: {
    identified_bottlenecks: BottleneckInfo[];
    performance_recommendations: string[];
    scaling_recommendations: string[];
    optimization_priorities: OptimizationPriority[];
  };
  capacity_planning: {
    current_capacity: number;
    recommended_capacity: number;
    scaling_strategy: 'vertical' | 'horizontal' | 'hybrid';
    resource_requirements: ResourceRequirements;
    cost_analysis: CostAnalysis;
  };
  security_analysis: {
    tenant_isolation_status: 'SECURE' | 'VULNERABILITIES_FOUND' | 'CRITICAL_ISSUES';
    isolation_violations: number;
    security_recommendations: string[];
  };
  recommendations: {
    immediate_actions: string[];
    short_term_improvements: string[];
    long_term_optimizations: string[];
    monitoring_setup: string[];
  };
  raw_data?: {
    resource_snapshots: ResourceSnapshot[];
    detailed_metrics: any[];
    test_executions: any[];
  };
}

/**
 * Resource utilization analysis
 */
interface ResourceUtilizationAnalysis {
  average: number;
  peak: number;
  baseline: number;
  variance: number;
  trend: 'stable' | 'increasing' | 'decreasing' | 'volatile';
  recommendations: string[];
}

/**
 * Database performance analysis
 */
interface DatabasePerformanceAnalysis {
  connection_utilization: number;
  avg_query_time: number;
  slow_queries: number;
  connection_pool_efficiency: number;
  recommendations: string[];
}

/**
 * Cache performance analysis
 */
interface CachePerformanceAnalysis {
  hit_rate: number;
  miss_rate: number;
  avg_response_time: number;
  memory_efficiency: number;
  recommendations: string[];
}

/**
 * Network performance analysis
 */
interface NetworkPerformanceAnalysis {
  avg_latency: number;
  peak_throughput: number;
  concurrent_connections: number;
  bandwidth_utilization: number;
  recommendations: string[];
}

/**
 * Bottleneck information
 */
interface BottleneckInfo {
  component: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: string;
  solution: string;
  estimated_effort: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Optimization priority
 */
interface OptimizationPriority {
  task: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  priority_score: number;
  estimated_improvement: string;
}

/**
 * Resource requirements
 */
interface ResourceRequirements {
  cpu_cores: number;
  memory_gb: number;
  storage_gb: number;
  network_bandwidth: string;
  database_connections: number;
  cache_memory: number;
}

/**
 * Cost analysis
 */
interface CostAnalysis {
  current_monthly_cost: number;
  projected_monthly_cost: number;
  cost_per_user: number;
  scaling_cost_factor: number;
  optimization_savings: number;
}

/**
 * Load test reporter for generating comprehensive analysis and recommendations
 */
export class LoadTestReporter {
  private reports: Map<string, LoadTestReport> = new Map();

  constructor() {
    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'load_test_reporter_initialized',
      { timestamp: new Date().toISOString() }
    );
  }

  /**
   * Generate comprehensive load test report
   */
  async generateComprehensiveReport(config: LoadTestReportConfig = {
    includeRawData: false,
    includeResourceMetrics: true,
    includeRecommendations: true,
    includeGraphData: false,
    format: 'json'
  }): Promise<LoadTestReport> {
    const reportId = nanoid();
    const generatedAt = new Date().toISOString();

    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'generating_comprehensive_report',
      { report_id: reportId, config }
    );

    // Collect all test data
    const loadTests = loadTestingService.getExecutionHistory();
    const isolationTests = tenantIsolationValidator.getAllTestResults();
    const scenarioResults = medicalScenarios.getExecutionResults();
    const resourceData = resourceMonitor.exportData();
    const currentMetrics = performanceMonitor.getMetrics();
    const cacheStats = cacheService.getStats();

    // Generate report sections
    const systemInfo = this.generateSystemInfo();
    const executiveSummary = this.generateExecutiveSummary(loadTests, isolationTests, scenarioResults);
    const performanceBaseline = this.generatePerformanceBaseline(loadTests, resourceData);
    const resourceAnalysis = this.generateResourceAnalysis(resourceData);
    const bottleneckAnalysis = this.generateBottleneckAnalysis(loadTests, resourceData);
    const capacityPlanning = this.generateCapacityPlanning(loadTests, executiveSummary);
    const securityAnalysis = this.generateSecurityAnalysis(isolationTests);
    const recommendations = this.generateRecommendations(executiveSummary, bottleneckAnalysis, securityAnalysis);

    const report: LoadTestReport = {
      id: reportId,
      generated_at: generatedAt,
      system_info: systemInfo,
      executive_summary: executiveSummary,
      performance_baseline: performanceBaseline,
      test_results: {
        load_tests: loadTests,
        isolation_tests: isolationTests,
        scenario_results: scenarioResults
      },
      resource_analysis: resourceAnalysis,
      bottleneck_analysis: bottleneckAnalysis,
      capacity_planning: capacityPlanning,
      security_analysis: securityAnalysis,
      recommendations: recommendations
    };

    // Include raw data if requested
    if (config.includeRawData) {
      report.raw_data = {
        resource_snapshots: resourceData.snapshots,
        detailed_metrics: [currentMetrics, cacheStats],
        test_executions: loadTests
      };
    }

    this.reports.set(reportId, report);

    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'comprehensive_report_generated',
      {
        report_id: reportId,
        overall_rating: executiveSummary.overall_rating,
        readiness_status: executiveSummary.readiness_status,
        critical_violations: executiveSummary.critical_violations
      }
    );

    return report;
  }

  /**
   * Generate system information
   */
  private generateSystemInfo(): any {
    return {
      version: 'v4.0-load-testing',
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
      uptime: process.uptime()
    };
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(loadTests: any[], isolationTests: TenantIsolationResult[], scenarioResults: ScenarioResult[]): any {
    const totalTests = loadTests.length + isolationTests.length + scenarioResults.length;
    const successfulTests = [
      ...loadTests.filter(t => t.status === 'completed'),
      ...isolationTests.filter(t => t.success),
      ...scenarioResults.filter(t => t.success)
    ].length;

    const successRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;

    // Calculate max concurrent users achieved
    const maxConcurrentUsers = Math.max(
      ...loadTests.map(t => t.virtualUsers?.size || 0),
      0
    );

    // Calculate average response time across all tests
    const allResponseTimes = [
      ...loadTests.map(t => t.metrics?.avgResponseTime || 0),
      ...scenarioResults.map(t => t.metrics?.averageResponseTime || 0)
    ];
    const avgResponseTime = allResponseTimes.length > 0 ?
      allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length : 0;

    // Calculate peak throughput
    const peakThroughput = Math.max(
      ...loadTests.map(t => t.metrics?.currentThroughput || 0),
      ...scenarioResults.map(t => t.metrics?.throughput || 0),
      0
    );

    // Count critical violations
    const criticalViolations = isolationTests.reduce((count, test) => 
      count + test.violations.filter(v => v.severity === 'CRITICAL').length, 0
    );

    // Determine overall rating
    let overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL';
    if (criticalViolations > 0 || successRate < 70) {
      overallRating = 'CRITICAL';
    } else if (successRate < 85 || avgResponseTime > 1000) {
      overallRating = 'NEEDS_IMPROVEMENT';
    } else if (successRate < 95 || avgResponseTime > 500) {
      overallRating = 'GOOD';
    } else {
      overallRating = 'EXCELLENT';
    }

    // Determine readiness status
    let readinessStatus: 'PRODUCTION_READY' | 'NEEDS_OPTIMIZATION' | 'REQUIRES_FIXES' | 'NOT_READY';
    if (overallRating === 'CRITICAL') {
      readinessStatus = 'NOT_READY';
    } else if (overallRating === 'NEEDS_IMPROVEMENT') {
      readinessStatus = 'REQUIRES_FIXES';
    } else if (overallRating === 'GOOD') {
      readinessStatus = 'NEEDS_OPTIMIZATION';
    } else {
      readinessStatus = 'PRODUCTION_READY';
    }

    return {
      total_tests: totalTests,
      success_rate: successRate,
      max_concurrent_users: maxConcurrentUsers,
      avg_response_time: avgResponseTime,
      peak_throughput: peakThroughput,
      critical_violations: criticalViolations,
      overall_rating: overallRating,
      readiness_status: readinessStatus
    };
  }

  /**
   * Generate performance baseline
   */
  private generatePerformanceBaseline(loadTests: any[], resourceData: any): any {
    const targetUsers = 1000; // Target from requirements
    const achievedUsers = Math.max(...loadTests.map(t => t.virtualUsers?.size || 0), 0);
    
    // Find breaking point if any
    const breakingPoint = loadTests.find(t => t.breakingPoint)?.breakingPoint?.userCount;

    // Calculate baseline metrics from the highest load test
    const highestLoadTest = loadTests.reduce((max, test) => 
      (test.virtualUsers?.size || 0) > (max.virtualUsers?.size || 0) ? test : max, 
      { virtualUsers: { size: 0 }, metrics: {} }
    );

    const baselineMetrics = {
      response_time_p50: highestLoadTest.metrics?.avgResponseTime || 0,
      response_time_p95: 0, // Would need to calculate from raw data
      response_time_p99: 0, // Would need to calculate from raw data
      throughput: highestLoadTest.metrics?.currentThroughput || 0,
      error_rate: highestLoadTest.metrics?.errorRate || 0,
      cpu_usage: 0, // From resource data
      memory_usage: 0, // From resource data
      cache_hit_rate: 0 // From cache stats
    };

    // Extract resource metrics if available
    if (resourceData.snapshots && resourceData.snapshots.length > 0) {
      const avgCpu = resourceData.snapshots.reduce((sum: number, snap: any) => sum + snap.system.cpu_usage, 0) / resourceData.snapshots.length;
      const avgMemory = resourceData.snapshots.reduce((sum: number, snap: any) => sum + snap.system.memory_usage, 0) / resourceData.snapshots.length;
      const avgCacheHit = resourceData.snapshots.reduce((sum: number, snap: any) => sum + snap.cache.hit_rate, 0) / resourceData.snapshots.length;
      
      baselineMetrics.cpu_usage = avgCpu;
      baselineMetrics.memory_usage = avgMemory;
      baselineMetrics.cache_hit_rate = avgCacheHit;
    }

    return {
      target_users: targetUsers,
      achieved_users: achievedUsers,
      breaking_point: breakingPoint,
      baseline_metrics: baselineMetrics
    };
  }

  /**
   * Generate resource analysis
   */
  private generateResourceAnalysis(resourceData: any): any {
    if (!resourceData.snapshots || resourceData.snapshots.length === 0) {
      return this.getEmptyResourceAnalysis();
    }

    const snapshots = resourceData.snapshots;

    // CPU analysis
    const cpuValues = snapshots.map((s: any) => s.system.cpu_usage);
    const cpuAnalysis = this.analyzeResourceUtilization(cpuValues, 'CPU');

    // Memory analysis
    const memoryValues = snapshots.map((s: any) => s.system.memory_usage);
    const memoryAnalysis = this.analyzeResourceUtilization(memoryValues, 'Memory');

    // Database analysis
    const dbAnalysis = this.analyzeDatabasePerformance(snapshots);

    // Cache analysis
    const cacheAnalysis = this.analyzeCachePerformance(snapshots);

    // Network analysis
    const networkAnalysis = this.analyzeNetworkPerformance(snapshots);

    return {
      cpu_utilization: cpuAnalysis,
      memory_utilization: memoryAnalysis,
      database_performance: dbAnalysis,
      cache_performance: cacheAnalysis,
      network_performance: networkAnalysis
    };
  }

  /**
   * Analyze resource utilization
   */
  private analyzeResourceUtilization(values: number[], resourceType: string): ResourceUtilizationAnalysis {
    if (values.length === 0) {
      return {
        average: 0,
        peak: 0,
        baseline: 0,
        variance: 0,
        trend: 'stable',
        recommendations: [`No ${resourceType.toLowerCase()} data available for analysis`]
      };
    }

    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const peak = Math.max(...values);
    const baseline = Math.min(...values);
    const variance = this.calculateVariance(values);
    const trend = this.analyzeTrend(values);

    const recommendations = [];
    if (peak > 90) {
      recommendations.push(`${resourceType} usage reached critical levels (${peak.toFixed(1)}%). Consider scaling or optimization.`);
    } else if (average > 70) {
      recommendations.push(`Average ${resourceType.toLowerCase()} usage is high (${average.toFixed(1)}%). Monitor for potential bottlenecks.`);
    } else {
      recommendations.push(`${resourceType} utilization is within acceptable ranges.`);
    }

    if (variance > 20) {
      recommendations.push(`High ${resourceType.toLowerCase()} variance detected. Investigate workload patterns.`);
    }

    return {
      average,
      peak,
      baseline,
      variance,
      trend,
      recommendations
    };
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Analyze trend
   */
  private analyzeTrend(values: number[]): 'stable' | 'increasing' | 'decreasing' | 'volatile' {
    if (values.length < 3) return 'stable';

    const firstThird = values.slice(0, Math.floor(values.length / 3));
    const lastThird = values.slice(-Math.floor(values.length / 3));

    const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;

    const difference = lastAvg - firstAvg;
    const variance = this.calculateVariance(values);

    if (variance > 25) return 'volatile';
    if (difference > 10) return 'increasing';
    if (difference < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Analyze database performance
   */
  private analyzeDatabasePerformance(snapshots: any[]): DatabasePerformanceAnalysis {
    const dbSnapshots = snapshots.filter(s => s.database);
    
    if (dbSnapshots.length === 0) {
      return {
        connection_utilization: 0,
        avg_query_time: 0,
        slow_queries: 0,
        connection_pool_efficiency: 0,
        recommendations: ['No database performance data available']
      };
    }

    const avgUtilization = dbSnapshots.reduce((sum, s) => sum + s.database.connection_pool_utilization, 0) / dbSnapshots.length;
    const avgQueryTime = dbSnapshots.reduce((sum, s) => sum + s.database.avg_query_time, 0) / dbSnapshots.length;
    const slowQueries = dbSnapshots.filter(s => s.database.avg_query_time > 500).length;

    const recommendations = [];
    if (avgUtilization > 80) {
      recommendations.push('High database connection utilization. Consider increasing pool size or optimizing queries.');
    }
    if (avgQueryTime > 200) {
      recommendations.push('Slow average query time detected. Review and optimize database queries.');
    }
    if (slowQueries > dbSnapshots.length * 0.1) {
      recommendations.push('Multiple slow queries detected. Database indexing and query optimization needed.');
    }

    return {
      connection_utilization: avgUtilization,
      avg_query_time: avgQueryTime,
      slow_queries: slowQueries,
      connection_pool_efficiency: 100 - avgUtilization, // Simplified calculation
      recommendations
    };
  }

  /**
   * Analyze cache performance
   */
  private analyzeCachePerformance(snapshots: any[]): CachePerformanceAnalysis {
    const cacheSnapshots = snapshots.filter(s => s.cache);
    
    if (cacheSnapshots.length === 0) {
      return {
        hit_rate: 0,
        miss_rate: 0,
        avg_response_time: 0,
        memory_efficiency: 0,
        recommendations: ['No cache performance data available']
      };
    }

    const avgHitRate = cacheSnapshots.reduce((sum, s) => sum + s.cache.hit_rate, 0) / cacheSnapshots.length;
    const avgResponseTime = cacheSnapshots.reduce((sum, s) => sum + s.cache.response_time, 0) / cacheSnapshots.length;

    const recommendations = [];
    if (avgHitRate < 70) {
      recommendations.push('Low cache hit rate. Review caching strategy and TTL configurations.');
    }
    if (avgResponseTime > 10) {
      recommendations.push('High cache response time. Check Redis performance and network connectivity.');
    }

    return {
      hit_rate: avgHitRate,
      miss_rate: 100 - avgHitRate,
      avg_response_time: avgResponseTime,
      memory_efficiency: 85, // Simplified - would need actual Redis memory stats
      recommendations
    };
  }

  /**
   * Analyze network performance
   */
  private analyzeNetworkPerformance(snapshots: any[]): NetworkPerformanceAnalysis {
    const networkSnapshots = snapshots.filter(s => s.network);
    
    if (networkSnapshots.length === 0) {
      return {
        avg_latency: 0,
        peak_throughput: 0,
        concurrent_connections: 0,
        bandwidth_utilization: 0,
        recommendations: ['No network performance data available']
      };
    }

    const avgLatency = networkSnapshots.reduce((sum, s) => sum + s.network.latency, 0) / networkSnapshots.length;
    const peakThroughput = Math.max(...networkSnapshots.map(s => s.network.throughput));
    const avgConnections = networkSnapshots.reduce((sum, s) => sum + s.network.concurrent_connections, 0) / networkSnapshots.length;

    const recommendations = [];
    if (avgLatency > 100) {
      recommendations.push('High network latency detected. Check network infrastructure and connection quality.');
    }
    if (avgConnections > 1000) {
      recommendations.push('High concurrent connections. Consider connection pooling optimization.');
    }

    return {
      avg_latency: avgLatency,
      peak_throughput: peakThroughput,
      concurrent_connections: avgConnections,
      bandwidth_utilization: 65, // Simplified - would need actual network monitoring
      recommendations
    };
  }

  /**
   * Generate bottleneck analysis
   */
  private generateBottleneckAnalysis(loadTests: any[], resourceData: any): any {
    const bottlenecks: BottleneckInfo[] = [];
    const performanceRecommendations: string[] = [];
    const scalingRecommendations: string[] = [];
    const optimizationPriorities: OptimizationPriority[] = [];

    // Analyze load test results for bottlenecks
    for (const test of loadTests) {
      if (test.breakingPoint) {
        bottlenecks.push({
          component: 'System Capacity',
          severity: 'HIGH',
          description: `Breaking point reached at ${test.breakingPoint.userCount} users`,
          impact: 'System becomes unstable under high load',
          solution: 'Implement horizontal scaling or optimize critical paths',
          estimated_effort: 'HIGH'
        });
      }

      if (test.metrics?.avgResponseTime > 1000) {
        bottlenecks.push({
          component: 'Response Time',
          severity: 'MEDIUM',
          description: `Average response time of ${test.metrics.avgResponseTime}ms exceeds acceptable thresholds`,
          impact: 'Poor user experience and reduced throughput',
          solution: 'Optimize database queries and implement better caching',
          estimated_effort: 'MEDIUM'
        });
      }
    }

    // Add resource-based bottlenecks
    if (resourceData.snapshots && resourceData.snapshots.length > 0) {
      const maxCpu = Math.max(...resourceData.snapshots.map((s: any) => s.system.cpu_usage));
      const maxMemory = Math.max(...resourceData.snapshots.map((s: any) => s.system.memory_usage));

      if (maxCpu > 90) {
        bottlenecks.push({
          component: 'CPU',
          severity: 'HIGH',
          description: `CPU usage reached ${maxCpu.toFixed(1)}%`,
          impact: 'System performance degradation and potential instability',
          solution: 'Optimize CPU-intensive operations or add more CPU cores',
          estimated_effort: 'MEDIUM'
        });
      }

      if (maxMemory > 90) {
        bottlenecks.push({
          component: 'Memory',
          severity: 'HIGH',
          description: `Memory usage reached ${maxMemory.toFixed(1)}%`,
          impact: 'Risk of out-of-memory errors and system crashes',
          solution: 'Optimize memory usage or increase available RAM',
          estimated_effort: 'MEDIUM'
        });
      }
    }

    // Generate recommendations
    performanceRecommendations.push(
      'Implement database query optimization and indexing',
      'Enhance caching strategy with longer TTLs for stable data',
      'Optimize API response serialization and compression'
    );

    scalingRecommendations.push(
      'Consider horizontal scaling with load balancers',
      'Implement database read replicas for better read performance',
      'Use CDN for static assets and API caching'
    );

    // Generate optimization priorities
    optimizationPriorities.push(
      {
        task: 'Database Query Optimization',
        impact: 'HIGH',
        effort: 'MEDIUM',
        priority_score: 85,
        estimated_improvement: '30-50% response time reduction'
      },
      {
        task: 'Cache Strategy Enhancement',
        impact: 'MEDIUM',
        effort: 'LOW',
        priority_score: 75,
        estimated_improvement: '15-25% performance improvement'
      },
      {
        task: 'Horizontal Scaling Implementation',
        impact: 'HIGH',
        effort: 'HIGH',
        priority_score: 70,
        estimated_improvement: '2-3x capacity increase'
      }
    );

    return {
      identified_bottlenecks: bottlenecks,
      performance_recommendations: performanceRecommendations,
      scaling_recommendations: scalingRecommendations,
      optimization_priorities: optimizationPriorities.sort((a, b) => b.priority_score - a.priority_score)
    };
  }

  /**
   * Generate capacity planning
   */
  private generateCapacityPlanning(loadTests: any[], executiveSummary: any): any {
    const currentCapacity = executiveSummary.max_concurrent_users;
    const targetCapacity = 1000; // From requirements
    
    let recommendedCapacity = currentCapacity;
    let scalingStrategy: 'vertical' | 'horizontal' | 'hybrid' = 'vertical';

    // Determine recommended capacity based on performance
    if (executiveSummary.overall_rating === 'EXCELLENT') {
      recommendedCapacity = Math.max(currentCapacity * 1.5, targetCapacity);
      scalingStrategy = 'horizontal';
    } else if (executiveSummary.overall_rating === 'GOOD') {
      recommendedCapacity = Math.max(currentCapacity * 1.2, targetCapacity);
      scalingStrategy = 'hybrid';
    } else {
      recommendedCapacity = currentCapacity;
      scalingStrategy = 'vertical';
    }

    const resourceRequirements: ResourceRequirements = {
      cpu_cores: Math.ceil(recommendedCapacity / 200), // Rough estimate: 200 users per core
      memory_gb: Math.ceil(recommendedCapacity / 100) * 2, // Rough estimate: 2GB per 100 users
      storage_gb: 100 + Math.ceil(recommendedCapacity / 50), // Base + user data
      network_bandwidth: `${Math.ceil(recommendedCapacity / 100)}Gbps`,
      database_connections: Math.ceil(recommendedCapacity / 10), // 10 users per connection
      cache_memory: Math.ceil(recommendedCapacity / 100) * 512 // 512MB per 100 users
    };

    const costAnalysis: CostAnalysis = {
      current_monthly_cost: 500, // Estimated current cost
      projected_monthly_cost: 500 * (recommendedCapacity / currentCapacity),
      cost_per_user: 0.5, // Estimated cost per user per month
      scaling_cost_factor: recommendedCapacity / currentCapacity,
      optimization_savings: 100 // Estimated monthly savings from optimizations
    };

    return {
      current_capacity: currentCapacity,
      recommended_capacity: recommendedCapacity,
      scaling_strategy: scalingStrategy,
      resource_requirements: resourceRequirements,
      cost_analysis: costAnalysis
    };
  }

  /**
   * Generate security analysis
   */
  private generateSecurityAnalysis(isolationTests: TenantIsolationResult[]): any {
    const totalViolations = isolationTests.reduce((sum, test) => sum + test.violations.length, 0);
    const criticalViolations = isolationTests.reduce((sum, test) => 
      sum + test.violations.filter(v => v.severity === 'CRITICAL').length, 0
    );

    let isolationStatus: 'SECURE' | 'VULNERABILITIES_FOUND' | 'CRITICAL_ISSUES';
    if (criticalViolations > 0) {
      isolationStatus = 'CRITICAL_ISSUES';
    } else if (totalViolations > 0) {
      isolationStatus = 'VULNERABILITIES_FOUND';
    } else {
      isolationStatus = 'SECURE';
    }

    const recommendations = [];
    if (criticalViolations > 0) {
      recommendations.push('CRITICAL: Fix tenant isolation violations before production deployment');
    }
    if (totalViolations > 0) {
      recommendations.push('Review and strengthen tenant isolation implementation');
    }
    recommendations.push('Implement continuous security monitoring');
    recommendations.push('Regular security audits and penetration testing');

    return {
      tenant_isolation_status: isolationStatus,
      isolation_violations: totalViolations,
      security_recommendations: recommendations
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(executiveSummary: any, bottleneckAnalysis: any, securityAnalysis: any): any {
    const immediateActions = [];
    const shortTermImprovements = [];
    const longTermOptimizations = [];
    const monitoringSetup = [];

    // Immediate actions based on critical issues
    if (securityAnalysis.tenant_isolation_status === 'CRITICAL_ISSUES') {
      immediateActions.push('Fix critical tenant isolation vulnerabilities');
    }
    if (executiveSummary.overall_rating === 'CRITICAL') {
      immediateActions.push('Do not deploy to production until critical issues are resolved');
    }

    // Short-term improvements
    shortTermImprovements.push(
      'Implement database query optimization',
      'Enhance caching strategy',
      'Set up automated performance monitoring',
      'Implement load balancing for high availability'
    );

    // Long-term optimizations
    longTermOptimizations.push(
      'Plan for horizontal scaling architecture',
      'Implement advanced caching with Redis Cluster',
      'Consider microservices architecture for better scalability',
      'Implement advanced monitoring and alerting systems'
    );

    // Monitoring setup
    monitoringSetup.push(
      'Set up real-time performance dashboards',
      'Configure automated alerts for resource thresholds',
      'Implement application performance monitoring (APM)',
      'Set up log aggregation and analysis tools'
    );

    return {
      immediate_actions: immediateActions,
      short_term_improvements: shortTermImprovements,
      long_term_optimizations: longTermOptimizations,
      monitoring_setup: monitoringSetup
    };
  }

  /**
   * Get empty resource analysis
   */
  private getEmptyResourceAnalysis(): any {
    return {
      cpu_utilization: { average: 0, peak: 0, baseline: 0, variance: 0, trend: 'stable', recommendations: ['No data available'] },
      memory_utilization: { average: 0, peak: 0, baseline: 0, variance: 0, trend: 'stable', recommendations: ['No data available'] },
      database_performance: { connection_utilization: 0, avg_query_time: 0, slow_queries: 0, connection_pool_efficiency: 0, recommendations: ['No data available'] },
      cache_performance: { hit_rate: 0, miss_rate: 0, avg_response_time: 0, memory_efficiency: 0, recommendations: ['No data available'] },
      network_performance: { avg_latency: 0, peak_throughput: 0, concurrent_connections: 0, bandwidth_utilization: 0, recommendations: ['No data available'] }
    };
  }

  /**
   * Export report as formatted string
   */
  exportReport(reportId: string, format: 'json' | 'html' | 'markdown' = 'json'): string | null {
    const report = this.reports.get(reportId);
    if (!report) return null;

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      
      case 'markdown':
        return this.formatAsMarkdown(report);
      
      case 'html':
        return this.formatAsHtml(report);
      
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  /**
   * Format report as markdown
   */
  private formatAsMarkdown(report: LoadTestReport): string {
    return `# Load Test Report - ${report.id}

Generated: ${report.generated_at}

## Executive Summary

- **Overall Rating**: ${report.executive_summary.overall_rating}
- **Readiness Status**: ${report.executive_summary.readiness_status}
- **Max Concurrent Users**: ${report.executive_summary.max_concurrent_users}
- **Average Response Time**: ${report.executive_summary.avg_response_time}ms
- **Success Rate**: ${report.executive_summary.success_rate.toFixed(2)}%
- **Critical Violations**: ${report.executive_summary.critical_violations}

## Performance Baseline

- **Target Users**: ${report.performance_baseline.target_users}
- **Achieved Users**: ${report.performance_baseline.achieved_users}
- **Breaking Point**: ${report.performance_baseline.breaking_point || 'Not reached'}

## Security Analysis

- **Tenant Isolation Status**: ${report.security_analysis.tenant_isolation_status}
- **Isolation Violations**: ${report.security_analysis.isolation_violations}

## Recommendations

### Immediate Actions
${report.recommendations.immediate_actions.map(action => `- ${action}`).join('\n')}

### Short-term Improvements
${report.recommendations.short_term_improvements.map(improvement => `- ${improvement}`).join('\n')}

### Long-term Optimizations
${report.recommendations.long_term_optimizations.map(optimization => `- ${optimization}`).join('\n')}
`;
  }

  /**
   * Format report as HTML
   */
  private formatAsHtml(report: LoadTestReport): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Load Test Report - ${report.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .critical { color: #d32f2f; }
        .good { color: #388e3c; }
        .metric { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>Load Test Report</h1>
    <p><strong>Generated:</strong> ${report.generated_at}</p>
    
    <div class="summary">
        <h2>Executive Summary</h2>
        <div class="metric">
            <strong>Overall Rating:</strong> 
            <span class="${report.executive_summary.overall_rating === 'EXCELLENT' ? 'good' : 'critical'}">
                ${report.executive_summary.overall_rating}
            </span>
        </div>
        <div class="metric">
            <strong>Max Users:</strong> ${report.executive_summary.max_concurrent_users}
        </div>
        <div class="metric">
            <strong>Avg Response:</strong> ${report.executive_summary.avg_response_time}ms
        </div>
        <div class="metric">
            <strong>Success Rate:</strong> ${report.executive_summary.success_rate.toFixed(2)}%
        </div>
    </div>

    <h2>Recommendations</h2>
    <h3>Immediate Actions</h3>
    <ul>
        ${report.recommendations.immediate_actions.map(action => `<li>${action}</li>`).join('')}
    </ul>
</body>
</html>`;
  }

  /**
   * Get all reports
   */
  getAllReports(): LoadTestReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * Get report by ID
   */
  getReport(reportId: string): LoadTestReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Clear all reports
   */
  clearReports(): void {
    this.reports.clear();
    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'load_test_reports_cleared',
      { timestamp: new Date().toISOString() }
    );
  }
}

// Singleton instance
export const loadTestReporter = new LoadTestReporter();