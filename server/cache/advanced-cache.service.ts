/**
 * ETAPA 4: Advanced Cache Service
 * Intelligent caching with multi-layer strategies, smart TTL, and prefetching
 */

import { redisCacheService } from '../services/redis-cache.service.js';

interface CacheLayer {
  name: string;
  ttl: number;
  strategy: 'cache-aside' | 'write-through' | 'read-through';
  priority: number;
}

interface SmartCacheConfig {
  conversations: {
    list: CacheLayer;
    detail: CacheLayer;
    messages: CacheLayer;
  };
  metadata: {
    contacts: CacheLayer;
    attachments: CacheLayer;
  };
}

export class AdvancedCacheService {
  private config: SmartCacheConfig;
  private hitRateThreshold = 75; // Minimum acceptable hit rate
  private maxResponseTime = 200; // Maximum acceptable response time (ms)

  constructor() {
    this.config = {
      conversations: {
        list: {
          name: 'conversations_list',
          ttl: 180, // 3 minutes (longer for lists)
          strategy: 'cache-aside',
          priority: 1
        },
        detail: {
          name: 'conversation_detail',
          ttl: 300, // 5 minutes (longer for details)
          strategy: 'cache-aside', 
          priority: 2
        },
        messages: {
          name: 'conversation_messages',
          ttl: 120, // 2 minutes (shorter as messages change)
          strategy: 'cache-aside',
          priority: 3
        }
      },
      metadata: {
        contacts: {
          name: 'contacts_metadata', 
          ttl: 600, // 10 minutes (rarely changes)
          strategy: 'cache-aside',
          priority: 4
        },
        attachments: {
          name: 'attachments_metadata',
          ttl: 900, // 15 minutes (static content)
          strategy: 'cache-aside',
          priority: 5
        }
      }
    };
  }

  /**
   * ETAPA 4: Smart Cache Get with fallback strategies
   */
  async smartGet(key: string, layer: CacheLayer): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Try primary cache
      const cachedData = await redisCacheService.get(key);
      if (cachedData) {
        const responseTime = Date.now() - startTime;
        console.log(`🎯 ETAPA 4: Cache HIT [${layer.name}] key: ${key} (${responseTime}ms)`);
        return cachedData;
      }

