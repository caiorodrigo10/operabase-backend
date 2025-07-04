/**
 * Base Repository Types and Interfaces
 * Provides foundational types for the unified repository pattern
 */

export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FilterOptions {
  [key: string]: any;
}

export interface TenantContext {
  clinicId: number;
  userId?: string | number;
  userRole?: string;
}

export interface TransactionContext {
  clinicId: number;
  userId?: string | number;
  operation: string;
  timestamp: Date;
}

export interface CacheOptions {
  ttl?: number;
  key?: string;
  invalidatePattern?: string;
}

export interface AuditMetadata {
  operation: 'create' | 'update' | 'delete' | 'read';
  entityType: string;
  entityId?: number;
  clinicId: number;
  userId?: string | number;
  timestamp: Date;
  changes?: Record<string, any>;
}

// Base Repository Interface
export interface IBaseRepository<T, InsertT> {
  // Core CRUD operations with tenant isolation
  findByClinic(clinicId: number, filters?: FilterOptions, options?: CacheOptions): Promise<T[]>;
  findById(id: number, clinicId: number, options?: CacheOptions): Promise<T | null>;
  create(data: InsertT, context: TenantContext): Promise<T>;
  update(id: number, data: Partial<InsertT>, context: TenantContext): Promise<T>;
  delete(id: number, context: TenantContext): Promise<boolean>;
  
  // Advanced operations
  findWithPagination(clinicId: number, options: PaginationOptions, filters?: FilterOptions): Promise<PaginatedResult<T>>;
  bulkCreate(data: InsertT[], context: TenantContext): Promise<T[]>;
  bulkUpdate(updates: Array<{ id: number; data: Partial<InsertT> }>, context: TenantContext): Promise<T[]>;
  count(clinicId: number, filters?: FilterOptions): Promise<number>;
  
  // Transaction support
  transaction<R>(callback: (tx: any) => Promise<R>, context: TenantContext): Promise<R>;
  
  // Cache management
  invalidateCache(pattern: string, clinicId: number): Promise<void>;
  warmCache(clinicId: number): Promise<void>;
}

// Repository Error Types
export class RepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class TenantIsolationError extends RepositoryError {
  constructor(message: string, context?: any) {
    super(message, 'TENANT_ISOLATION_VIOLATION', context);
    this.name = 'TenantIsolationError';
  }
}

export class ValidationError extends RepositoryError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends RepositoryError {
  constructor(entity: string, id: number, clinicId: number) {
    super(`${entity} with id ${id} not found in clinic ${clinicId}`, 'NOT_FOUND', { entity, id, clinicId });
    this.name = 'NotFoundError';
  }
}