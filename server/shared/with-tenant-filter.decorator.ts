import { tenantContext } from './tenant-context.provider.js';
import { TenantIsolationOptions } from './tenant-types.js';

/**
 * Decorator that automatically adds tenant filtering to repository methods
 * Maintains existing method signatures while adding clinic_id filter
 */
export function withTenantFilter<T extends (...args: any[]) => any>(
  originalMethod: T,
  options: TenantIsolationOptions = {}
): T {
  return ((...args: Parameters<T>) => {
    // Skip tenant filtering if explicitly disabled
    if (options.skipTenantFilter) {
      return originalMethod.apply(this, args);
    }

    try {
      // Get tenant filter
      const tenantFilter = tenantContext.getTenantFilter();
      
      // For methods that accept filter parameters, merge tenant filter
      if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
        // Merge tenant filter with existing filters
        args[0] = {
          ...args[0],
          ...tenantFilter
        };
      } else if (args.length === 0) {
        // Add tenant filter as first argument if no parameters
        args[0] = tenantFilter;
      }

      return originalMethod.apply(this, args);
    } catch (error) {
      // If tenant context is not available, allow the original method to run
      // This maintains compatibility with non-tenant aware calls
      console.warn('Tenant context not available, running without tenant filter:', error.message);
      return originalMethod.apply(this, args);
    }
  }) as T;
}

/**
 * Class decorator to apply tenant filtering to all repository methods
 */
export function TenantAware(options: TenantIsolationOptions = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    // Get all method names from prototype
    const prototype = constructor.prototype;
    const methodNames = Object.getOwnPropertyNames(prototype)
      .filter(name => name !== 'constructor' && typeof prototype[name] === 'function');

    // Apply tenant filtering to each method
    methodNames.forEach(methodName => {
      const originalMethod = prototype[methodName];
      
      // Skip methods that shouldn't be filtered
      if (methodName.includes('create') || methodName.includes('insert')) {
        // For create/insert methods, we may want different handling
        prototype[methodName] = withTenantFilter(originalMethod, options);
      } else if (methodName.includes('find') || methodName.includes('get') || methodName.includes('list')) {
        // For read methods, always apply tenant filter
        prototype[methodName] = withTenantFilter(originalMethod, options);
      } else if (methodName.includes('update') || methodName.includes('delete')) {
        // For update/delete methods, apply tenant filter for safety
        prototype[methodName] = withTenantFilter(originalMethod, options);
      } else {
        // For other methods, apply default tenant filtering
        prototype[methodName] = withTenantFilter(originalMethod, options);
      }
    });

    return constructor;
  };
}

/**
 * Method decorator for specific tenant-aware methods
 */
export function TenantFiltered(options: TenantIsolationOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = withTenantFilter(originalMethod, options);
    return descriptor;
  };
}