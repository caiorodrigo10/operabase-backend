import { Router } from 'express';
import { isAuthenticated, hasClinicAccess } from '../../../auth.js';
import { performanceMonitor } from '../../../shared/performance-monitor.service.js';
import { structuredLogger, LogCategory } from '../../../shared/structured-logger.service.js';
import { CacheMiddleware } from '../../../cache-middleware.js';
import { redisClient } from '../../../infrastructure/redis-client.js';

const router = Router();

/**
 * Phase 3: Core Observability API Endpoints
 * Essential monitoring and metrics with tenant isolation
 */

// Health check endpoint - publicly accessible for load balancers
router.get('/health', async (req, res) => {
  try {
    const healthStatus = performanceMonitor.getHealthStatus();
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 206 : 503;

    res.status(statusCode).json({
      success: true,
      data: {
        status: healthStatus.status,
        timestamp: healthStatus.timestamp,
        uptime: healthStatus.uptime,
        issues: healthStatus.issues,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      timestamp: Date.now()
    });
  }
});

// Performance metrics endpoint - requires authentication
router.get('/metrics', isAuthenticated, async (req: any, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    const cacheMetrics = CacheMiddleware.getMetrics();
    
    // Aggregate tenant-specific data if user has access to specific clinic
    const clinicId = parseInt(req.query.clinic_id as string);
    let tenantMetrics = undefined;
    
    if (clinicId && !isNaN(clinicId)) {
      // Verify user has access to this clinic
      const hasAccess = await req.storage?.userHasClinicAccess(req.user.id, clinicId);
      if (hasAccess) {
        tenantMetrics = performanceMonitor.getTenantMetrics(clinicId);
      }
    }

    res.json({
      success: true,
      data: {
        timestamp: Date.now(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version
        },
        performance: {
          responseTime: metrics.responseTime,
          systemResources: metrics.systemResources,
          alerts: metrics.alerts.slice(0, 10) // Last 10 alerts only
        },
        cache: {
          available: cacheMetrics.cacheAvailable,
          hitRate: cacheMetrics.hitRate,
          avgResponseTime: cacheMetrics.avgResponseTime,
          hits: cacheMetrics.hits,
          misses: cacheMetrics.misses
        },
        tenant: tenantMetrics,
        endpoints: Object.fromEntries(
          Array.from(metrics.apiEndpoints.entries()).slice(0, 10)
        )
      }
    });

    // Log metrics access
    structuredLogger.info(
      LogCategory.AUDIT,
      'metrics_accessed',
      {
        user_id: req.user.id,
        clinic_id: clinicId || null,
        ip_address: req.ip
      }
    );

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics'
    });
  }
});

// Tenant-specific metrics endpoint
router.get('/metrics/clinic/:clinicId', isAuthenticated, hasClinicAccess('clinicId'), async (req: any, res) => {
  try {
    const clinicId = parseInt(req.params.clinicId);
    const tenantMetrics = performanceMonitor.getTenantMetrics(clinicId);
    const globalMetrics = performanceMonitor.getMetrics();

    // Filter endpoints for this clinic
    const clinicEndpoints = new Map();
    const endpointEntries = Array.from(globalMetrics.apiEndpoints.entries());
    for (const [endpoint, data] of endpointEntries) {
      if (endpoint.includes('clinic') || endpoint.includes('contacts') || 
          endpoint.includes('appointments') || endpoint.includes('medical')) {
        clinicEndpoints.set(endpoint, data);
      }
    }

    res.json({
      success: true,
      data: {
        clinicId,
        timestamp: Date.now(),
        metrics: tenantMetrics,
        endpoints: Object.fromEntries(clinicEndpoints),
        alerts: globalMetrics.alerts.filter(alert => alert.clinicId === clinicId).slice(0, 5)
      }
    });

    // Log tenant metrics access
    structuredLogger.info(
      LogCategory.AUDIT,
      'tenant_metrics_accessed',
      {
        user_id: req.user.id,
        clinic_id: clinicId,
        ip_address: req.ip
      }
    );

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tenant metrics'
    });
  }
});

