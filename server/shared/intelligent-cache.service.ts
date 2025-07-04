import { redisClient } from '../infrastructure/redis-client.js';
import { structuredLogger, LogCategory } from './structured-logger.service.js';
import { tenantContext } from './tenant-context.provider.js';

/**
 * Cache configuration per domain
 */
export interface CacheConfig {
  ttl: number; // TTL in seconds
  strategy: 'cache-aside' | 'write-through' | 'read-through';
  keyPrefix: string;
  invalidationPatterns: string[];
}

/**
 * Cache domains with specific configurations
 */
export const CACHE_DOMAINS = {
  CONTACTS: {
    ttl: 300, // 5 minutes
    strategy: 'cache-aside' as const,
    keyPrefix: 'contacts',
    invalidationPatterns: ['contacts:*', 'dashboard:*']
  },
  APPOINTMENTS: {
    ttl: 120, // 2 minutes
    strategy: 'write-through' as const,
    keyPrefix: 'appointments',
    invalidationPatterns: ['appointments:*', 'calendar:*', 'dashboard:*']
  },
  MEDICAL_RECORDS: {
    ttl: 600, // 10 minutes
    strategy: 'read-through' as const,
    keyPrefix: 'medical_records',
    invalidationPatterns: ['medical_records:*', 'patient_history:*']
  },
  ANALYTICS: {
    ttl: 1800, // 30 minutes
    strategy: 'cache-aside' as const,
    keyPrefix: 'analytics',
    invalidationPatterns: ['analytics:*', 'reports:*']
  },
  CONVERSATIONS: {
    ttl: 180, // 3 minutes
    strategy: 'cache-aside' as const,
    keyPrefix: 'conversations',
    invalidationPatterns: ['conversations:*', 'messages:*']
  },
  CLINIC_USERS: {
    ttl: 900, // 15 minutes
    strategy: 'cache-aside' as const,
    keyPrefix: 'clinic_users',
    invalidationPatterns: ['clinic_users:*', 'permissions:*']
  }
} as const;

/**
 * Cache metrics for monitoring
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  avgResponseTime: number;
  tenantMetrics: Map<number, {
    hits: number;
    misses: number;
    hitRate: number;
  }>;
}

/**
 * Intelligent Cache Service for Multi-Tenant Healthcare Platform
 * Provides 2-5ms response times with tenant isolation
 */
