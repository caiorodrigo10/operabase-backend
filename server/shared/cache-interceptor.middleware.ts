import { Request, Response, NextFunction } from 'express';
import { cacheService } from './redis-cache.service.js';
import { CacheKeys } from './cache-keys.js';
import { CachePolicies } from './cache-policies.js';
import { tenantContext } from './tenant-context.provider.js';

/**
 * Cache interceptor middleware for automatic caching of GET requests
 * Provides transparent caching layer for TaskMed APIs
 */
export function cacheInterceptorMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalMethod = req.method;
  const originalUrl = req.originalUrl;

  // Only cache GET requests
  if (originalMethod !== 'GET') {
    return next();
  }

  // Skip caching for certain routes
  if (shouldSkipCache(originalUrl)) {
    return next();
  }

  const clinicId = getClinicIdFromContext();
  if (!clinicId) {
    return next();
  }

  const cacheKey = generateCacheKey(originalUrl, clinicId, req.query);
  const domain = extractDomainFromUrl(originalUrl);

  // Try to serve from cache
  cacheService.get(cacheKey, domain)
    .then(cachedData => {
      if (cachedData) {
        // Cache hit - serve from cache
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Cache miss - intercept response to cache result
      const originalJson = res.json.bind(res);
      
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode === 200 && data) {
          // Cache the response asynchronously
          cacheService.set(cacheKey, data, domain)
            .catch(error => console.warn('Cache set error:', error));
        }
        
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
        return originalJson(data);
      };

      next();
    })
    .catch(error => {
      console.warn('Cache interceptor error:', error);
      next();
    });
}

/**
 * Middleware to invalidate cache after write operations
 */
export function cacheInvalidationMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalMethod = req.method;
  const originalUrl = req.originalUrl;

  // Only invalidate for write operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(originalMethod)) {
    return next();
  }

  const clinicId = getClinicIdFromContext();
  if (!clinicId) {
    return next();
  }

  const domain = extractDomainFromUrl(originalUrl);
  const operation = getOperationFromMethod(originalMethod);

  // Execute the original request
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    // Invalidate cache after successful write operations
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (CachePolicies.shouldInvalidate(domain, operation)) {
        cacheService.invalidateDomain(domain, clinicId)
          .catch(error => console.warn('Cache invalidation error:', error));
      }
    }
    
    return originalJson(data);
  };

  next();
}

/**
 * Generate cache key based on URL, clinic, and query parameters
 */
function generateCacheKey(url: string, clinicId: number, query: any): string {
  const path = url.split('?')[0];
  const pathParts = path.split('/').filter(Boolean);
  
  // Extract relevant parts for cache key generation
  if (pathParts.includes('contacts')) {
    const page = parseInt(query.page) || 1;
    if (query.search) {
      return CacheKeys.contacts.search(clinicId, query.search, page);
    } else if (query.status) {
      return CacheKeys.contacts.byStatus(clinicId, query.status, page);
    } else {
      return CacheKeys.contacts.list(clinicId, page);
    }
  }
  
  if (pathParts.includes('appointments')) {
    const page = parseInt(query.page) || 1;
    if (query.date) {
      return CacheKeys.appointments.byDate(clinicId, query.date);
    } else if (query.contact_id) {
      return CacheKeys.appointments.byContact(clinicId, parseInt(query.contact_id));
    } else {
      return CacheKeys.appointments.list(clinicId, page);
    }
  }
  
  if (pathParts.includes('pipeline')) {
    if (pathParts.includes('stages')) {
      return CacheKeys.pipeline.stages(clinicId);
    } else if (pathParts.includes('opportunities')) {
      const stageId = query.stage_id ? parseInt(query.stage_id) : undefined;
      return CacheKeys.pipeline.opportunities(clinicId, stageId);
    }
  }
  
  if (pathParts.includes('analytics')) {
    const type = query.type || 'general';
    const period = query.period || 'month';
    return CacheKeys.analytics.metrics(clinicId, type, period);
  }
  
  if (pathParts.includes('settings')) {
    return CacheKeys.settings.clinic(clinicId);
  }

  // Default cache key for other routes
  const queryString = Object.keys(query).length > 0 ? 
    Object.entries(query).map(([k, v]) => `${k}_${v}`).join('_') : 
    'default';
  
  return `clinic_${clinicId}:${pathParts.join(':')}:${queryString}`;
}

/**
 * Extract domain from URL for cache policy application
 */
function extractDomainFromUrl(url: string): string {
  const path = url.split('?')[0];
  
  if (path.includes('/contacts')) return 'contacts';
  if (path.includes('/appointments')) return 'appointments';
  if (path.includes('/records')) return 'medical_records';
  if (path.includes('/pipeline')) return 'pipeline';
  if (path.includes('/analytics')) return 'analytics';
  if (path.includes('/settings')) return 'settings';
  if (path.includes('/templates')) return 'ai_templates';
  
  return 'default';
}

/**
 * Map HTTP method to cache operation
 */
function getOperationFromMethod(method: string): string {
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'modify';
  }
}

/**
 * Check if URL should skip caching
 */
function shouldSkipCache(url: string): boolean {
  const skipPatterns = [
    '/api/auth/',
    '/api/health',
    '/api/status',
    '/api/cache/',
    '/api/websocket'
  ];
  
  return skipPatterns.some(pattern => url.includes(pattern));
}

/**
 * Get clinic ID from tenant context
 */
function getClinicIdFromContext(): number | undefined {
  try {
    return tenantContext.getClinicId();
  } catch (error) {
    return undefined;
  }
}