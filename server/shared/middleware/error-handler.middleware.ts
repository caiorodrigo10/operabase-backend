/**
 * Global Error Handler Middleware
 * Provides standardized error responses with medical compliance and audit trails
 */

import { Request, Response, NextFunction } from 'express';
import { 
  createErrorResponse, 
  createValidationErrorResponse, 
  createNotFoundResponse, 
  createUnauthorizedResponse,
  createTenantIsolationErrorResponse,
  sanitizeForMedicalAudit
} from '../utils/response.utils';

export interface ErrorWithContext extends Error {
  code?: string;
  statusCode?: number;
  context?: any;
  validationErrors?: any[];
}

export function globalErrorHandler(
  error: ErrorWithContext,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  // Log error with context (sanitized for medical compliance)
  const sanitizedError = sanitizeForMedicalAudit(error, ['password', 'token', 'secret']);
  console.error(`[ERROR] ${requestId}:`, {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.url,
    method: req.method,
    userId: (req as any).user?.id,
    clinicId: (req as any).tenantContext?.clinicId,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
    return res.status(400).json(
      createValidationErrorResponse(
        error.message,
        error.validationErrors || [],
        requestId
      )
    );
  }

  if (error.name === 'NotFoundError' || error.code === 'NOT_FOUND') {
    return res.status(404).json(
      createNotFoundResponse(
        error.context?.entity || 'Resource',
        error.context?.id || 'unknown',
        error.context?.clinicId,
        requestId
      )
    );
  }

  if (error.name === 'TenantIsolationError' || error.code === 'TENANT_ISOLATION_VIOLATION') {
    return res.status(403).json(
      createTenantIsolationErrorResponse(
        error.context?.attemptedClinicId || 0,
        error.context?.userClinicId || 0,
        requestId
      )
    );
  }

  if (error.name === 'UnauthorizedError' || error.statusCode === 401) {
    return res.status(401).json(
      createUnauthorizedResponse(
        error.message || 'Unauthorized access',
        requestId
      )
    );
  }

  // Handle Drizzle/Database errors
  if (error.message?.includes('duplicate key') || error.code === '23505') {
    return res.status(409).json(
      createErrorResponse(
        'Resource already exists',
        'DUPLICATE_RESOURCE',
        undefined,
        requestId
      )
    );
  }

  if (error.message?.includes('foreign key') || error.code === '23503') {
    return res.status(400).json(
      createErrorResponse(
        'Invalid reference to related resource',
        'FOREIGN_KEY_VIOLATION',
        undefined,
        requestId
      )
    );
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const errorResponse = createErrorResponse(
    error.message || 'Internal server error',
    error.code || 'INTERNAL_ERROR',
    process.env.NODE_ENV === 'development' ? error : undefined,
    requestId
  );

  res.status(statusCode).json(errorResponse);
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response) {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  
  res.status(404).json(
    createNotFoundResponse(
      'Endpoint',
      req.path,
      undefined,
      requestId
    )
  );
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}