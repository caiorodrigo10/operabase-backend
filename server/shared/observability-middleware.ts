import { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from './performance-monitor.service.js';
import { structuredLogger, LogCategory } from './structured-logger.service.js';
import { tenantContext } from './tenant-context.provider.js';

/**
 * Phase 3: Core Observability Middleware
 * Automatic performance tracking and audit logging with minimal overhead
 */

interface ObservabilityRequest extends Request {
  startTime?: number;
  requestId?: string;
  clinicId?: number;
}

/**
 * Performance tracking middleware
 */
export function performanceTrackingMiddleware(req: ObservabilityRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  req.startTime = startTime;
  req.requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

  // Extract clinic ID from various sources
  const clinicId = extractClinicId(req);
  if (clinicId) {
    req.clinicId = clinicId;
  }

  // Track response completion
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    // Record performance metrics (async to avoid blocking)
    setImmediate(() => {
      performanceMonitor.recordRequest(
        `${req.method} ${req.route?.path || req.path}`,
        responseTime,
        clinicId,
        isError
      );
    });

    // Log request completion
    if (shouldLogRequest(req, res)) {
      setImmediate(() => {
        logRequestCompletion(req, res, responseTime);
      });
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Audit logging middleware for sensitive operations
 */
export function auditLoggingMiddleware(req: ObservabilityRequest, res: Response, next: NextFunction) {
  if (shouldAuditRequest(req)) {
    setImmediate(() => {
      logAuditEvent(req, res);
    });
  }
  next();
}

/**
 * Extract clinic ID from request
 */
function extractClinicId(req: Request): number | undefined {
  // From URL parameters
  if (req.params.clinicId) return parseInt(req.params.clinicId);
  if (req.params.clinic_id) return parseInt(req.params.clinic_id);
  
  // From query parameters
  if (req.query.clinic_id) return parseInt(req.query.clinic_id as string);
  if (req.query.clinicId) return parseInt(req.query.clinicId as string);
  
  // From request body
  if (req.body?.clinic_id) return parseInt(req.body.clinic_id);
  if (req.body?.clinicId) return parseInt(req.body.clinicId);

  // From tenant context
  const context = tenantContext.getContext();
  return context?.clinicId;
}

/**
 * Determine if request should be logged
 */
function shouldLogRequest(req: Request, res: Response): boolean {
  // Always log errors
  if (res.statusCode >= 400) return true;
  
  // Log slow requests
  const responseTime = Date.now() - (req as any).startTime;
  if (responseTime > 1000) return true;
  
  // Log API endpoints (not static assets)
  if (req.path.startsWith('/api/')) return true;
  
  // Skip health checks and monitoring endpoints
  if (req.path.includes('/health') || req.path.includes('/metrics')) return false;
  
  return false;
}

/**
 * Determine if request should be audited
 */
function shouldAuditRequest(req: Request): boolean {
  const auditPaths = [
    '/api/contacts',
    '/api/appointments', 
    '/api/medical-records',
    '/api/users',
    '/api/clinic'
  ];

  const criticalMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  return auditPaths.some(path => req.path.includes(path)) && 
         criticalMethods.includes(req.method);
}

/**
 * Log request completion
 */
function logRequestCompletion(req: ObservabilityRequest, res: Response, responseTime: number) {
  const context = tenantContext.getContext();
  
  structuredLogger.info(
    LogCategory.API,
    'request_completed',
    {
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      response_time: responseTime,
      user_id: (req as any).user?.id,
      clinic_id: req.clinicId || context?.clinicId,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      request_id: req.requestId
    }
  );
}

/**
 * Log audit events for sensitive operations
 */
function logAuditEvent(req: ObservabilityRequest, res: Response) {
  const context = tenantContext.getContext();
  
  structuredLogger.info(
    LogCategory.AUDIT,
    'data_operation',
    {
      action: `${req.method} ${req.path}`,
      resource: extractResourceType(req.path),
      user_id: (req as any).user?.id,
      clinic_id: req.clinicId || context?.clinicId,
      request_body_size: JSON.stringify(req.body || {}).length,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      request_id: req.requestId
    }
  );
}

/**
 * Extract resource type from path
 */
function extractResourceType(path: string): string {
  if (path.includes('/contacts')) return 'contacts';
  if (path.includes('/appointments')) return 'appointments';
  if (path.includes('/medical-records')) return 'medical_records';
  if (path.includes('/users')) return 'users';
  if (path.includes('/clinic')) return 'clinic';
  return 'unknown';
}

/**
 * Error handling middleware with observability
 */
export function errorLoggingMiddleware(err: any, req: ObservabilityRequest, res: Response, next: NextFunction) {
  const context = tenantContext.getContext();
  
  // Log error details
  structuredLogger.error(
    LogCategory.API,
    'request_error',
    {
      error_message: err.message,
      error_stack: err.stack,
      path: req.path,
      method: req.method,
      user_id: (req as any).user?.id,
      clinic_id: req.clinicId || context?.clinicId,
      request_id: req.requestId,
      ip_address: req.ip
    }
  );

  // Record error in performance monitor
  if (req.startTime) {
    const responseTime = Date.now() - req.startTime;
    setImmediate(() => {
      performanceMonitor.recordRequest(
        `${req.method} ${req.path}`,
        responseTime,
        req.clinicId || context?.clinicId,
        true // error = true
      );
    });
  }

  next(err);
}