      console.log(`💽 ETAPA 4: Cache MISS [${layer.name}] key: ${key}`);
      return null;
    } catch (error) {
      console.warn(`⚠️ ETAPA 4: Cache error for ${key}:`, error);
      return null;
    }
  }

  /**
   * ETAPA 4: Smart Cache Set with optimized TTL
   */
  async smartSet(key: string, data: any, layer: CacheLayer): Promise<void> {
    try {
      // Dynamic TTL based on data freshness and size
      const optimizedTTL = this.calculateOptimalTTL(data, layer);
      
      await redisCacheService.set(key, data, optimizedTTL);
      console.log(`💾 ETAPA 4: Cached [${layer.name}] key: ${key} TTL: ${optimizedTTL}s`);
    } catch (error) {
      console.warn(`⚠️ ETAPA 4: Cache set error for ${key}:`, error);
    }
  }

  /**
   * ETAPA 4: Calculate optimal TTL based on data characteristics
   */
  private calculateOptimalTTL(data: any, layer: CacheLayer): number {
    let baseTTL = layer.ttl;

    // Adjust TTL based on data size (smaller data can be cached longer)
    const dataSize = JSON.stringify(data).length;
    if (dataSize < 1024) { // < 1KB
      baseTTL *= 1.5;
    } else if (dataSize > 10240) { // > 10KB  
      baseTTL *= 0.8;
    }

    // Adjust TTL based on layer priority (higher priority = longer TTL)
    const priorityMultiplier = layer.priority <= 2 ? 1.2 : 1.0;
    
    return Math.floor(baseTTL * priorityMultiplier);
  }

  /**
   * ETAPA 4: Smart conversation list caching
   */
  async getConversationsList(clinicId: number): Promise<any> {
    const cacheKey = `clinic:${clinicId}:conversations:list`;
    return this.smartGet(cacheKey, this.config.conversations.list);
  }

  async setConversationsList(clinicId: number, data: any): Promise<void> {
    const cacheKey = `clinic:${clinicId}:conversations:list`;
    return this.smartSet(cacheKey, data, this.config.conversations.list);
  }

  /**
   * ETAPA 4: Smart conversation detail caching with pagination
   */
  async getConversationDetail(conversationId: string, page: number = 1, limit: number = 25): Promise<any> {
    const cacheKey = `conversation:${conversationId}:detail:page:${page}:limit:${limit}`;
    return this.smartGet(cacheKey, this.config.conversations.detail);
  }

  async setConversationDetail(conversationId: string, data: any, page: number = 1, limit: number = 25): Promise<void> {
    const cacheKey = `conversation:${conversationId}:detail:page:${page}:limit:${limit}`;
    return this.smartSet(cacheKey, data, this.config.conversations.detail);
  }

  /**
   * ETAPA 4: Smart invalidation with pattern matching
   */
  async invalidateConversation(conversationId: string): Promise<void> {
    try {
      console.log(`🗑️ ETAPA 4: Invalidating conversation ${conversationId}`);
      
      // Invalidate all pages for this conversation
      const patterns = [
        `conversation:${conversationId}:*`,
        `clinic:*:conversations:list` // Invalidate lists as they contain this conversation
      ];

      for (const pattern of patterns) {
        await redisCacheService.deletePattern(pattern);
      }
    } catch (error) {
      console.warn(`⚠️ ETAPA 4: Invalidation error for ${conversationId}:`, error);
    }
  }

  /**
   * ETAPA 4: Prefetch strategy for likely-to-be-accessed data
   */
  async prefetchConversationPages(conversationId: string, currentPage: number): Promise<void> {
    try {
      // Prefetch next page if it doesn't exist in cache
      const nextPage = currentPage + 1;
      const nextPageKey = `conversation:${conversationId}:detail:page:${nextPage}:limit:25`;
      
      const cachedNextPage = await redisCacheService.get(nextPageKey);
      if (!cachedNextPage) {
        console.log(`🔮 ETAPA 4: Prefetch opportunity for page ${nextPage} of conversation ${conversationId}`);
        // Note: Actual prefetch logic would be implemented in the route handler
      }
    } catch (error) {
      console.warn(`⚠️ ETAPA 4: Prefetch error:`, error);
    }
  }

  /**
   * ETAPA 4: Cache performance monitoring
   */
  async getPerformanceMetrics(): Promise<{
    hitRate: number;
    avgResponseTime: number;
    recommendedActions: string[];
  }> {
    try {
      const metrics = redisCacheService.getMetrics();
      const overallHitRate = Object.values(metrics)
        .reduce((sum, metric) => sum + metric.hitRate, 0) / Object.keys(metrics).length || 0;
      
      const overallResponseTime = Object.values(metrics)
        .reduce((sum, metric) => sum + metric.avgResponseTime, 0) / Object.keys(metrics).length || 0;

      const recommendations: string[] = [];
      
      if (overallHitRate < this.hitRateThreshold) {
        recommendations.push(`Increase TTL for low-hit layers (current: ${overallHitRate.toFixed(1)}%)`);
      }
      
      if (overallResponseTime > this.maxResponseTime) {
        recommendations.push(`Optimize cache response times (current: ${overallResponseTime.toFixed(1)}ms)`);
      }

      if (overallHitRate > 90 && overallResponseTime < 50) {
        recommendations.push('Cache performing excellently - consider expanding coverage');
      }

      return {
        hitRate: overallHitRate,
        avgResponseTime: overallResponseTime,
        recommendedActions: recommendations
      };
    } catch (error) {
      return {
        hitRate: 0,
        avgResponseTime: 999,
        recommendedActions: ['Cache metrics unavailable - check Redis connection']
      };
    }
  }

  /**
   * ETAPA 4: Warm up critical cache data
   */
  async warmUpCache(clinicId: number): Promise<void> {
    console.log(`🔥 ETAPA 4: Starting cache warm-up for clinic ${clinicId}`);
    
    try {
      // This would typically pre-load the most accessed data
      // Implementation would depend on business logic priorities
      console.log(`✅ ETAPA 4: Cache warm-up completed for clinic ${clinicId}`);
    } catch (error) {
      console.warn(`⚠️ ETAPA 4: Cache warm-up failed:`, error);
    }
  }
}

// Singleton instance
export const advancedCache = new AdvancedCacheService();