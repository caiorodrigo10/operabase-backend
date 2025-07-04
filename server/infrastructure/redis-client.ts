import Redis from 'ioredis';

/**
 * Redis client configuration for TaskMed multi-tenant cache
 * Optimized for 1000+ concurrent users
 */
class RedisClient {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      // Check if Redis is available (Replit or external)
      const redisUrl = process.env.REDIS_URL || process.env.REPLIT_DB_URL;
      
      if (!redisUrl) {
        console.log('📦 Redis not configured - cache will fallback to memory');
        return;
      }

      this.client = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Optimizations for performance
        enableOfflineQueue: false,
        db: 0,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('🚀 Redis connected successfully');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        console.warn('⚠️ Redis error (will fallback to direct queries):', error.message);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        console.log('📦 Redis connection closed');
      });

    } catch (error) {
      console.warn('⚠️ Redis initialization failed (cache disabled):', (error as Error).message);
    }
  }

  /**
   * Get data from Redis cache
   */
  async get(key: string): Promise<any> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Set data in Redis cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Redis SET error:', error);
      return false;
    }
  }

  /**
   * Delete data from Redis cache
   */
  async del(key: string | string[]): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.del(Array.isArray(key) ? key : [key]);
      return true;
    } catch (error) {
      console.warn('Redis DEL error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      console.warn('Redis DEL pattern error:', error);
      return false;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.client !== null && this.isConnected;
  }

  /**
   * Get connection status for monitoring
   */
  getStatus() {
    return {
      available: this.isAvailable(),
      connected: this.isConnected,
      client: this.client !== null
    };
  }

  /**
   * Get Redis client for pipeline operations
   */
  getClient(): Redis | null {
    return this.client;
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
}

// Singleton instance
export const redisClient = new RedisClient();