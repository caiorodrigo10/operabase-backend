import { tenantContext } from './tenant-context.provider.js';
import { cacheService } from './redis-cache.service.js';

/**
 * Performance monitoring service for TaskMed multi-tenant system
 * Tracks metrics for optimization and scaling decisions
 */
export class PerformanceMonitor {
  private metrics = {
    apiCalls: new Map<string, number>(),
    responseTimes: new Map<string, number[]>(),
    cacheMetrics: {
      hits: 0,
      misses: 0,
      operations: 0
    },
    tenantMetrics: new Map<number, {
      requests: number,
      avgResponseTime: number,
      errors: number
    }>()
  };

  /**
   * Track API call performance
   */
  trackApiCall(route: string, responseTime: number, statusCode: number, clinicId?: number) {
    // Track global metrics
    const currentCount = this.metrics.apiCalls.get(route) || 0;
    this.metrics.apiCalls.set(route, currentCount + 1);

    // Track response times
    const times = this.metrics.responseTimes.get(route) || [];
    times.push(responseTime);
    
    // Keep only last 100 response times per route
    if (times.length > 100) {
      times.shift();
    }
    this.metrics.responseTimes.set(route, times);

    // Track tenant-specific metrics
    if (clinicId) {
      const tenantMetric = this.metrics.tenantMetrics.get(clinicId) || {
        requests: 0,
        avgResponseTime: 0,
        errors: 0
      };

      tenantMetric.requests++;
      
      // Calculate rolling average response time
      tenantMetric.avgResponseTime = (
        (tenantMetric.avgResponseTime * (tenantMetric.requests - 1) + responseTime) / 
        tenantMetric.requests
      );

      if (statusCode >= 400) {
        tenantMetric.errors++;
      }

      this.metrics.tenantMetrics.set(clinicId, tenantMetric);
    }
  }

  /**
   * Get performance metrics summary
   */
  getMetrics() {
    const cacheStats = cacheService.getStats();
    
    return {
      api: {
        totalCalls: Array.from(this.metrics.apiCalls.values()).reduce((a, b) => a + b, 0),
        routeStats: this.getRouteStats(),
        slowestRoutes: this.getSlowestRoutes()
      },
      cache: cacheStats,
      tenants: this.getTenantStats(),
      performance: {
        avgResponseTime: this.getAverageResponseTime(),
        p95ResponseTime: this.getPercentileResponseTime(95),
        p99ResponseTime: this.getPercentileResponseTime(99)
      }
    };
  }

  /**
   * Get metrics for specific clinic
   */
  getClinicMetrics(clinicId: number) {
    const tenantMetric = this.metrics.tenantMetrics.get(clinicId);
    
    if (!tenantMetric) {
      return {
        requests: 0,
        avgResponseTime: 0,
        errors: 0,
        errorRate: 0
      };
    }

    return {
      ...tenantMetric,
      errorRate: tenantMetric.requests > 0 ? 
        (tenantMetric.errors / tenantMetric.requests * 100) : 0
    };
  }

  /**
   * Get route performance statistics
   */
  private getRouteStats() {
    const stats: Array<{
      route: string;
      calls: number;
      avgResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
    }> = [];

    for (const [route, times] of this.metrics.responseTimes.entries()) {
      if (times.length > 0) {
        const calls = this.metrics.apiCalls.get(route) || 0;
        const avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minResponseTime = Math.min(...times);
        const maxResponseTime = Math.max(...times);

        stats.push({
          route,
          calls,
          avgResponseTime,
          minResponseTime,
          maxResponseTime
        });
      }
    }

    return stats.sort((a, b) => b.calls - a.calls);
  }

  /**
   * Get slowest routes
   */
  private getSlowestRoutes() {
    const routeStats = this.getRouteStats();
    return routeStats
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);
  }

  /**
   * Get tenant performance statistics
   */
  private getTenantStats() {
    const stats: Array<{
      clinicId: number;
      requests: number;
      avgResponseTime: number;
      errors: number;
      errorRate: number;
    }> = [];

    for (const [clinicId, metric] of this.metrics.tenantMetrics.entries()) {
      stats.push({
        clinicId,
        ...metric,
        errorRate: metric.requests > 0 ? (metric.errors / metric.requests * 100) : 0
      });
    }

    return stats.sort((a, b) => b.requests - a.requests);
  }

  /**
   * Calculate average response time across all routes
   */
  private getAverageResponseTime(): number {
    let totalTime = 0;
    let totalCalls = 0;

    for (const times of this.metrics.responseTimes.values()) {
      totalTime += times.reduce((a, b) => a + b, 0);
      totalCalls += times.length;
    }

    return totalCalls > 0 ? totalTime / totalCalls : 0;
  }

  /**
   * Calculate percentile response time
   */
  private getPercentileResponseTime(percentile: number): number {
    const allTimes: number[] = [];
    
    for (const times of this.metrics.responseTimes.values()) {
      allTimes.push(...times);
    }

    if (allTimes.length === 0) return 0;

    allTimes.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * allTimes.length) - 1;
    return allTimes[index] || 0;
  }

  /**
   * Check if performance is healthy
   */
  isHealthy(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    const avgResponseTime = this.getAverageResponseTime();
    const p95ResponseTime = this.getPercentileResponseTime(95);
    const cacheStats = cacheService.getStats();

    // Check response time thresholds
    if (avgResponseTime > 100) {
      issues.push(`High average response time: ${avgResponseTime.toFixed(2)}ms`);
    }

    if (p95ResponseTime > 500) {
      issues.push(`High P95 response time: ${p95ResponseTime.toFixed(2)}ms`);
    }

    // Check cache performance
    const hitRate = parseFloat(cacheStats.hitRate.replace('%', ''));
    if (hitRate < 70 && cacheStats.total > 50) {
      issues.push(`Low cache hit rate: ${cacheStats.hitRate}`);
    }

    // Check tenant error rates
    for (const [clinicId, metric] of this.metrics.tenantMetrics.entries()) {
      const errorRate = metric.requests > 0 ? (metric.errors / metric.requests * 100) : 0;
      if (errorRate > 5 && metric.requests > 10) {
        issues.push(`High error rate for clinic ${clinicId}: ${errorRate.toFixed(2)}%`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.apiCalls.clear();
    this.metrics.responseTimes.clear();
    this.metrics.cacheMetrics = {
      hits: 0,
      misses: 0,
      operations: 0
    };
    this.metrics.tenantMetrics.clear();
    cacheService.resetStats();
  }

  /**
   * Get current tenant performance
   */
  getCurrentTenantMetrics() {
    try {
      const clinicId = tenantContext.getClinicId();
      return clinicId ? this.getClinicMetrics(clinicId) : null;
    } catch (error) {
      return null;
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();