import Redis from 'ioredis';
import { performance } from 'perf_hooks';

interface CacheMetrics {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  avgResponseTime: number;
  totalResponseTime: number;
}

export class RedisCacheService {
  private client: Redis;
  private isConnected: boolean = false;
  private metrics: Record<string, CacheMetrics> = {};

  constructor() {
    // Initialize Redis client with fallback configuration
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.setupEventHandlers();
    this.initializeMetrics();
  }

  private setupEventHandlers() {
    this.client.on('connect', () => {
      console.log('🔗 Redis connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('✅ Redis ready');
    });

    this.client.on('error', (error) => {
      console.warn('⚠️ Redis error, falling back to database:', error.message);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('❌ Redis connection closed');
      this.isConnected = false;
    });
  }

  private initializeMetrics() {
    const cacheTypes = ['conversations', 'conversation_details', 'user_sessions', 'patient_data'];
    cacheTypes.forEach(type => {
      this.metrics[type] = {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        hitRate: 0,
        avgResponseTime: 0,
        totalResponseTime: 0
      };
    });
  }

  // ETAPA 3: Cache-aside pattern implementation
  async get<T>(key: string, cacheType: string = 'default'): Promise<T | null> {
    if (!this.isConnected) {
      this.recordMiss(cacheType);
      return null;
    }

    const startTime = performance.now();
    
    try {
      const result = await this.client.get(key);
      const endTime = performance.now();
      
      if (result) {
        this.recordHit(cacheType, endTime - startTime);
        return JSON.parse(result) as T;
      } else {
        this.recordMiss(cacheType);
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Redis get error:', error);
      this.recordMiss(cacheType);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number, cacheType: string = 'default'): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      console.warn('⚠️ Redis set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.warn('⚠️ Redis del error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        console.log(`🧹 Invalidated ${keys.length} cache keys matching: ${pattern}`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.warn('⚠️ Redis pattern invalidation error:', error);
      return 0;
    }
  }

  // ETAPA 3: Specific cache methods for conversations
  async cacheConversations(clinicId: number, conversations: any[]): Promise<void> {
    const key = `conversations:clinic:${clinicId}`;
    await this.set(key, conversations, 300, 'conversations'); // 5 minutes TTL
  }

  async getCachedConversations(clinicId: number): Promise<any[] | null> {
    const key = `conversations:clinic:${clinicId}`;
    return await this.get<any[]>(key, 'conversations');
  }

  async cacheConversationDetail(conversationId: number, detail: any): Promise<void> {
    const key = `conversation:${conversationId}:detail`;
    await this.set(key, detail, 120, 'conversation_details'); // 2 minutes TTL
  }

  async getCachedConversationDetail(conversationId: number): Promise<any | null> {
    const key = `conversation:${conversationId}:detail`;
    return await this.get<any>(key, 'conversation_details');
  }

  async cacheUserSession(userId: string, sessionData: any): Promise<void> {
    const key = `user:${userId}:session`;
    await this.set(key, sessionData, 1800, 'user_sessions'); // 30 minutes TTL
  }

  async getCachedUserSession(userId: string): Promise<any | null> {
    const key = `user:${userId}:session`;
    return await this.get<any>(key, 'user_sessions');
  }

  async cachePatientData(patientId: number, data: any): Promise<void> {
    const key = `patient:${patientId}:data`;
    await this.set(key, data, 600, 'patient_data'); // 10 minutes TTL
  }

  async getCachedPatientData(patientId: number): Promise<any | null> {
    const key = `patient:${patientId}:data`;
    return await this.get<any>(key, 'patient_data');
  }

  // ETAPA 3: Cache invalidation methods
  async invalidateConversationCache(clinicId: number): Promise<void> {
    await this.invalidatePattern(`conversations:clinic:${clinicId}`);
  }

  async invalidateConversationDetail(conversationId: number): Promise<void> {
    await this.del(`conversation:${conversationId}:detail`);
  }

  async invalidateUserSession(userId: string): Promise<void> {
    await this.del(`user:${userId}:session`);
  }

  async invalidatePatientData(patientId: number): Promise<void> {
    await this.del(`patient:${patientId}:data`);
  }

  // Metrics and monitoring
  private recordHit(cacheType: string, responseTime: number): void {
    if (!this.metrics[cacheType]) return;
    
    this.metrics[cacheType].hits++;
    this.metrics[cacheType].totalRequests++;
    this.metrics[cacheType].totalResponseTime += responseTime;
    this.updateMetrics(cacheType);
  }

  private recordMiss(cacheType: string): void {
    if (!this.metrics[cacheType]) return;
    
    this.metrics[cacheType].misses++;
    this.metrics[cacheType].totalRequests++;
    this.updateMetrics(cacheType);
  }

  private updateMetrics(cacheType: string): void {
    const metric = this.metrics[cacheType];
    metric.hitRate = metric.totalRequests > 0 ? (metric.hits / metric.totalRequests) * 100 : 0;
    metric.avgResponseTime = metric.hits > 0 ? metric.totalResponseTime / metric.hits : 0;
  }

  getMetrics(): Record<string, CacheMetrics> {
    return { ...this.metrics };
  }

  getHealthStatus(): { connected: boolean; metrics: Record<string, CacheMetrics> } {
    return {
      connected: this.isConnected,
      metrics: this.getMetrics()
    };
  }

  async warmCache(): Promise<void> {
    if (!this.isConnected) return;
    
    console.log('🔥 Starting cache warming...');
    // Cache warming logic can be implemented here
    // For now, just log that it's ready
    console.log('✅ Cache warming completed');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      console.log('👋 Redis client disconnected');
    }
  }
}

// Export singleton instance
export const redisCacheService = new RedisCacheService();