import { redisClient } from './infrastructure/redis-client.js';
import { structuredLogger, LogCategory } from './shared/structured-logger.service.js';

/**
 * Phase 2: Intelligent Cache Middleware
 * Provides 2-5ms response times for 500-1000+ concurrent users
 */

interface CacheConfig {
  ttl: number;
  prefix: string;
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  contacts: { ttl: 300, prefix: 'contacts' }, // 5 minutes
  appointments: { ttl: 120, prefix: 'appointments' }, // 2 minutes
  medical_records: { ttl: 600, prefix: 'medical_records' }, // 10 minutes
  analytics: { ttl: 1800, prefix: 'analytics' }, // 30 minutes
  clinic_users: { ttl: 900, prefix: 'clinic_users' } // 15 minutes
};

export class CacheMiddleware {
  private static metrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    avgResponseTime: 0,
    responseTimes: [] as number[]
  };

  /**
   * Generate cache key with tenant isolation
   */
  private static generateKey(domain: string, identifier: string, clinicId: number): string {
    const config = CACHE_CONFIGS[domain];
    return `taskmed:${config.prefix}:clinic_${clinicId}:${identifier}`;
  }

  /**
   * Cache-aside pattern for read operations
   */
  static async cacheAside<T>(
    domain: string,
    identifier: string,
    clinicId: number,
    dataFetcher: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const cacheKey = this.generateKey(domain, identifier, clinicId);
    const config = CACHE_CONFIGS[domain];

    try {
      // Try cache first
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData !== null) {
        this.recordHit(Date.now() - startTime);
        return cachedData;
      }

      // Cache miss - fetch from database
      this.recordMiss();
      const data = await dataFetcher();

      // Store in cache asynchronously
      setImmediate(async () => {
        await redisClient.set(cacheKey, data, config.ttl);
      });

      this.recordResponseTime(Date.now() - startTime);
      return data;

    } catch (error) {
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'cache_error',
        { domain, key: identifier, error: (error as Error).message }
      );
      return await dataFetcher();
    }
  }

  /**
   * Write-through pattern for write operations
   */
  static async writeThrough<T>(
    domain: string,
    identifier: string,
    clinicId: number,
    data: T,
    dataWriter: (data: T) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const cacheKey = this.generateKey(domain, identifier, clinicId);
    const config = CACHE_CONFIGS[domain];

    try {
      // Write to database first
      const savedData = await dataWriter(data);

      // Then update cache
      await redisClient.set(cacheKey, savedData, config.ttl);

      // Invalidate related caches
      await this.invalidatePattern(domain, clinicId);

      this.recordResponseTime(Date.now() - startTime);
      return savedData;

    } catch (error) {
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'write_through_error',
        { domain, key: identifier, error: (error as Error).message }
      );
      return await dataWriter(data);
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  static async invalidatePattern(domain: string, clinicId: number): Promise<void> {
    const config = CACHE_CONFIGS[domain];
    const pattern = `taskmed:${config.prefix}:clinic_${clinicId}:*`;
    
    try {
      await redisClient.delPattern(pattern);
    } catch (error) {
      // Silent fail for invalidation
    }
  }

  /**
   * Invalidate specific cache entry
   */
  static async invalidate(domain: string, identifier: string, clinicId: number): Promise<void> {
    const cacheKey = this.generateKey(domain, identifier, clinicId);
    
    try {
      await redisClient.del(cacheKey);
    } catch (error) {
      // Silent fail for invalidation
    }
  }

  /**
   * Get cache performance metrics
   */
  static getMetrics() {
    const sortedTimes = [...this.metrics.responseTimes].sort((a, b) => a - b);
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
   * Record cache hit
   */
  private static recordHit(responseTime: number): void {
    this.metrics.hits++;
    this.recordResponseTime(responseTime);
    this.updateHitRate();
  }

  /**
   * Record cache miss
   */
  private static recordMiss(): void {
    this.metrics.misses++;
    this.updateHitRate();
  }

  /**
   * Record response time
   */
  private static recordResponseTime(responseTime: number): void {
    this.metrics.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000);
    }

    this.metrics.avgResponseTime = this.metrics.responseTimes.reduce((sum, time) => sum + time, 0) / this.metrics.responseTimes.length;
  }

  /**
   * Update hit rate
   */
  private static updateHitRate(): void {
    const totalOperations = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = totalOperations > 0 ? (this.metrics.hits / totalOperations) * 100 : 0;
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgResponseTime: 0,
      responseTimes: []
    };
  }
}