/**
 * Proxy Migration Factory
 * Enables gradual migration to BaseRepository pattern with feature flags
 */

export interface MigrationConfig {
  enabled: boolean;
  domain: string;
  operations: string[];
  rollbackThreshold: {
    errorRate: number; // percentage
    responseTime: number; // milliseconds
  };
}

export interface MigrationMetrics {
  errorCount: number;
  successCount: number;
  avgResponseTime: number;
  lastError?: Error;
}

export class ProxyMigrationFactory {
  private static metrics: Map<string, MigrationMetrics> = new Map();
  private static configs: Map<string, MigrationConfig> = new Map();

  static configure(domain: string, config: MigrationConfig): void {
    this.configs.set(domain, config);
    this.metrics.set(domain, {
      errorCount: 0,
      successCount: 0,
      avgResponseTime: 0
    });
  }

  static createProxy<T extends object>(
    domain: string,
    legacyInstance: T,
    newInstance: T
  ): T {
    const config = this.configs.get(domain);
    if (!config?.enabled) {
      return legacyInstance;
    }

    return new Proxy(legacyInstance, {
      get(target, prop, receiver) {
        const propName = String(prop);
        
        // Use new implementation for configured operations
        if (config.operations.includes(propName) && prop in newInstance) {
          return ProxyMigrationFactory.wrapMethod(domain, propName, newInstance[prop as keyof T]);
        }
        
        // Fallback to legacy implementation
        return Reflect.get(target, prop, receiver);
      }
    });
  }

  private static wrapMethod(domain: string, operation: string, method: any) {
    return async (...args: any[]) => {
      const startTime = Date.now();
      const metrics = this.metrics.get(domain)!;

      try {
        const result = await method.apply(this, args);
        
        // Record success
        metrics.successCount++;
        const responseTime = Date.now() - startTime;
        this.updateResponseTime(domain, responseTime);
        
        return result;
      } catch (error) {
        // Record error
        metrics.errorCount++;
        metrics.lastError = error as Error;
        
        // Check rollback conditions
        this.checkRollbackConditions(domain);
        
        throw error;
      }
    };
  }

  private static updateResponseTime(domain: string, responseTime: number): void {
    const metrics = this.metrics.get(domain)!;
    const totalOperations = metrics.successCount + metrics.errorCount;
    
    metrics.avgResponseTime = (
      (metrics.avgResponseTime * (totalOperations - 1)) + responseTime
    ) / totalOperations;
  }

  private static checkRollbackConditions(domain: string): void {
    const config = this.configs.get(domain)!;
    const metrics = this.metrics.get(domain)!;
    
    const totalOperations = metrics.successCount + metrics.errorCount;
    if (totalOperations < 10) return; // Need minimum sample size
    
    const errorRate = (metrics.errorCount / totalOperations) * 100;
    
    if (errorRate > config.rollbackThreshold.errorRate ||
        metrics.avgResponseTime > config.rollbackThreshold.responseTime) {
      
      console.error(`[ROLLBACK] ${domain} migration failed:`, {
        errorRate: `${errorRate.toFixed(2)}%`,
        avgResponseTime: `${metrics.avgResponseTime}ms`,
        threshold: config.rollbackThreshold
      });
      
      // Disable migration for this domain
      config.enabled = false;
    }
  }

  static getMetrics(domain: string): MigrationMetrics | null {
    return this.metrics.get(domain) || null;
  }

  static getAllMetrics(): Record<string, MigrationMetrics> {
    const result: Record<string, MigrationMetrics> = {};
    this.metrics.forEach((metrics, domain) => {
      result[domain] = metrics;
    });
    return result;
  }

  static resetMetrics(domain: string): void {
    this.metrics.set(domain, {
      errorCount: 0,
      successCount: 0,
      avgResponseTime: 0
    });
  }
}