import { structuredLogger, LogCategory } from '../shared/structured-logger.service.js';
import { performanceMonitor } from '../shared/performance-monitor.js';
import { cacheService } from '../shared/redis-cache.service.js';
import { pool } from '../db.js';
import * as os from 'os';
import { EventEmitter } from 'events';

/**
 * Resource monitoring interface for load testing
 */
export interface ResourceSnapshot {
  timestamp: string;
  system: {
    cpu_usage: number;
    memory_usage: number;
    free_memory: number;
    load_average: number[];
    uptime: number;
  };
  database: {
    active_connections: number;
    idle_connections: number;
    total_connections: number;
    connection_pool_utilization: number;
    query_count: number;
    avg_query_time: number;
  };
  cache: {
    hit_rate: number;
    total_operations: number;
    memory_usage: number;
    connected: boolean;
    response_time: number;
  };
  application: {
    request_rate: number;
    active_requests: number;
    error_rate: number;
    avg_response_time: number;
    p95_response_time: number;
    p99_response_time: number;
  };
  network: {
    concurrent_connections: number;
    throughput: number;
    latency: number;
  };
}

/**
 * Resource thresholds for alerting
 */
export interface ResourceThresholds {
  cpu_critical: number;
  memory_critical: number;
  db_connections_warning: number;
  db_connections_critical: number;
  cache_hit_rate_warning: number;
  response_time_warning: number;
  response_time_critical: number;
  error_rate_warning: number;
  error_rate_critical: number;
}

/**
 * Resource monitoring service for load testing validation
 */
export class ResourceMonitorService extends EventEmitter {
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private snapshots: ResourceSnapshot[] = [];
  private readonly maxSnapshots = 1000; // Keep last 1000 snapshots
  private startTime: number = 0;
  private requestCounter = 0;
  private activeRequests = 0;
  private errorCounter = 0;
  private responseTimes: number[] = [];
  
  private readonly thresholds: ResourceThresholds = {
    cpu_critical: 85,
    memory_critical: 90,
    db_connections_warning: 70,
    db_connections_critical: 85,
    cache_hit_rate_warning: 80,
    response_time_warning: 500,
    response_time_critical: 1000,
    error_rate_warning: 2,
    error_rate_critical: 5
  };

  constructor() {
    super();
    this.resetCounters();
  }

