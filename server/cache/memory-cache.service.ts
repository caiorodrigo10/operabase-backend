/**
 * ETAPA 4: Memory Cache Service - Fallback for Redis Issues
 * High-performance in-memory cache with TTL and auto-cleanup
 */

interface CacheEntry {
  data: any;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  memoryUsage: number;
}

export class MemoryCacheService {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    memoryUsage: 0
  };
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
    
    console.log('💾 ETAPA 4: Memory Cache Service initialized');
  }

  /**
   * Get cached data with TTL validation
   */
  get<T>(key: string): T | null {
    this.stats.totalRequests++;
    
    const entry = this.cache.get(key);
    const now = Date.now();
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Check if expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    this.stats.hits++;
    this.updateHitRate();
    return entry.data as T;
  }

  /**
   * Set cache data with TTL
   */
  set(key: string, data: any, ttlSeconds: number): boolean {
    try {
      const now = Date.now();
      const entry: CacheEntry = {
        data,
        expiresAt: now + (ttlSeconds * 1000),
        createdAt: now
      };
      
      this.cache.set(key, entry);
      this.updateMemoryUsage();
      return true;
    } catch (error) {
      console.warn('⚠️ Memory cache set error:', error);
      return false;
    }
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.updateMemoryUsage();
    return result;
  }

  /**
   * Delete keys by pattern (simple startsWith matching)
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    this.updateMemoryUsage();
    return deleted;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      memoryUsage: 0
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 ETAPA 4: Memory cache cleanup - removed ${cleaned} expired entries`);
      this.updateMemoryUsage();
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? Math.round((this.stats.hits / this.stats.totalRequests) * 100)
      : 0;
  }

  /**
   * Update memory usage estimation
   */
  private updateMemoryUsage(): void {
    // Rough estimation of memory usage
    this.stats.memoryUsage = this.cache.size;
  }

  /**
   * Cleanup on service destruction
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Global singleton instance
export const memoryCacheService = new MemoryCacheService();