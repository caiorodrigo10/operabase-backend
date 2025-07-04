/**
 * Cache policies configuration for multi-tenant TaskMed system
 * Defines TTL, invalidation strategies, and cache behavior per domain
 */

export interface CachePolicy {
  ttl: number; // Time to live in seconds
  invalidateOn: string[]; // Operations that invalidate cache
  strategy: 'write-through' | 'write-behind' | 'read-through' | 'cache-aside';
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
}

export class CachePolicies {
  /**
   * Contacts domain cache policy
   * High frequency reads, moderate writes
   */
  static readonly CONTACTS: CachePolicy = {
    ttl: 300, // 5 minutes
    invalidateOn: ['create', 'update', 'delete', 'status_change'],
    strategy: 'cache-aside',
    priority: 'high',
    enabled: true
  };

  /**
   * Appointments domain cache policy
   * Real-time data, frequent updates
   */
  static readonly APPOINTMENTS: CachePolicy = {
    ttl: 120, // 2 minutes
    invalidateOn: ['create', 'update', 'delete', 'reschedule'],
    strategy: 'write-through',
    priority: 'high',
    enabled: true
  };

  /**
   * Medical records cache policy
   * Low frequency reads, critical data
   */
  static readonly MEDICAL_RECORDS: CachePolicy = {
    ttl: 1800, // 30 minutes
    invalidateOn: ['create', 'update'],
    strategy: 'read-through',
    priority: 'medium',
    enabled: true
  };

  /**
   * Pipeline data cache policy
   * Medium frequency, analytical data
   */
  static readonly PIPELINE: CachePolicy = {
    ttl: 600, // 10 minutes
    invalidateOn: ['create', 'update', 'stage_move', 'delete'],
    strategy: 'cache-aside',
    priority: 'medium',
    enabled: true
  };

  /**
   * Analytics cache policy
   * Heavy computation, low frequency changes
   */
  static readonly ANALYTICS: CachePolicy = {
    ttl: 3600, // 1 hour
    invalidateOn: ['data_change', 'period_end'],
    strategy: 'write-behind',
    priority: 'low',
    enabled: true
  };

  /**
   * Settings cache policy
   * Very low frequency changes, stable data
   */
  static readonly SETTINGS: CachePolicy = {
    ttl: 7200, // 2 hours
    invalidateOn: ['update', 'create', 'delete'],
    strategy: 'read-through',
    priority: 'low',
    enabled: true
  };

  /**
   * AI templates cache policy
   * Stable data, infrequent changes
   */
  static readonly AI_TEMPLATES: CachePolicy = {
    ttl: 3600, // 1 hour
    invalidateOn: ['create', 'update', 'delete'],
    strategy: 'read-through',
    priority: 'medium',
    enabled: true
  };

  /**
   * User session cache policy
   * Short-lived, security-sensitive
   */
  static readonly USER_SESSION: CachePolicy = {
    ttl: 900, // 15 minutes
    invalidateOn: ['logout', 'permission_change'],
    strategy: 'write-through',
    priority: 'high',
    enabled: true
  };

  /**
   * Get cache policy by domain
   */
  static getPolicyByDomain(domain: string): CachePolicy {
    switch (domain.toLowerCase()) {
      case 'contacts':
        return this.CONTACTS;
      case 'appointments':
        return this.APPOINTMENTS;
      case 'medical_records':
      case 'records':
        return this.MEDICAL_RECORDS;
      case 'pipeline':
        return this.PIPELINE;
      case 'analytics':
        return this.ANALYTICS;
      case 'settings':
        return this.SETTINGS;
      case 'ai_templates':
        return this.AI_TEMPLATES;
      case 'user_session':
        return this.USER_SESSION;
      default:
        return {
          ttl: 300,
          invalidateOn: ['create', 'update', 'delete'],
          strategy: 'cache-aside',
          priority: 'medium',
          enabled: true
        };
    }
  }

  /**
   * Check if operation should invalidate cache
   */
  static shouldInvalidate(domain: string, operation: string): boolean {
    const policy = this.getPolicyByDomain(domain);
    return policy.invalidateOn.includes(operation);
  }

  /**
   * Get TTL for domain
   */
  static getTTL(domain: string): number {
    return this.getPolicyByDomain(domain).ttl;
  }

  /**
   * Check if caching is enabled for domain
   */
  static isEnabled(domain: string): boolean {
    const enableCache = process.env.ENABLE_REDIS_CACHE !== 'false';
    const policy = this.getPolicyByDomain(domain);
    return enableCache && policy.enabled;
  }

  /**
   * Get cache strategy for domain
   */
  static getStrategy(domain: string): CachePolicy['strategy'] {
    return this.getPolicyByDomain(domain).strategy;
  }

  /**
   * Get priority for domain
   */
  static getPriority(domain: string): CachePolicy['priority'] {
    return this.getPolicyByDomain(domain).priority;
  }

  /**
   * Get all enabled domains
   */
  static getEnabledDomains(): string[] {
    const domains = [
      'contacts', 'appointments', 'medical_records', 'pipeline',
      'analytics', 'settings', 'ai_templates', 'user_session'
    ];
    
    return domains.filter(domain => this.isEnabled(domain));
  }

  /**
   * Performance configurations
   */
  static readonly PERFORMANCE = {
    // Maximum cache size per clinic (in MB)
    maxCacheSizePerClinic: 50,
    
    // Maximum number of keys per clinic
    maxKeysPerClinic: 10000,
    
    // Batch size for bulk operations
    batchSize: 100,
    
    // Connection timeout
    connectionTimeout: 5000,
    
    // Command timeout
    commandTimeout: 3000,
    
    // Retry attempts
    maxRetries: 3
  };
}