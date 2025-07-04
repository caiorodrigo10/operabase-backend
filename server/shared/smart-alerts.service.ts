import { structuredLogger, LogCategory } from './structured-logger.service.js';
import { performanceMonitor } from './performance-monitor.js';
import { cacheService } from './redis-cache.service.js';
import { tenantContext } from './tenant-context.provider.js';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Alert categories for different system areas
 */
export enum AlertCategory {
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  CACHE = 'cache',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  MEDICAL_COMPLIANCE = 'medical_compliance',
  TENANT_ISOLATION = 'tenant_isolation',
  API_HEALTH = 'api_health'
}

/**
 * Alert interface
 */
export interface Alert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  clinic_id?: number;
  user_id?: string;
  metrics: Record<string, any>;
  recommendations: string[];
  auto_resolve?: boolean;
  resolved_at?: string;
  tags: string[];
}

/**
 * Alert configuration interface
 */
interface AlertConfig {
  enabled: boolean;
  threshold?: number;
  frequency_limit?: number; // Max alerts per hour
  auto_resolve_after?: number; // Minutes
}

/**
 * Smart alerts service for proactive monitoring
 */
export class SmartAlertsService {
  private alerts: Map<string, Alert> = new Map();
  private alertFrequency: Map<string, number[]> = new Map();
  private monitoringInterval: NodeJS.Timeout;
  
  private readonly alertConfigs: Record<string, AlertConfig> = {
    // Performance alerts
    high_response_time: { enabled: true, threshold: 500, frequency_limit: 3, auto_resolve_after: 30 },
    low_cache_hit_rate: { enabled: true, threshold: 70, frequency_limit: 2, auto_resolve_after: 60 },
    slow_database_query: { enabled: true, threshold: 1000, frequency_limit: 5, auto_resolve_after: 15 },
    
    // Security alerts
    multiple_auth_failures: { enabled: true, threshold: 5, frequency_limit: 1, auto_resolve_after: 120 },
    cross_tenant_access_attempt: { enabled: true, threshold: 1, frequency_limit: 1 },
    suspicious_data_access: { enabled: true, threshold: 10, frequency_limit: 2, auto_resolve_after: 60 },
    
    // System health alerts
    high_error_rate: { enabled: true, threshold: 5, frequency_limit: 2, auto_resolve_after: 45 },
    cache_unavailable: { enabled: true, threshold: 1, frequency_limit: 1, auto_resolve_after: 30 },
    database_connection_issues: { enabled: true, threshold: 3, frequency_limit: 1, auto_resolve_after: 15 }
  };

