import { CacheMiddleware } from '../cache-middleware.js';
import { structuredLogger, LogCategory } from './structured-logger.service.js';
import { tenantContext } from './tenant-context.provider.js';

/**
 * Phase 3: Core Performance Monitoring Service
 * Real-time metrics tracking with minimal overhead
 */

interface PerformanceMetrics {
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
    count: number;
    samples: number[];
  };
  cacheMetrics: {
    hitRate: number;
    avgHitTime: number;
    avgMissTime: number;
    available: boolean;
  };
  systemResources: {
    memoryUsageMB: number;
    cpuUsagePercent: number;
    activeConnections: number;
  };
  tenantMetrics: Map<number, {
    requestCount: number;
    avgResponseTime: number;
    errorRate: number;
    lastActivity: number;
  }>;
  apiEndpoints: Map<string, {
    callCount: number;
    avgResponseTime: number;
    errorCount: number;
    slowestCall: number;
  }>;
  alerts: Array<{
    id: string;
    type: 'performance' | 'security' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: number;
    clinicId?: number;
  }>;
}

export class PerformanceMonitorService {
  private metrics: PerformanceMetrics;
  private readonly maxSamples = 1000;
  private readonly alertThresholds = {
    responseTime: 5000, // 5 seconds
    errorRate: 0.05, // 5%
    cacheHitRate: 0.3, // 30% minimum
    memoryUsage: 1024 // 1GB
  };

  constructor() {
    this.metrics = {
      responseTime: {
        avg: 0,
        p95: 0,
        p99: 0,
        count: 0,
        samples: []
      },
      cacheMetrics: {
        hitRate: 0,
        avgHitTime: 0,
        avgMissTime: 0,
        available: false
      },
      systemResources: {
        memoryUsageMB: 0,
        cpuUsagePercent: 0,
        activeConnections: 0
      },
      tenantMetrics: new Map(),
      apiEndpoints: new Map(),
      alerts: []
    };

    // Start monitoring intervals
    this.startMonitoring();
  }

  /**
   * Record API request performance
   */
  recordRequest(endpoint: string, responseTime: number, clinicId?: number, error?: boolean): void {
    const startTime = Date.now();

    try {
      // Update global response time metrics
      this.updateResponseTimeMetrics(responseTime);

      // Update endpoint-specific metrics
      this.updateEndpointMetrics(endpoint, responseTime, error);

      // Update tenant-specific metrics
      if (clinicId) {
        this.updateTenantMetrics(clinicId, responseTime, error);
      }

      // Check for performance alerts
      this.checkPerformanceAlerts(endpoint, responseTime, clinicId);

      // Log performance data (async to avoid blocking)
      setImmediate(() => {
        structuredLogger.info(
          LogCategory.PERFORMANCE,
          'request_recorded',
          {
            endpoint,
            response_time: responseTime,
            clinic_id: clinicId,
            error: error || false,
            processing_time: Date.now() - startTime
          }
        );
      });

    } catch (monitoringError) {
      // Silent fail for monitoring to avoid impacting main application
      console.warn('Performance monitoring error:', monitoringError);
    }
  }

  /**
   * Update response time metrics with percentile calculations
   */
  private updateResponseTimeMetrics(responseTime: number): void {
    this.metrics.responseTime.samples.push(responseTime);
    this.metrics.responseTime.count++;

    // Keep only recent samples for rolling metrics
    if (this.metrics.responseTime.samples.length > this.maxSamples) {
      this.metrics.responseTime.samples = this.metrics.responseTime.samples.slice(-this.maxSamples);
    }

    // Calculate percentiles
    const sortedSamples = [...this.metrics.responseTime.samples].sort((a, b) => a - b);
    const len = sortedSamples.length;

    this.metrics.responseTime.avg = sortedSamples.reduce((sum, time) => sum + time, 0) / len;
    this.metrics.responseTime.p95 = sortedSamples[Math.floor(len * 0.95)] || 0;
    this.metrics.responseTime.p99 = sortedSamples[Math.floor(len * 0.99)] || 0;
  }

