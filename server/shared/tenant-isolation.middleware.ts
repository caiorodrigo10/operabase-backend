import { Request, Response, NextFunction } from 'express';
import { tenantContext } from './tenant-context.provider.js';
import { TenantContext, TenantRequest } from './tenant-types.js';

/**
 * Tenant Isolation Middleware
 * Automatically extracts clinic_id from user session and sets tenant context
 * Ensures all database operations are filtered by clinic_id
 */
export function tenantIsolationMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  // Skip tenant isolation for non-authenticated routes
  if (!req.user) {
    return next();
  }

  try {
    // Extract clinic context from user session
    const userId = req.user.id?.toString();
    const userRole = req.user.role || 'user';
    
    // For now, we'll use clinic_id from session or default to 1
    // This will be enhanced when we have proper clinic selection
    const clinicId = (req.user as any).clinic_id || 1;

    if (!userId || !clinicId) {
      return res.status(400).json({
        error: 'Invalid session: missing user or clinic information'
      });
    }

    // Create tenant context
    const context: TenantContext = {
      clinicId: Number(clinicId),
      userId: userId,
      userRole: userRole,
      isAuthenticated: true
    };

    // Set tenant context and continue with request
    tenantContext.run(context, () => {
      // Add context to request for debugging/logging
      req.tenantContext = context;
      next();
    });

  } catch (error) {
    console.error('Tenant isolation middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error in tenant isolation'
    });
  }
}

/**
 * Optional middleware to skip tenant isolation for specific routes
 */
export function skipTenantIsolation(req: TenantRequest, res: Response, next: NextFunction) {
  (req as any)._skipTenantIsolation = true;
  next();
}

/**
 * Middleware to validate tenant context exists
 */
export function requireTenantContext(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    tenantContext.validateContext();
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Tenant context required but not found'
    });
  }
}