  /**
   * Start resource monitoring
   */
  startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) {
      structuredLogger.warn(LogCategory.PERFORMANCE, 'Resource monitoring already running');
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();
    this.resetCounters();

    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'resource_monitoring_started',
      { interval_ms: intervalMs }
    );

    this.monitoringInterval = setInterval(async () => {
      try {
        const snapshot = await this.takeSnapshot();
        this.addSnapshot(snapshot);
        this.checkThresholds(snapshot);
        this.emit('snapshot', snapshot);
      } catch (error) {
        structuredLogger.error(
          LogCategory.PERFORMANCE,
          'resource_monitoring_error',
          { error: (error as Error).message }
        );
      }
    }, intervalMs);
  }

  /**
   * Stop resource monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'resource_monitoring_stopped',
      { 
        total_snapshots: this.snapshots.length,
        duration_ms: Date.now() - this.startTime
      }
    );
  }

  /**
   * Take a resource snapshot
   */
  async takeSnapshot(): Promise<ResourceSnapshot> {
    const now = new Date().toISOString();
    
    // System metrics
    const cpuUsage = this.getCpuUsage();
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem()
    };

    // Database metrics
    const dbMetrics = await this.getDatabaseMetrics();
    
    // Cache metrics
    const cacheMetrics = await this.getCacheMetrics();
    
    // Application metrics
    const appMetrics = this.getApplicationMetrics();
    
    // Network metrics
    const networkMetrics = this.getNetworkMetrics();

    return {
      timestamp: now,
      system: {
        cpu_usage: cpuUsage,
        memory_usage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        free_memory: systemMemory.free,
        load_average: os.loadavg(),
        uptime: os.uptime()
      },
      database: dbMetrics,
      cache: cacheMetrics,
      application: appMetrics,
      network: networkMetrics
    };
  }

  /**
   * Track request metrics
   */
  trackRequest(): void {
    this.requestCounter++;
    this.activeRequests++;
  }

  /**
   * Track request completion
   */
  trackRequestComplete(responseTime: number, isError: boolean = false): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.responseTimes.push(responseTime);
    
    if (isError) {
      this.errorCounter++;
    }

    // Keep only last 1000 response times for memory efficiency
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): ResourceSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Get snapshot history
   */
  getSnapshotHistory(count: number = 100): ResourceSnapshot[] {
    return this.snapshots.slice(-count);
  }

  /**
   * Get monitoring summary
   */
  getMonitoringSummary(): any {
    if (this.snapshots.length === 0) {
      return { error: 'No snapshots available' };
    }

    const latest = this.snapshots[this.snapshots.length - 1];
    const duration = Date.now() - this.startTime;
    
    return {
      monitoring_active: this.isMonitoring,
      duration_ms: duration,
      total_snapshots: this.snapshots.length,
      current_metrics: latest,
      performance_summary: {
        total_requests: this.requestCounter,
        active_requests: this.activeRequests,
        error_count: this.errorCounter,
        error_rate: this.requestCounter > 0 ? (this.errorCounter / this.requestCounter) * 100 : 0,
        avg_response_time: this.responseTimes.length > 0 ? 
          this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length : 0
      },
      threshold_violations: this.getThresholdViolations(latest)
    };
  }

  /**
   * Reset counters
   */
  private resetCounters(): void {
    this.requestCounter = 0;
    this.activeRequests = 0;
    this.errorCounter = 0;
    this.responseTimes = [];
  }

  /**
   * Add snapshot to history
   */
  private addSnapshot(snapshot: ResourceSnapshot): void {
    this.snapshots.push(snapshot);
    
    // Keep only the last maxSnapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
  }

  /**
   * Get CPU usage percentage
   */
  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - (100 * totalIdle / totalTick);
  }

  /**
   * Get database metrics
   */
  private async getDatabaseMetrics(): Promise<ResourceSnapshot['database']> {
    try {
      // Get connection pool status
      const poolStatus = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      };

      const activeConnections = poolStatus.totalCount - poolStatus.idleCount;
      const utilizationPercent = (poolStatus.totalCount / 100) * 100; // Assuming max 100 connections

      // Get basic query metrics from performance monitor
      const perfMetrics = performanceMonitor.getMetrics();
      
      return {
        active_connections: activeConnections,
        idle_connections: poolStatus.idleCount,
        total_connections: poolStatus.totalCount,
        connection_pool_utilization: utilizationPercent,
        query_count: perfMetrics.api.totalCalls,
        avg_query_time: perfMetrics.performance.avgResponseTime
      };
    } catch (error) {
      structuredLogger.error(
        LogCategory.DATABASE,
        'db_metrics_error',
        { error: (error as Error).message }
      );
      
      return {
        active_connections: 0,
        idle_connections: 0,
        total_connections: 0,
        connection_pool_utilization: 0,
        query_count: 0,
        avg_query_time: 0
      };
    }
  }

  /**
   * Get cache metrics
   */
  private async getCacheMetrics(): Promise<ResourceSnapshot['cache']> {
    try {
      const cacheStats = cacheService.getStats();
      const cacheHealth = await cacheService.healthCheck();
      
      // Measure cache response time
      const start = Date.now();
      await cacheService.get('health_check_key');
      const responseTime = Date.now() - start;

      return {
        hit_rate: parseFloat(cacheStats.hitRate.replace('%', '')),
        total_operations: cacheStats.total,
        memory_usage: 0, // Redis memory usage would need additional queries
        connected: cacheHealth.healthy,
        response_time: responseTime
      };
    } catch (error) {
      return {
        hit_rate: 0,
        total_operations: 0,
        memory_usage: 0,
        connected: false,
        response_time: 0
      };
    }
  }

  /**
   * Get application metrics
   */
  private getApplicationMetrics(): ResourceSnapshot['application'] {
    const duration = Date.now() - this.startTime;
    const requestRate = duration > 0 ? (this.requestCounter / duration) * 1000 : 0; // requests per second
    const errorRate = this.requestCounter > 0 ? (this.errorCounter / this.requestCounter) * 100 : 0;

    // Calculate percentiles
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      request_rate: requestRate,
      active_requests: this.activeRequests,
      error_rate: errorRate,
      avg_response_time: sortedTimes.length > 0 ? 
        sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length : 0,
      p95_response_time: sortedTimes.length > p95Index ? sortedTimes[p95Index] : 0,
      p99_response_time: sortedTimes.length > p99Index ? sortedTimes[p99Index] : 0
    };
  }

  /**
   * Get network metrics
   */
  private getNetworkMetrics(): ResourceSnapshot['network'] {
    // Basic network metrics - in production, you'd use more sophisticated monitoring
    return {
      concurrent_connections: this.activeRequests,
      throughput: this.requestCounter > 0 ? this.requestCounter / ((Date.now() - this.startTime) / 1000) : 0,
      latency: this.responseTimes.length > 0 ? 
        this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length : 0
    };
  }

  /**
   * Check resource thresholds and emit alerts
   */
  private checkThresholds(snapshot: ResourceSnapshot): void {
    const violations = this.getThresholdViolations(snapshot);
    
    if (violations.length > 0) {
      this.emit('threshold_violation', {
        snapshot,
        violations
      });

      structuredLogger.warn(
        LogCategory.PERFORMANCE,
        'resource_threshold_violation',
        {
          violations: violations.map(v => ({ metric: v.metric, current: v.current, threshold: v.threshold })),
          timestamp: snapshot.timestamp
        }
      );
    }
  }

  /**
   * Get current threshold violations
   */
  private getThresholdViolations(snapshot: ResourceSnapshot): Array<{
    metric: string;
    current: number;
    threshold: number;
    severity: 'warning' | 'critical';
  }> {
    const violations = [];

    // CPU violations
    if (snapshot.system.cpu_usage > this.thresholds.cpu_critical) {
      violations.push({
        metric: 'cpu_usage',
        current: snapshot.system.cpu_usage,
        threshold: this.thresholds.cpu_critical,
        severity: 'critical' as const
      });
    }

    // Memory violations
    if (snapshot.system.memory_usage > this.thresholds.memory_critical) {
      violations.push({
        metric: 'memory_usage',
        current: snapshot.system.memory_usage,
        threshold: this.thresholds.memory_critical,
        severity: 'critical' as const
      });
    }

    // Database connection violations
    if (snapshot.database.connection_pool_utilization > this.thresholds.db_connections_critical) {
      violations.push({
        metric: 'db_connections',
        current: snapshot.database.connection_pool_utilization,
        threshold: this.thresholds.db_connections_critical,
        severity: 'critical' as const
      });
    } else if (snapshot.database.connection_pool_utilization > this.thresholds.db_connections_warning) {
      violations.push({
        metric: 'db_connections',
        current: snapshot.database.connection_pool_utilization,
        threshold: this.thresholds.db_connections_warning,
        severity: 'warning' as const
      });
    }

    // Cache hit rate violations
    if (snapshot.cache.hit_rate < this.thresholds.cache_hit_rate_warning) {
      violations.push({
        metric: 'cache_hit_rate',
        current: snapshot.cache.hit_rate,
        threshold: this.thresholds.cache_hit_rate_warning,
        severity: 'warning' as const
      });
    }

    // Response time violations
    if (snapshot.application.p95_response_time > this.thresholds.response_time_critical) {
      violations.push({
        metric: 'response_time',
        current: snapshot.application.p95_response_time,
        threshold: this.thresholds.response_time_critical,
        severity: 'critical' as const
      });
    } else if (snapshot.application.p95_response_time > this.thresholds.response_time_warning) {
      violations.push({
        metric: 'response_time',
        current: snapshot.application.p95_response_time,
        threshold: this.thresholds.response_time_warning,
        severity: 'warning' as const
      });
    }

    // Error rate violations
    if (snapshot.application.error_rate > this.thresholds.error_rate_critical) {
      violations.push({
        metric: 'error_rate',
        current: snapshot.application.error_rate,
        threshold: this.thresholds.error_rate_critical,
        severity: 'critical' as const
      });
    } else if (snapshot.application.error_rate > this.thresholds.error_rate_warning) {
      violations.push({
        metric: 'error_rate',
        current: snapshot.application.error_rate,
        threshold: this.thresholds.error_rate_warning,
        severity: 'warning' as const
      });
    }

    return violations;
  }

  /**
   * Export monitoring data for reporting
   */
  exportData(): {
    metadata: any;
    snapshots: ResourceSnapshot[];
    summary: any;
  } {
    return {
      metadata: {
        start_time: new Date(this.startTime).toISOString(),
        end_time: new Date().toISOString(),
        duration_ms: Date.now() - this.startTime,
        total_snapshots: this.snapshots.length,
        monitoring_active: this.isMonitoring
      },
      snapshots: this.snapshots,
      summary: this.getMonitoringSummary()
    };
  }
}

// Singleton instance
export const resourceMonitor = new ResourceMonitorService();