// Logs endpoint with tenant isolation
router.get('/logs', isAuthenticated, async (req: any, res) => {
  try {
    const clinicId = parseInt(req.query.clinic_id as string);
    const level = req.query.level as string;
    const category = req.query.category as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const startTime = req.query.start_time ? new Date(req.query.start_time as string) : undefined;
    const endTime = req.query.end_time ? new Date(req.query.end_time as string) : undefined;

    // Verify clinic access if clinic_id is specified
    if (clinicId && !isNaN(clinicId)) {
      const hasAccess = await req.storage?.userHasClinicAccess(req.user.id, clinicId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to clinic logs'
        });
      }
    }

    // Get logs from structured logger (implementation would depend on storage)
    const logs = await structuredLogger.queryLogs({
      clinicId: clinicId || undefined,
      level,
      category,
      limit,
      startTime,
      endTime,
      userId: req.user.id // Ensure user can only see logs they have access to
    });

    res.json({
      success: true,
      data: {
        logs,
        total: logs.length,
        filters: {
          clinic_id: clinicId || null,
          level: level || null,
          category: category || null,
          limit,
          timeRange: {
            start: startTime?.toISOString() || null,
            end: endTime?.toISOString() || null
          }
        }
      }
    });

    // Log access to logs (meta!)
    structuredLogger.info(
      LogCategory.AUDIT,
      'logs_accessed',
      {
        user_id: req.user.id,
        clinic_id: clinicId || null,
        filters: { level, category, limit },
        ip_address: req.ip
      }
    );

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs'
    });
  }
});

// Alerts endpoint
router.get('/alerts', isAuthenticated, async (req: any, res) => {
  try {
    const clinicId = parseInt(req.query.clinic_id as string);
    const severity = req.query.severity as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const metrics = performanceMonitor.getMetrics();
    let alerts = metrics.alerts;

    // Filter by clinic if specified and user has access
    if (clinicId && !isNaN(clinicId)) {
      const hasAccess = await req.storage?.userHasClinicAccess(req.user.id, clinicId);
      if (hasAccess) {
        alerts = alerts.filter(alert => alert.clinicId === clinicId);
      } else {
        return res.status(403).json({
          success: false,
          error: 'Access denied to clinic alerts'
        });
      }
    }

    // Filter by severity
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Apply limit
    alerts = alerts.slice(0, limit);

    res.json({
      success: true,
      data: {
        alerts,
        total: alerts.length,
        summary: {
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts'
    });
  }
});

// Cache management endpoint
router.get('/cache/status', isAuthenticated, async (req: any, res) => {
  try {
    const cacheMetrics = CacheMiddleware.getMetrics();
    const redisStatus = redisClient.getStatus();

    res.json({
      success: true,
      data: {
        available: cacheMetrics.cacheAvailable,
        metrics: {
          hitRate: cacheMetrics.hitRate,
          avgResponseTime: cacheMetrics.avgResponseTime,
          hits: cacheMetrics.hits,
          misses: cacheMetrics.misses,
          p95ResponseTime: cacheMetrics.responseTimeP95,
          p99ResponseTime: cacheMetrics.responseTimeP99
        },
        redis: redisStatus,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache status'
    });
  }
});

// System status endpoint for comprehensive overview
router.get('/status', isAuthenticated, async (req: any, res) => {
  try {
    const healthStatus = performanceMonitor.getHealthStatus();
    const metrics = performanceMonitor.getMetrics();
    const cacheMetrics = CacheMiddleware.getMetrics();

    const systemStatus = {
      overall: healthStatus.status,
      timestamp: Date.now(),
      uptime: process.uptime(),
      components: {
        database: {
          status: 'healthy', // Would check actual DB connection
          responseTime: metrics.responseTime.avg
        },
        cache: {
          status: cacheMetrics.cacheAvailable ? 'healthy' : 'degraded',
          hitRate: cacheMetrics.hitRate,
          responseTime: cacheMetrics.avgResponseTime
        },
        api: {
          status: metrics.responseTime.avg < 1000 ? 'healthy' : 'degraded',
          avgResponseTime: metrics.responseTime.avg,
          requestCount: metrics.responseTime.count
        }
      },
      alerts: {
        active: metrics.alerts.length,
        critical: metrics.alerts.filter(a => a.severity === 'critical').length
      }
    };

    res.json({
      success: true,
      data: systemStatus
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system status'
    });
  }
});

export { router as observabilityRoutes };