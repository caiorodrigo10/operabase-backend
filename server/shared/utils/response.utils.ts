/**
 * Standardized Response Utilities
 * Provides consistent API response patterns across all domains
 */

import { PaginatedResult } from '../types/repository.types';

export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  stackTrace?: string; // Only in development
}

export interface PaginatedResponse<T> extends StandardResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface MedicalAuditInfo {
  operation: string;
  entityType: string;
  clinicId: number;
  userId?: string | number;
  timestamp: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'medical';
}

// Success Response Creators
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): StandardResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId
  };
}

export function createPaginatedResponse<T>(
  result: PaginatedResult<T>,
  message?: string,
  requestId?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data: result.data,
    pagination: result.pagination,
    message,
    timestamp: new Date().toISOString(),
    requestId
  };
}

// Error Response Creators
export function createErrorResponse(
  error: string,
  code?: string,
  details?: any,
  requestId?: string
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error,
    code,
    details,
    timestamp: new Date().toISOString(),
    requestId
  };

  // Add stack trace only in development
  if (process.env.NODE_ENV === 'development' && details instanceof Error) {
    response.stackTrace = details.stack;
  }

  return response;
}

export function createValidationErrorResponse(
  message: string,
  validationErrors: ValidationErrorDetail[],
  requestId?: string
): ErrorResponse {
  return createErrorResponse(
    message,
    'VALIDATION_ERROR',
    {
      validationErrors,
      fieldCount: validationErrors.length
    },
    requestId
  );
}

export function createNotFoundResponse(
  entity: string,
  id: number | string,
  clinicId?: number,
  requestId?: string
): ErrorResponse {
  return createErrorResponse(
    `${entity} not found`,
    'NOT_FOUND',
    {
      entity,
      id,
      clinicId
    },
    requestId
  );
}

export function createUnauthorizedResponse(
  message: string = 'Unauthorized access',
  requestId?: string
): ErrorResponse {
  return createErrorResponse(
    message,
    'UNAUTHORIZED',
    undefined,
    requestId
  );
}

export function createForbiddenResponse(
  message: string = 'Access forbidden',
  clinicId?: number,
  requestId?: string
): ErrorResponse {
  return createErrorResponse(
    message,
    'FORBIDDEN',
    {
      clinicId,
      reason: 'Tenant isolation violation or insufficient permissions'
    },
    requestId
  );
}

export function createTenantIsolationErrorResponse(
  attemptedClinicId: number,
  userClinicId: number,
  requestId?: string
): ErrorResponse {
  return createErrorResponse(
    'Tenant isolation violation detected',
    'TENANT_ISOLATION_VIOLATION',
    {
      attemptedClinicId,
      userClinicId,
      securityLevel: 'HIGH',
      auditRequired: true
    },
    requestId
  );
}

export function createMedicalComplianceErrorResponse(
  message: string,
  auditInfo: MedicalAuditInfo,
  requestId?: string
): ErrorResponse {
  return createErrorResponse(
    message,
    'MEDICAL_COMPLIANCE_VIOLATION',
    {
      auditInfo,
      complianceFramework: ['LGPD', 'HIPAA'],
      reportingRequired: true
    },
    requestId
  );
}

// Response Utilities
export function wrapControllerResponse<T>(
  promise: Promise<T>,
  successMessage?: string
): Promise<StandardResponse<T> | ErrorResponse> {
  return promise
    .then(data => createSuccessResponse(data, successMessage))
    .catch(error => {
      if (error.name === 'ValidationError') {
        return createValidationErrorResponse(
          error.message,
          error.details || []
        );
      }
      
      if (error.name === 'NotFoundError') {
        return createNotFoundResponse(
          error.context?.entity || 'Resource',
          error.context?.id || 'unknown',
          error.context?.clinicId
        );
      }
      
      if (error.name === 'TenantIsolationError') {
        return createTenantIsolationErrorResponse(
          error.context?.attemptedClinicId || 0,
          error.context?.userClinicId || 0
        );
      }
      
      return createErrorResponse(
        error.message || 'Internal server error',
        error.code || 'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? error : undefined
      );
    });
}

// Medical Data Sanitization
export function sanitizeForMedicalAudit<T>(
  data: T,
  sensitiveFields: string[] = ['password', 'ssn', 'cpf', 'medical_history']
): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data } as any;
  
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

// Response Time Tracking
export function trackResponseTime(startTime: number): number {
  return Date.now() - startTime;
}

export function createPerformanceHeaders(responseTime: number, cacheHit: boolean = false) {
  return {
    'X-Response-Time': `${responseTime}ms`,
    'X-Cache-Status': cacheHit ? 'HIT' : 'MISS',
    'X-Server-Time': new Date().toISOString()
  };
}

// Legacy Compatibility Layer
export function convertToLegacyResponse<T>(response: StandardResponse<T>): any {
  if (response.success) {
    return response.data;
  }
  
  // Convert error response to legacy format
  const errorResponse = response as ErrorResponse;
  return {
    error: errorResponse.error,
    details: errorResponse.details
  };
}

export function isStandardResponse(obj: any): obj is StandardResponse {
  return obj && typeof obj === 'object' && 'success' in obj && 'timestamp' in obj;
}