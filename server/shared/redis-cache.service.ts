import { redisClient } from '../infrastructure/redis-client.js';
import { tenantContext } from './tenant-context.provider.js';
import { CacheKeys } from './cache-keys.js';
import { CachePolicies } from './cache-policies.js';

/**
 * Redis cache service with tenant isolation
 * Provides transparent caching layer for TaskMed multi-tenant system
 */
export class RedisCacheService {
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  /**
   * Get data from cache with tenant isolation
   */
  async get<T>(key: string, domain: string = 'default'): Promise<T | null> {
    if (!CachePolicies.isEnabled(domain) || !redisClient.isAvailable()) {
      this.stats.misses++;
      return null;
    }

    try {
      // Ensure tenant context for key validation
      const clinicId = this.getClinicId();
      if (clinicId && !CacheKeys.belongsToClinic(key, clinicId)) {
        console.warn('Cache key does not belong to current tenant:', key);
        return null;
      }

      const data = await redisClient.get(key);
      
      if (data !== null) {
        this.stats.hits++;
        return data as T;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.warn('Cache GET error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set data in cache with tenant isolation and TTL
   */
  async set(key: string, value: any, domain: string = 'default'): Promise<boolean> {
    if (!CachePolicies.isEnabled(domain) || !redisClient.isAvailable()) {
      return false;
    }

    try {
      // Ensure tenant context for key validation
      const clinicId = this.getClinicId();
      if (clinicId && !CacheKeys.belongsToClinic(key, clinicId)) {
        console.warn('Cannot cache data - key does not belong to current tenant:', key);
        return false;
      }

      const ttl = CachePolicies.getTTL(domain);
      const success = await redisClient.set(key, value, ttl);
      
      if (success) {
        this.stats.sets++;
      }
      
      return success;
    } catch (error) {
      console.warn('Cache SET error:', error);
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  async del(key: string | string[]): Promise<boolean> {
    if (!redisClient.isAvailable()) {
      return false;
    }

    try {
      const success = await redisClient.del(key);
      if (success) {
        this.stats.deletes++;
      }
      return success;
    } catch (error) {
      console.warn('Cache DELETE error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache by pattern (tenant-aware)
   */
  async invalidatePattern(pattern: string): Promise<boolean> {
    if (!redisClient.isAvailable()) {
      return false;
    }

    try {
      // Ensure pattern is tenant-specific for security
      const clinicId = this.getClinicId();
      if (clinicId && !pattern.startsWith(`clinic_${clinicId}:`)) {
        console.warn('Cannot invalidate pattern - not tenant-specific:', pattern);
        return false;
      }

      const success = await redisClient.delPattern(pattern);
      if (success) {
        this.stats.deletes++;
      }
      return success;
    } catch (error) {
      console.warn('Cache INVALIDATE PATTERN error:', error);
      return false;
    }
  }

  /**
   * Invalidate all cache for current clinic
   */
  async invalidateClinic(clinicId?: number): Promise<boolean> {
    const targetClinicId = clinicId || this.getClinicId();
    if (!targetClinicId) {
      return false;
    }

    const pattern = CacheKeys.getClinicPattern(targetClinicId);
    return this.invalidatePattern(pattern);
  }

  /**
   * Invalidate cache for specific domain
   */
  async invalidateDomain(domain: string, clinicId?: number): Promise<boolean> {
    const targetClinicId = clinicId || this.getClinicId();
    if (!targetClinicId) {
      return false;
    }

    const patterns = CacheKeys.getPatterns(targetClinicId);
    const pattern = patterns[domain as keyof typeof patterns];
    
    if (!pattern) {
      console.warn('Unknown domain for cache invalidation:', domain);
      return false;
    }

    return this.invalidatePattern(pattern);
  }

  /**
   * Cache-aside pattern implementation
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    domain: string = 'default'
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, domain);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source and cache
    try {
      const data = await fetchFunction();
      await this.set(key, data, domain);
      return data;
    } catch (error) {
      console.error('Cache getOrSet fetch error:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : '0.00';
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      total,
      redisStatus: redisClient.getStatus()
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Helper to get current clinic ID from tenant context
   */
  private getClinicId(): number | undefined {
    try {
      return tenantContext.getClinicId();
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    if (!redisClient.isAvailable()) {
      return {
        healthy: false,
        message: 'Redis not available - operating in fallback mode'
      };
    }

    try {
      const testKey = 'health:check';
      const testValue = Date.now();
      
      await redisClient.set(testKey, testValue, 10);
      const retrieved = await redisClient.get(testKey);
      await redisClient.del(testKey);
      
      if (retrieved === testValue) {
        return {
          healthy: true,
          message: 'Cache system operational'
        };
      } else {
        return {
          healthy: false,
          message: 'Cache read/write verification failed'
        };
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Cache health check failed: ${(error as Error).message}`
      };
    }
  }
}

// Singleton instance
export const cacheService = new RedisCacheService();