  constructor() {
    this.startMonitoring();
    this.setupAutoResolve();
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.checkPerformanceAlerts();
      this.checkCacheAlerts();
      this.checkSecurityAlerts();
      this.cleanupOldAlerts();
    }, 60000); // Check every minute
  }

  /**
   * Stop monitoring service
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  /**
   * Create and process an alert
   */
  private createAlert(
    severity: AlertSeverity,
    category: AlertCategory,
    title: string,
    description: string,
    metrics: Record<string, any> = {},
    recommendations: string[] = [],
    alertKey?: string
  ): void {
    const alertId = alertKey || `${category}_${Date.now()}`;
    
    // Check frequency limits
    if (!this.shouldCreateAlert(alertKey || category)) {
      return;
    }

    const context = tenantContext.getContext();
    
    const alert: Alert = {
      id: alertId,
      timestamp: new Date().toISOString(),
      severity,
      category,
      title,
      description,
      clinic_id: context?.clinicId,
      user_id: context?.userId,
      metrics,
      recommendations,
      auto_resolve: this.alertConfigs[alertKey || '']?.auto_resolve_after !== undefined,
      tags: this.generateAlertTags(category, severity, metrics)
    };

    this.alerts.set(alertId, alert);
    this.recordAlertFrequency(alertKey || category);

    // Log the alert
    structuredLogger.warn(
      LogCategory.SECURITY,
      `alert_${category}`,
      {
        alert_id: alertId,
        severity,
        title,
        description,
        metrics,
        recommendations,
        clinic_id: alert.clinic_id
      }
    );

    // Handle critical alerts immediately
    if (severity === AlertSeverity.CRITICAL) {
      this.handleCriticalAlert(alert);
    }
  }

  /**
   * Check if alert should be created based on frequency limits
   */
  private shouldCreateAlert(alertKey: string): boolean {
    const config = this.alertConfigs[alertKey];
    if (!config?.enabled || !config.frequency_limit) {
      return true;
    }

    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const recentAlerts = this.alertFrequency.get(alertKey) || [];
    
    // Count alerts in the last hour
    const alertsLastHour = recentAlerts.filter(timestamp => timestamp > hourAgo);
    
    return alertsLastHour.length < config.frequency_limit;
  }

  /**
   * Record alert frequency for rate limiting
   */
  private recordAlertFrequency(alertKey: string): void {
    const now = Date.now();
    const alerts = this.alertFrequency.get(alertKey) || [];
    alerts.push(now);
    
    // Keep only last 24 hours
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const filteredAlerts = alerts.filter(timestamp => timestamp > dayAgo);
    
    this.alertFrequency.set(alertKey, filteredAlerts);
  }

  /**
   * Generate relevant tags for alerts
   */
  private generateAlertTags(
    category: AlertCategory,
    severity: AlertSeverity,
    metrics: Record<string, any>
  ): string[] {
    const tags = [category, severity.toLowerCase()];
    
    // Add metric-based tags
    if (metrics.response_time > 1000) tags.push('slow_response');
    if (metrics.error_rate > 10) tags.push('high_errors');
    if (metrics.cache_hit_rate < 50) tags.push('poor_cache');
    
    // Add context tags
    const context = tenantContext.getContext();
    if (context?.clinicId) tags.push(`clinic_${context.clinicId}`);
    if (context?.isProfessional) tags.push('professional_user');
    
    return tags;
  }

  /**
   * Check performance-related alerts
   */
  private async checkPerformanceAlerts(): Promise<void> {
    try {
      const metrics = performanceMonitor.getMetrics();
      const performanceHealth = performanceMonitor.isHealthy();

      // High response time alert
      if (metrics.performance.avgResponseTime > this.alertConfigs.high_response_time.threshold!) {
        this.createAlert(
          AlertSeverity.HIGH,
          AlertCategory.PERFORMANCE,
          'High Average Response Time',
          `System response time is ${metrics.performance.avgResponseTime.toFixed(2)}ms, exceeding threshold of ${this.alertConfigs.high_response_time.threshold}ms`,
          {
            avg_response_time: metrics.performance.avgResponseTime,
            p95_response_time: metrics.performance.p95ResponseTime,
            threshold: this.alertConfigs.high_response_time.threshold
          },
          [
            'Check database query performance',
            'Review cache configuration',
            'Consider scaling resources',
            'Investigate slow API endpoints'
          ],
          'high_response_time'
        );
      }

      // High error rate alert
      const totalRequests = metrics.api.totalCalls;
      if (totalRequests > 0) {
        const errorRate = (metrics.tenants.reduce((sum, tenant) => sum + tenant.errors, 0) / totalRequests) * 100;
        
        if (errorRate > this.alertConfigs.high_error_rate.threshold!) {
          this.createAlert(
            AlertSeverity.HIGH,
            AlertCategory.API_HEALTH,
            'High API Error Rate',
            `API error rate is ${errorRate.toFixed(2)}%, exceeding threshold of ${this.alertConfigs.high_error_rate.threshold}%`,
            {
              error_rate: errorRate,
              total_requests: totalRequests,
              threshold: this.alertConfigs.high_error_rate.threshold
            },
            [
              'Review recent code deployments',
              'Check database connectivity',
              'Investigate failing endpoints',
              'Monitor system resources'
            ],
            'high_error_rate'
          );
        }
      }

    } catch (error) {
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'performance_alert_check_failed',
        { error: (error as Error).message }
      );
    }
  }

  /**
   * Check cache-related alerts
   */
  private async checkCacheAlerts(): Promise<void> {
    try {
      const cacheStats = cacheService.getStats();
      const cacheHealth = await cacheService.healthCheck();

      // Low cache hit rate alert
      const hitRate = parseFloat(cacheStats.hitRate.replace('%', ''));
      if (cacheStats.total > 50 && hitRate < this.alertConfigs.low_cache_hit_rate.threshold!) {
        this.createAlert(
          AlertSeverity.MEDIUM,
          AlertCategory.CACHE,
          'Low Cache Hit Rate',
          `Cache hit rate is ${hitRate}%, below optimal threshold of ${this.alertConfigs.low_cache_hit_rate.threshold}%`,
          {
            hit_rate: hitRate,
            total_operations: cacheStats.total,
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            threshold: this.alertConfigs.low_cache_hit_rate.threshold
          },
          [
            'Review cache key patterns',
            'Adjust TTL configurations',
            'Check cache invalidation logic',
            'Monitor data access patterns'
          ],
          'low_cache_hit_rate'
        );
      }

      // Cache unavailable alert
      if (!cacheHealth.healthy) {
        this.createAlert(
          AlertSeverity.HIGH,
          AlertCategory.CACHE,
          'Cache Service Unavailable',
          `Cache service is not responding: ${cacheHealth.message}`,
          {
            redis_status: cacheStats.redisStatus,
            health_message: cacheHealth.message
          },
          [
            'Check Redis connection',
            'Verify Redis server status',
            'Review network connectivity',
            'Consider failover to backup cache'
          ],
          'cache_unavailable'
        );
      }

    } catch (error) {
      structuredLogger.error(
        LogCategory.CACHE,
        'cache_alert_check_failed',
        { error: (error as Error).message }
      );
    }
  }

  /**
   * Check security-related alerts
   */
  private async checkSecurityAlerts(): Promise<void> {
    try {
      // Get recent security logs
      const context = tenantContext.getContext();
      if (!context?.clinicId) return;

      const securityLogs = await structuredLogger.getLogsByTenant(
        context.clinicId,
        LogCategory.SECURITY,
        100
      );

      const recentLogs = securityLogs.filter(log => {
        const logTime = new Date(log.timestamp);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        return logTime > fifteenMinutesAgo;
      });

      // Multiple authentication failures
      const authFailures = recentLogs.filter(log => 
        log.action.includes('auth') && 
        (log.details.success === false || log.level === 'WARN')
      );

      if (authFailures.length >= this.alertConfigs.multiple_auth_failures.threshold!) {
        this.createAlert(
          AlertSeverity.HIGH,
          AlertCategory.SECURITY,
          'Multiple Authentication Failures',
          `${authFailures.length} authentication failures detected in the last 15 minutes`,
          {
            failure_count: authFailures.length,
            time_window: '15 minutes',
            failed_attempts: authFailures.map(log => ({
              timestamp: log.timestamp,
              user_id: log.user_id,
              ip_address: log.details.ip_address
            }))
          },
          [
            'Review failed login attempts',
            'Check for brute force attacks',
            'Consider temporary IP blocking',
            'Verify user account security'
          ],
          'multiple_auth_failures'
        );
      }

      // Cross-tenant access attempts
      const crossTenantAttempts = recentLogs.filter(log => 
        log.action.includes('cross_tenant') || 
        log.details.security_violation === 'tenant_isolation'
      );

      if (crossTenantAttempts.length > 0) {
        this.createAlert(
          AlertSeverity.CRITICAL,
          AlertCategory.TENANT_ISOLATION,
          'Cross-Tenant Access Attempt Detected',
          `${crossTenantAttempts.length} attempts to access data across tenant boundaries`,
          {
            violation_count: crossTenantAttempts.length,
            attempts: crossTenantAttempts.map(log => ({
              timestamp: log.timestamp,
              user_id: log.user_id,
              attempted_clinic_id: log.details.attempted_clinic_id,
              current_clinic_id: log.clinic_id
            }))
          },
          [
            'Investigate user permissions immediately',
            'Review tenant isolation implementation',
            'Check for compromised accounts',
            'Audit recent system changes'
          ],
          'cross_tenant_access_attempt'
        );
      }

    } catch (error) {
      structuredLogger.error(
        LogCategory.SECURITY,
        'security_alert_check_failed',
        { error: (error as Error).message }
      );
    }
  }

  /**
   * Handle critical alerts with immediate actions
   */
  private handleCriticalAlert(alert: Alert): void {
    console.error(`🚨 CRITICAL ALERT: ${alert.title}`);
    console.error(`Description: ${alert.description}`);
    console.error(`Clinic ID: ${alert.clinic_id}`);
    console.error(`Timestamp: ${alert.timestamp}`);

    // Log critical alert
    structuredLogger.error(
      LogCategory.SECURITY,
      'critical_alert_triggered',
      {
        alert_id: alert.id,
        title: alert.title,
        description: alert.description,
        metrics: alert.metrics,
        clinic_id: alert.clinic_id
      }
    );

    // TODO: Integrate with external alerting systems (email, Slack, etc.)
    // For now, we ensure critical alerts are immediately visible in logs
  }

  /**
   * Setup auto-resolve functionality
   */
  private setupAutoResolve(): void {
    setInterval(() => {
      const now = new Date();
      
      for (const [alertId, alert] of this.alerts.entries()) {
        if (!alert.auto_resolve || alert.resolved_at) continue;
        
        const alertAge = now.getTime() - new Date(alert.timestamp).getTime();
        const autoResolveTime = this.getAutoResolveTime(alert);
        
        if (autoResolveTime && alertAge > autoResolveTime) {
          this.resolveAlert(alertId, 'Auto-resolved after timeout');
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Get auto-resolve time for an alert
   */
  private getAutoResolveTime(alert: Alert): number | null {
    const config = this.alertConfigs[alert.category];
    if (!config?.auto_resolve_after) return null;
    
    return config.auto_resolve_after * 60 * 1000; // Convert minutes to milliseconds
  }

  /**
   * Manually resolve an alert
   */
  resolveAlert(alertId: string, reason: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved_at) return false;
    
    alert.resolved_at = new Date().toISOString();
    
    structuredLogger.info(
      LogCategory.SECURITY,
      'alert_resolved',
      {
        alert_id: alertId,
        title: alert.title,
        resolution_reason: reason,
        duration_minutes: Math.round(
          (new Date(alert.resolved_at).getTime() - new Date(alert.timestamp).getTime()) / 60000
        )
      }
    );
    
    return true;
  }

  /**
   * Get active alerts for current tenant
   */
  getActiveAlerts(limit: number = 50): Alert[] {
    const context = tenantContext.getContext();
    const clinicId = context?.clinicId;
    
    return Array.from(this.alerts.values())
      .filter(alert => 
        !alert.resolved_at && 
        (!clinicId || alert.clinic_id === clinicId)
      )
      .sort((a, b) => {
        // Sort by severity (CRITICAL first) then by timestamp
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, limit);
  }

  /**
   * Get alert summary statistics
   */
  getAlertSummary(): {
    total: number;
    by_severity: Record<AlertSeverity, number>;
    by_category: Record<AlertCategory, number>;
    recent_count: number;
  } {
    const context = tenantContext.getContext();
    const clinicId = context?.clinicId;
    
    const activeAlerts = Array.from(this.alerts.values())
      .filter(alert => 
        !alert.resolved_at && 
        (!clinicId || alert.clinic_id === clinicId)
      );

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const bySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.LOW]: 0,
      [AlertSeverity.MEDIUM]: 0,
      [AlertSeverity.HIGH]: 0,
      [AlertSeverity.CRITICAL]: 0
    };
    
    const byCategory: Record<AlertCategory, number> = {
      [AlertCategory.PERFORMANCE]: 0,
      [AlertCategory.SECURITY]: 0,
      [AlertCategory.CACHE]: 0,
      [AlertCategory.DATABASE]: 0,
      [AlertCategory.AUTHENTICATION]: 0,
      [AlertCategory.MEDICAL_COMPLIANCE]: 0,
      [AlertCategory.TENANT_ISOLATION]: 0,
      [AlertCategory.API_HEALTH]: 0
    };

    let recentCount = 0;
    
    for (const alert of activeAlerts) {
      bySeverity[alert.severity]++;
      byCategory[alert.category]++;
      
      if (new Date(alert.timestamp) > hourAgo) {
        recentCount++;
      }
    }

    return {
      total: activeAlerts.length,
      by_severity: bySeverity,
      by_category: byCategory,
      recent_count: recentCount
    };
  }

  /**
   * Clean up old resolved alerts
   */
  private cleanupOldAlerts(): void {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved_at && new Date(alert.resolved_at) < sevenDaysAgo) {
        this.alerts.delete(alertId);
      }
    }
  }

  /**
   * Manual alert creation for custom scenarios
   */
  createCustomAlert(
    severity: AlertSeverity,
    category: AlertCategory,
    title: string,
    description: string,
    metrics: Record<string, any> = {},
    recommendations: string[] = []
  ): string {
    const alertId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.createAlert(severity, category, title, description, metrics, recommendations, alertId);
    return alertId;
  }
}

// Singleton instance
export const smartAlerts = new SmartAlertsService();

// Graceful shutdown
process.on('SIGTERM', () => {
  smartAlerts.stop();
});

process.on('SIGINT', () => {
  smartAlerts.stop();
});