  /**
   * Update endpoint-specific metrics
   */
  private updateEndpointMetrics(endpoint: string, responseTime: number, error?: boolean): void {
    const endpointMetrics = this.metrics.apiEndpoints.get(endpoint) || {
      callCount: 0,
      avgResponseTime: 0,
      errorCount: 0,
      slowestCall: 0
    };

    endpointMetrics.callCount++;
    endpointMetrics.avgResponseTime = 
      (endpointMetrics.avgResponseTime * (endpointMetrics.callCount - 1) + responseTime) / endpointMetrics.callCount;
    
    if (error) {
      endpointMetrics.errorCount++;
    }

    if (responseTime > endpointMetrics.slowestCall) {
      endpointMetrics.slowestCall = responseTime;
    }

    this.metrics.apiEndpoints.set(endpoint, endpointMetrics);
  }

  /**
   * Update tenant-specific metrics
   */
  private updateTenantMetrics(clinicId: number, responseTime: number, error?: boolean): void {
    const tenantMetrics = this.metrics.tenantMetrics.get(clinicId) || {
      requestCount: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastActivity: Date.now()
    };

    const previousCount = tenantMetrics.requestCount;
    tenantMetrics.requestCount++;
    tenantMetrics.avgResponseTime = 
      (tenantMetrics.avgResponseTime * previousCount + responseTime) / tenantMetrics.requestCount;
    
    if (error) {
      tenantMetrics.errorRate = 
        (tenantMetrics.errorRate * previousCount + 1) / tenantMetrics.requestCount;
    } else {
      tenantMetrics.errorRate = 
        (tenantMetrics.errorRate * previousCount) / tenantMetrics.requestCount;
    }

    tenantMetrics.lastActivity = Date.now();
    this.metrics.tenantMetrics.set(clinicId, tenantMetrics);
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(endpoint: string, responseTime: number, clinicId?: number): void {
    // Response time alert
    if (responseTime > this.alertThresholds.responseTime) {
      this.addAlert({
        type: 'performance',
        severity: responseTime > 10000 ? 'critical' : 'high',
        message: `Slow response time: ${responseTime}ms on ${endpoint}`,
        clinicId
      });
    }

    // Tenant error rate alert
    if (clinicId) {
      const tenantMetrics = this.metrics.tenantMetrics.get(clinicId);
      if (tenantMetrics && tenantMetrics.errorRate > this.alertThresholds.errorRate) {
        this.addAlert({
          type: 'error',
          severity: 'medium',
          message: `High error rate: ${(tenantMetrics.errorRate * 100).toFixed(1)}% for clinic ${clinicId}`,
          clinicId
        });
      }
    }
  }

  /**
   * Add alert to the system
   */
  private addAlert(alert: Omit<PerformanceMetrics['alerts'][0], 'id' | 'timestamp'>): void {
    const fullAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...alert
    };

    this.metrics.alerts.unshift(fullAlert);

    // Keep only recent alerts
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts = this.metrics.alerts.slice(0, 100);
    }

