/**
 * Tenant Isolation Decorator
 * Automatically enforces clinic-based tenant isolation for all repository operations
 */

import { TenantContext, TenantIsolationError } from '../types/repository.types';

export interface TenantIsolationConfig {
  requireClinicId: boolean;
  requireUserId: boolean;
  allowSuperAdmin: boolean;
  auditTrail: boolean;
}

const DEFAULT_CONFIG: TenantIsolationConfig = {
  requireClinicId: true,
  requireUserId: false,
  allowSuperAdmin: true,
  auditTrail: true
};

/**
 * Decorator that enforces tenant isolation on repository methods
 */
export function WithTenantIsolation(config: Partial<TenantIsolationConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Extract tenant context from arguments
      const context = extractTenantContext(args);
      
      // Validate tenant isolation
      validateTenantIsolation(context, finalConfig);
      
      // Log for audit trail
      if (finalConfig.auditTrail) {
        logTenantOperation(target.constructor.name, propertyName, context);
      }

      // Execute original method
      return method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Method decorator for clinic ID validation
 */
export function RequireClinicId(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const clinicId = extractClinicIdFromArgs(args);
    
    if (!clinicId || typeof clinicId !== 'number' || clinicId <= 0) {
      throw new TenantIsolationError(
        'Valid clinic ID is required for this operation',
        { operation: propertyName, providedClinicId: clinicId }
      );
    }

    return method.apply(this, args);
  };

  return descriptor;
}

/**
 * Class decorator for automatic tenant isolation on all methods
 */
export function TenantIsolated(config: Partial<TenantIsolationConfig> = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const methodNames = Object.getOwnPropertyNames(constructor.prototype)
      .filter(name => name !== 'constructor' && typeof constructor.prototype[name] === 'function');

    methodNames.forEach(methodName => {
      const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, methodName);
      if (descriptor) {
        WithTenantIsolation(config)(constructor.prototype, methodName, descriptor);
        Object.defineProperty(constructor.prototype, methodName, descriptor);
      }
    });

    return constructor;
  };
}

// Helper Functions

function extractTenantContext(args: any[]): TenantContext | null {
  // Look for TenantContext in arguments
  for (const arg of args) {
    if (arg && typeof arg === 'object' && 'clinicId' in arg) {
      return arg as TenantContext;
    }
  }

  // Look for clinic ID as first or second parameter
  const clinicId = extractClinicIdFromArgs(args);
  if (clinicId) {
    return { clinicId };
  }

  return null;
}

function extractClinicIdFromArgs(args: any[]): number | null {
  // Check first few arguments for clinic ID
  for (let i = 0; i < Math.min(args.length, 3); i++) {
    const arg = args[i];
    
    // Direct clinic ID
    if (typeof arg === 'number' && arg > 0) {
      return arg;
    }
    
    // Object with clinic_id property
    if (arg && typeof arg === 'object' && 'clinic_id' in arg) {
      return arg.clinic_id;
    }
    
    // Object with clinicId property
    if (arg && typeof arg === 'object' && 'clinicId' in arg) {
      return arg.clinicId;
    }
  }

  return null;
}

function validateTenantIsolation(
  context: TenantContext | null,
  config: TenantIsolationConfig
): void {
  if (!context) {
    if (config.requireClinicId) {
      throw new TenantIsolationError(
        'Tenant context is required for this operation'
      );
    }
    return;
  }

  // Validate clinic ID
  if (config.requireClinicId && (!context.clinicId || context.clinicId <= 0)) {
    throw new TenantIsolationError(
      'Valid clinic ID is required',
      { providedContext: context }
    );
  }

  // Validate user ID if required
  if (config.requireUserId && !context.userId) {
    throw new TenantIsolationError(
      'User ID is required for this operation',
      { providedContext: context }
    );
  }

  // Additional business logic validations can be added here
}

function logTenantOperation(
  className: string,
  methodName: string,
  context: TenantContext | null
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    service: className,
    operation: methodName,
    clinicId: context?.clinicId,
    userId: context?.userId,
    userRole: context?.userRole
  };

  // In production, this would go to a structured logging service
  console.log('[TENANT_AUDIT]', logData);
}

/**
 * Middleware factory for Express routes
 */
export function createTenantIsolationMiddleware(config: Partial<TenantIsolationConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return (req: any, res: any, next: any) => {
    try {
      // Extract clinic ID from various sources
      const clinicId = extractClinicIdFromRequest(req);
      
      if (finalConfig.requireClinicId && !clinicId) {
        return res.status(400).json({
          success: false,
          error: 'Clinic ID is required',
          code: 'TENANT_ISOLATION_REQUIRED'
        });
      }

      // Validate user has access to this clinic
      if (clinicId && req.user) {
        const userClinicIds = getUserClinicIds(req.user);
        
        if (!finalConfig.allowSuperAdmin || req.user.role !== 'super_admin') {
          if (!userClinicIds.includes(clinicId)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied to this clinic',
              code: 'TENANT_ISOLATION_VIOLATION'
            });
          }
        }
      }

      // Add tenant context to request
      req.tenantContext = {
        clinicId,
        userId: req.user?.id,
        userRole: req.user?.role
      };

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Tenant isolation validation failed',
        code: 'TENANT_ISOLATION_ERROR'
      });
    }
  };
}

function extractClinicIdFromRequest(req: any): number | null {
  // Check various sources for clinic ID
  const sources = [
    req.params.clinic_id,
    req.params.clinicId,
    req.query.clinic_id,
    req.query.clinicId,
    req.body?.clinic_id,
    req.body?.clinicId,
    req.headers['x-clinic-id']
  ];

  for (const source of sources) {
    if (source) {
      const clinicId = parseInt(source, 10);
      if (!isNaN(clinicId) && clinicId > 0) {
        return clinicId;
      }
    }
  }

  return null;
}

function getUserClinicIds(user: any): number[] {
  // Extract clinic IDs that user has access to
  if (user.clinics && Array.isArray(user.clinics)) {
    return user.clinics.map((clinic: any) => clinic.id || clinic.clinic_id).filter(Boolean);
  }
  
  if (user.clinic_id) {
    return [user.clinic_id];
  }
  
  return [];
}