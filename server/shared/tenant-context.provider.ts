import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant context interface
 */
interface TenantContext {
  clinicId: number;
  userId?: string;
  userRole?: string;
  isProfessional?: boolean;
}

/**
 * Global tenant context storage using AsyncLocalStorage
 * Provides thread-safe tenant isolation across async operations
 */
class TenantContextProvider {
  private storage = new AsyncLocalStorage<TenantContext>();

  /**
   * Set tenant context for current execution context
   */
  setContext(context: TenantContext): void {
    // This should be called within a middleware that uses run()
    const currentContext = this.storage.getStore();
    if (currentContext) {
      Object.assign(currentContext, context);
    }
  }

  /**
   * Get current clinic ID from context
   */
  getClinicId(): number {
    const context = this.storage.getStore();
    if (!context?.clinicId) {
      throw new Error('No clinic context available');
    }
    return context.clinicId;
  }

  /**
   * Get current user ID from context
   */
  getUserId(): string | undefined {
    const context = this.storage.getStore();
    return context?.userId;
  }

  /**
   * Get current user role from context
   */
  getUserRole(): string | undefined {
    const context = this.storage.getStore();
    return context?.userRole;
  }

  /**
   * Check if current user is a professional
   */
  isProfessional(): boolean {
    const context = this.storage.getStore();
    return context?.isProfessional || false;
  }

  /**
   * Get full context
   */
  getContext(): TenantContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Run callback with specific tenant context
   */
  run<T>(context: TenantContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /**
   * Check if context is available
   */
  hasContext(): boolean {
    return this.storage.getStore() !== undefined;
  }

  /**
   * Clear current context (for testing purposes)
   */
  clearContext(): void {
    const context = this.storage.getStore();
    if (context) {
      Object.keys(context).forEach(key => {
        delete (context as any)[key];
      });
    }
  }
}

// Singleton instance
export const tenantContext = new TenantContextProvider();
export type { TenantContext };