export class IntelligentCacheService {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    avgResponseTime: 0,
    tenantMetrics: new Map()
  };

  private responseTimes: number[] = [];

  /**
   * Generate tenant-aware cache key with automatic clinic_id isolation
   */
  private generateKey(domain: keyof typeof CACHE_DOMAINS, identifier: string, clinicId?: number): string {
    const context = tenantContext.getContext();
    const actualClinicId = clinicId || context?.clinicId;
    
    if (!actualClinicId) {
      throw new Error('Cache key generation requires clinic_id for multi-tenant isolation');
    }

    const config = CACHE_DOMAINS[domain];
    return `taskmed:${config.keyPrefix}:clinic_${actualClinicId}:${identifier}`;
  }

  /**
   * Cache-aside pattern implementation
   */
  async cacheAside<T>(
    domain: keyof typeof CACHE_DOMAINS,
    identifier: string,
    dataFetcher: () => Promise<T>,
    clinicId?: number
  ): Promise<T> {
    const startTime = Date.now();
    const cacheKey = this.generateKey(domain, identifier, clinicId);
    const config = CACHE_DOMAINS[domain];

    try {
      // Try to get from cache first
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData !== null) {
        this.recordHit(clinicId, Date.now() - startTime);
        
        structuredLogger.debug(
          LogCategory.PERFORMANCE,
          'cache_hit',
          { domain, key: identifier, clinic_id: clinicId, response_time: Date.now() - startTime }
        );
        
        return cachedData;
      }

      // Cache miss - fetch from database
      this.recordMiss(clinicId);
      const data = await dataFetcher();

      // Store in cache asynchronously
      this.setCacheAsync(cacheKey, data, config.ttl);

      const responseTime = Date.now() - startTime;
      this.recordResponseTime(responseTime);

      structuredLogger.debug(
        LogCategory.PERFORMANCE,
        'cache_miss_populated',
        { domain, key: identifier, clinic_id: clinicId, response_time: responseTime }
      );

      return data;

    } catch (error) {
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'cache_error',
        { domain, key: identifier, error: (error as Error).message }
      );
      
      // Fallback to direct database call
      return await dataFetcher();
    }
  }

  /**
   * Write-through pattern implementation
   */
  async writeThrough<T>(
    domain: keyof typeof CACHE_DOMAINS,
    identifier: string,
    data: T,
    dataWriter: (data: T) => Promise<T>,
    clinicId?: number
  ): Promise<T> {
    const startTime = Date.now();
    const cacheKey = this.generateKey(domain, identifier, clinicId);
    const config = CACHE_DOMAINS[domain];

    try {
      // Write to database first
      const savedData = await dataWriter(data);

      // Then update cache
      await redisClient.set(cacheKey, savedData, config.ttl);
      this.metrics.sets++;

      // Invalidate related cache patterns
      await this.invalidatePatterns([...config.invalidationPatterns], clinicId);

      const responseTime = Date.now() - startTime;
      this.recordResponseTime(responseTime);

      structuredLogger.debug(
        LogCategory.PERFORMANCE,
        'write_through_complete',
        { domain, key: identifier, clinic_id: clinicId, response_time: responseTime }
      );

      return savedData;

    } catch (error) {
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'write_through_error',
        { domain, key: identifier, error: (error as Error).message }
      );
      
      // Fallback to direct database write
      return await dataWriter(data);
    }
  }

  /**
   * Read-through pattern implementation
   */
  async readThrough<T>(
    domain: keyof typeof CACHE_DOMAINS,
    identifier: string,
    dataFetcher: () => Promise<T>,
    clinicId?: number
  ): Promise<T> {
    const startTime = Date.now();
    const cacheKey = this.generateKey(domain, identifier, clinicId);
    const config = CACHE_DOMAINS[domain];

    try {
      // Check cache first
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData !== null) {
        this.recordHit(clinicId, Date.now() - startTime);
        return cachedData;
      }

      // Cache miss - fetch and populate synchronously
      this.recordMiss(clinicId);
      const data = await dataFetcher();
      
      // Store in cache synchronously for read-through
      await redisClient.set(cacheKey, data, config.ttl);
      this.metrics.sets++;

      const responseTime = Date.now() - startTime;
      this.recordResponseTime(responseTime);

      structuredLogger.debug(
        LogCategory.PERFORMANCE,
        'read_through_complete',
        { domain, key: identifier, clinic_id: clinicId, response_time: responseTime }
      );

      return data;

    } catch (error) {
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'read_through_error',
        { domain, key: identifier, error: (error as Error).message }
      );
      
      return await dataFetcher();
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(domain: keyof typeof CACHE_DOMAINS, identifier: string, clinicId?: number): Promise<void> {
    const cacheKey = this.generateKey(domain, identifier, clinicId);
    const config = CACHE_DOMAINS[domain];

    try {
      await redisClient.del(cacheKey);
      this.metrics.deletes++;

      // Invalidate related patterns
      await this.invalidatePatterns(config.invalidationPatterns, clinicId);

      structuredLogger.debug(
        LogCategory.PERFORMANCE,
        'cache_invalidated',
        { domain, key: identifier, clinic_id: clinicId }
      );

    } catch (error) {
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'cache_invalidation_error',
        { domain, key: identifier, error: (error as Error).message }
      );
    }
  }

  /**
   * Bulk invalidation for operations affecting multiple records
   */
  async bulkInvalidate(domain: keyof typeof CACHE_DOMAINS, clinicId?: number): Promise<void> {
    const context = tenantContext.getContext();
    const actualClinicId = clinicId || context?.clinicId;
    
    if (!actualClinicId) {
      throw new Error('Bulk invalidation requires clinic_id for tenant isolation');
    }

    const config = CACHE_DOMAINS[domain];
    const pattern = `taskmed:${config.keyPrefix}:clinic_${actualClinicId}:*`;

    try {
      await redisClient.delPattern(pattern);
      this.metrics.deletes++;

      // Invalidate related patterns
      await this.invalidatePatterns(config.invalidationPatterns, actualClinicId);

      structuredLogger.info(
        LogCategory.PERFORMANCE,
        'bulk_cache_invalidated',
        { domain, clinic_id: actualClinicId, pattern }
      );

    } catch (error) {
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'bulk_invalidation_error',
        { domain, pattern, error: (error as Error).message }
      );
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(domain: keyof typeof CACHE_DOMAINS, data: Array<{ key: string, value: any }>, clinicId?: number): Promise<void> {
    const config = CACHE_DOMAINS[domain];
    
    try {
      const pipeline = redisClient.client?.pipeline();
      if (!pipeline) return;

      for (const item of data) {
        const cacheKey = this.generateKey(domain, item.key, clinicId);
        pipeline.setex(cacheKey, config.ttl, JSON.stringify(item.value));
      }

      await pipeline.exec();
      this.metrics.sets += data.length;

      structuredLogger.info(
        LogCategory.PERFORMANCE,
        'cache_warmed',
        { domain, items_count: data.length, clinic_id: clinicId }
      );

    } catch (error) {
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'cache_warming_error',
        { domain, error: (error as Error).message }
      );
    }
  }

  /**
   * Asynchronous cache set to avoid blocking operations
   */
  private async setCacheAsync(key: string, data: any, ttl: number): Promise<void> {
    try {
      // Non-blocking cache set
      setImmediate(async () => {
        await redisClient.set(key, data, ttl);
        this.metrics.sets++;
      });
    } catch (error) {
      // Silent fail for async operations
    }
  }

  /**
   * Invalidate multiple cache patterns for related data
   */
  private async invalidatePatterns(patterns: string[], clinicId?: number): Promise<void> {
    const context = tenantContext.getContext();
    const actualClinicId = clinicId || context?.clinicId;
    
    if (!actualClinicId) return;

    try {
      for (const pattern of patterns) {
        const tenantPattern = `taskmed:${pattern}:clinic_${actualClinicId}:*`;
        await redisClient.delPattern(tenantPattern);
      }
    } catch (error) {
      // Silent fail for pattern invalidation
    }
  }

  /**
   * Record cache hit metrics
   */
  private recordHit(clinicId?: number, responseTime?: number): void {
    this.metrics.hits++;
    
    if (clinicId) {
      const tenantMetrics = this.metrics.tenantMetrics.get(clinicId) || { hits: 0, misses: 0, hitRate: 0 };
      tenantMetrics.hits++;
      tenantMetrics.hitRate = (tenantMetrics.hits / (tenantMetrics.hits + tenantMetrics.misses)) * 100;
      this.metrics.tenantMetrics.set(clinicId, tenantMetrics);
    }

    if (responseTime) {
      this.recordResponseTime(responseTime);
    }

    this.updateGlobalHitRate();
  }

  /**
   * Record cache miss metrics
   */
  private recordMiss(clinicId?: number): void {
    this.metrics.misses++;
    
    if (clinicId) {
      const tenantMetrics = this.metrics.tenantMetrics.get(clinicId) || { hits: 0, misses: 0, hitRate: 0 };
      tenantMetrics.misses++;
      tenantMetrics.hitRate = (tenantMetrics.hits / (tenantMetrics.hits + tenantMetrics.misses)) * 100;
      this.metrics.tenantMetrics.set(clinicId, tenantMetrics);
    }

    this.updateGlobalHitRate();
  }

  /**
   * Record response time for performance monitoring
   */
  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times for rolling average
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    this.metrics.avgResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  /**
   * Update global hit rate
   */
  private updateGlobalHitRate(): void {
    const totalOperations = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = totalOperations > 0 ? (this.metrics.hits / totalOperations) * 100 : 0;
  }

  /**
   * Get comprehensive cache metrics
   */
  getMetrics(): CacheMetrics & { 
    cacheAvailable: boolean;
    responseTimeP95: number;
    responseTimeP99: number;
  } {
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      ...this.metrics,
      cacheAvailable: redisClient.isAvailable(),
      responseTimeP95: sortedTimes[p95Index] || 0,
      responseTimeP99: sortedTimes[p99Index] || 0
    };
  }

  /**
   * Get tenant-specific metrics
   */
  getTenantMetrics(clinicId: number) {
    return this.metrics.tenantMetrics.get(clinicId) || { hits: 0, misses: 0, hitRate: 0 };
  }

  /**
   * Reset metrics (for testing/monitoring)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      avgResponseTime: 0,
      tenantMetrics: new Map()
    };
    this.responseTimes = [];
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    redisAvailable: boolean;
    avgResponseTime: number;
    hitRate: number;
    recommendations: string[];
  }> {
    const metrics = this.getMetrics();
    const recommendations = [];

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!metrics.cacheAvailable) {
      status = 'degraded';
      recommendations.push('Redis cache not available - system running on database only');
    }

    if (metrics.avgResponseTime > 10) {
      status = 'degraded';
      recommendations.push('High cache response times detected');
    }

    if (metrics.hitRate < 50) {
      status = 'degraded';
      recommendations.push('Low cache hit rate - review caching strategy');
    }

    if (metrics.avgResponseTime > 50 || metrics.hitRate < 20) {
      status = 'unhealthy';
      recommendations.push('Critical cache performance issues');
    }

    return {
      status,
      redisAvailable: metrics.cacheAvailable,
      avgResponseTime: metrics.avgResponseTime,
      hitRate: metrics.hitRate,
      recommendations
    };
  }
}

// Singleton instance
export const intelligentCache = new IntelligentCacheService();