    // Log critical alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'performance_alert',
        {
          alert: fullAlert,
          clinic_id: alert.clinicId
        }
      );
    }
  }

  /**
   * Start monitoring system resources
   */
  private startMonitoring(): void {
    // Update system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);

    // Update cache metrics every 10 seconds
    setInterval(() => {
      this.updateCacheMetrics();
    }, 10000);

    // Clean old alerts every 5 minutes
    setInterval(() => {
      this.cleanOldAlerts();
    }, 300000);
  }

  /**
   * Update system resource metrics
   */
  private updateSystemMetrics(): void {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.metrics.systemResources.memoryUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);

      // Check memory alert
      if (this.metrics.systemResources.memoryUsageMB > this.alertThresholds.memoryUsage) {
        this.addAlert({
          type: 'performance',
          severity: 'high',
          message: `High memory usage: ${this.metrics.systemResources.memoryUsageMB}MB`
        });
      }

    } catch (error) {
      console.warn('System metrics update error:', error);
    }
  }

  /**
   * Update cache metrics from cache middleware
   */
  private updateCacheMetrics(): void {
    try {
      const cacheMetrics = CacheMiddleware.getMetrics();
      
      this.metrics.cacheMetrics = {
        hitRate: cacheMetrics.hitRate / 100, // Convert to decimal
        avgHitTime: cacheMetrics.avgResponseTime,
        avgMissTime: cacheMetrics.avgResponseTime,
        available: cacheMetrics.cacheAvailable
      };

      // Check cache performance alert
      if (this.metrics.cacheMetrics.hitRate < this.alertThresholds.cacheHitRate) {
        this.addAlert({
          type: 'performance',
          severity: 'medium',
          message: `Low cache hit rate: ${(this.metrics.cacheMetrics.hitRate * 100).toFixed(1)}%`
        });
      }

    } catch (error) {
      console.warn('Cache metrics update error:', error);
    }
  }

  /**
   * Clean old alerts (older than 24 hours)
   */
  private cleanOldAlerts(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.metrics.alerts = this.metrics.alerts.filter(alert => alert.timestamp > cutoffTime);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      // Deep clone maps for safety
      tenantMetrics: new Map(this.metrics.tenantMetrics),
      apiEndpoints: new Map(this.metrics.apiEndpoints),
      alerts: [...this.metrics.alerts]
    };
  }

  /**
   * Get metrics for specific tenant
   */
  getTenantMetrics(clinicId: number) {
    return this.metrics.tenantMetrics.get(clinicId) || {
      requestCount: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastActivity: 0
    };
  }

  /**
   * Get health status based on current metrics
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    uptime: number;
    timestamp: number;
  } {
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check response time
    if (this.metrics.responseTime.avg > 1000) {
      issues.push(`High average response time: ${this.metrics.responseTime.avg.toFixed(0)}ms`);
      status = 'degraded';
    }

    if (this.metrics.responseTime.p95 > 5000) {
      issues.push(`High P95 response time: ${this.metrics.responseTime.p95.toFixed(0)}ms`);
      status = 'unhealthy';
    }

    // Check cache
    if (!this.metrics.cacheMetrics.available) {
      issues.push('Cache system unavailable');
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    if (this.metrics.cacheMetrics.hitRate < 0.3) {
      issues.push(`Low cache hit rate: ${(this.metrics.cacheMetrics.hitRate * 100).toFixed(1)}%`);
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    // Check memory
    if (this.metrics.systemResources.memoryUsageMB > 1024) {
      issues.push(`High memory usage: ${this.metrics.systemResources.memoryUsageMB}MB`);
      status = 'degraded';
    }

    // Check recent critical alerts
    const recentCriticalAlerts = this.metrics.alerts.filter(
      alert => alert.severity === 'critical' && (Date.now() - alert.timestamp) < 300000 // 5 minutes
    );

    if (recentCriticalAlerts.length > 0) {
      issues.push(`${recentCriticalAlerts.length} critical alerts in last 5 minutes`);
      status = 'unhealthy';
    }

    return {
      status,
      issues,
      uptime: process.uptime(),
      timestamp: Date.now()
    };
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      responseTime: { avg: 0, p95: 0, p99: 0, count: 0, samples: [] },
      cacheMetrics: { hitRate: 0, avgHitTime: 0, avgMissTime: 0, available: false },
      systemResources: { memoryUsageMB: 0, cpuUsagePercent: 0, activeConnections: 0 },
      tenantMetrics: new Map(),
      apiEndpoints: new Map(),
      alerts: []
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitorService();