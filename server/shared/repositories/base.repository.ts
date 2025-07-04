/**
 * Base Repository Implementation
 * Provides unified CRUD operations with tenant isolation and performance optimization
 */

import { sql, eq, and, desc, asc, count } from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../../db';
import { CacheMiddleware } from '../../cache-middleware';
import {
  IBaseRepository,
  PaginationOptions,
  PaginatedResult,
  FilterOptions,
  TenantContext,
  CacheOptions,
  NotFoundError,
  TenantIsolationError,
  ValidationError,
  AuditMetadata
} from '../types/repository.types';

export abstract class BaseRepository<T, InsertT> implements IBaseRepository<T, InsertT> {
  protected abstract table: PgTable;
  protected abstract entityName: string;
  protected cachePrefix: string;

  constructor() {
    this.cachePrefix = this.entityName.toLowerCase();
  }

  // Core CRUD Operations with Tenant Isolation

  async findByClinic(
    clinicId: number,
    filters: FilterOptions = {},
    options: CacheOptions = {}
  ): Promise<T[]> {
    this.validateClinicId(clinicId);
    
    const cacheKey = `${this.cachePrefix}:clinic:${clinicId}:list:${JSON.stringify(filters)}`;
    
    return CacheMiddleware.cacheAside(
      'repository',
      cacheKey,
      clinicId,
      async () => {
        const query = db.select().from(this.table);
        const conditions = [eq(this.table.clinic_id, clinicId)];
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && key !== 'clinic_id') {
            if (key in this.table) {
              conditions.push(eq(this.table[key], value));
            }
          }
        });

        const result = await query.where(and(...conditions));
        return result as T[];
      },
      options.ttl || 300 // 5 minutes default TTL
    );
  }

  async findById(
    id: number,
    clinicId: number,
    options: CacheOptions = {}
  ): Promise<T | null> {
    this.validateClinicId(clinicId);
    this.validateId(id);

    const cacheKey = `${this.cachePrefix}:${id}:clinic:${clinicId}`;
    
    return CacheMiddleware.cacheAside(
      'repository',
      cacheKey,
      clinicId,
      async () => {
        const result = await db.select()
          .from(this.table)
          .where(and(
            eq(this.table.id, id),
            eq(this.table.clinic_id, clinicId)
          ))
          .limit(1);
        
        return result[0] as T || null;
      },
      options.ttl || 600 // 10 minutes default TTL
    );
  }

  async create(data: InsertT, context: TenantContext): Promise<T> {
    this.validateTenantContext(context);
    
    // Ensure clinic_id is set from context
    const dataWithClinic = {
      ...data,
      clinic_id: context.clinicId
    } as any;

    const result = await db.insert(this.table)
      .values(dataWithClinic)
      .returning();
    
    const created = result[0] as T;
    
    // Invalidate related cache
    await this.invalidateCache(`${this.cachePrefix}:clinic:${context.clinicId}:*`, context.clinicId);
    
    // Audit trail
    await this.createAuditTrail('create', created, context);
    
    return created;
  }

  async update(
    id: number,
    data: Partial<InsertT>,
    context: TenantContext
  ): Promise<T> {
    this.validateTenantContext(context);
    this.validateId(id);

    // Verify entity exists and belongs to clinic
    const existing = await this.findById(id, context.clinicId);
    if (!existing) {
      throw new NotFoundError(this.entityName, id, context.clinicId);
    }

    // Prevent clinic_id modification
    const updateData = { ...data };
    delete (updateData as any).clinic_id;
    delete (updateData as any).id;

    const result = await db.update(this.table)
      .set(updateData as any)
      .where(and(
        eq(this.table.id, id),
        eq(this.table.clinic_id, context.clinicId)
      ))
      .returning();

    if (!result.length) {
      throw new NotFoundError(this.entityName, id, context.clinicId);
    }

    const updated = result[0] as T;
    
    // Invalidate related cache
    await this.invalidateCache(`${this.cachePrefix}:${id}:*`, context.clinicId);
    await this.invalidateCache(`${this.cachePrefix}:clinic:${context.clinicId}:*`, context.clinicId);
    
    // Audit trail
    await this.createAuditTrail('update', updated, context, { previous: existing, changes: data });
    
    return updated;
  }

  async delete(id: number, context: TenantContext): Promise<boolean> {
    this.validateTenantContext(context);
    this.validateId(id);

    // Verify entity exists and belongs to clinic
    const existing = await this.findById(id, context.clinicId);
    if (!existing) {
      throw new NotFoundError(this.entityName, id, context.clinicId);
    }

    const result = await db.delete(this.table)
      .where(and(
        eq(this.table.id, id),
        eq(this.table.clinic_id, context.clinicId)
      ))
      .returning();

    if (!result.length) {
      return false;
    }

    // Invalidate related cache
    await this.invalidateCache(`${this.cachePrefix}:${id}:*`, context.clinicId);
    await this.invalidateCache(`${this.cachePrefix}:clinic:${context.clinicId}:*`, context.clinicId);
    
    // Audit trail
    await this.createAuditTrail('delete', existing, context);
    
    return true;
  }

  // Advanced Operations

  async findWithPagination(
    clinicId: number,
    options: PaginationOptions,
    filters: FilterOptions = {}
  ): Promise<PaginatedResult<T>> {
    this.validateClinicId(clinicId);

    const { page, limit, orderBy, orderDirection = 'desc' } = options;
    const offset = (page - 1) * limit;

    const conditions = [eq(this.table.clinic_id, clinicId)];
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'clinic_id') {
        if (key in this.table) {
          conditions.push(eq(this.table[key], value));
        }
      }
    });

    const whereClause = and(...conditions);

    // Get total count
    const totalResult = await db.select({ count: count() })
      .from(this.table)
      .where(whereClause);
    
    const total = totalResult[0].count;

    // Get data with pagination
    let query = db.select().from(this.table).where(whereClause);
    
    if (orderBy && orderBy in this.table) {
      query = query.orderBy(
        orderDirection === 'asc' 
          ? asc(this.table[orderBy])
          : desc(this.table[orderBy])
      );
    }

    const data = await query.limit(limit).offset(offset);

    const totalPages = Math.ceil(total / limit);
    
    return {
      data: data as T[],
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async bulkCreate(data: InsertT[], context: TenantContext): Promise<T[]> {
    this.validateTenantContext(context);

    if (!data.length) {
      return [];
    }

    // Ensure all records have clinic_id from context
    const dataWithClinic = data.map(item => ({
      ...item,
      clinic_id: context.clinicId
    })) as any[];

    const result = await db.insert(this.table)
      .values(dataWithClinic)
      .returning();

    // Invalidate related cache
    await this.invalidateCache(`${this.cachePrefix}:clinic:${context.clinicId}:*`, context.clinicId);
    
    return result as T[];
  }

  async bulkUpdate(
    updates: Array<{ id: number; data: Partial<InsertT> }>,
    context: TenantContext
  ): Promise<T[]> {
    this.validateTenantContext(context);

    if (!updates.length) {
      return [];
    }

    return this.transaction(async (tx) => {
      const results: T[] = [];
      
      for (const update of updates) {
        const result = await this.update(update.id, update.data, context);
        results.push(result);
      }
      
      return results;
    }, context);
  }

  async count(clinicId: number, filters: FilterOptions = {}): Promise<number> {
    this.validateClinicId(clinicId);

    const conditions = [eq(this.table.clinic_id, clinicId)];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'clinic_id') {
        if (key in this.table) {
          conditions.push(eq(this.table[key], value));
        }
      }
    });

    const result = await db.select({ count: count() })
      .from(this.table)
      .where(and(...conditions));
    
    return result[0].count;
  }

  // Transaction Support

  async transaction<R>(
    callback: (tx: any) => Promise<R>,
    context: TenantContext
  ): Promise<R> {
    this.validateTenantContext(context);
    
    return db.transaction(async (tx) => {
      try {
        return await callback(tx);
      } catch (error) {
        // Enhanced error context for transactions
        throw new ValidationError(
          `Transaction failed: ${error.message}`,
          { 
            clinicId: context.clinicId,
            operation: 'transaction',
            originalError: error
          }
        );
      }
    });
  }

  // Cache Management

  async invalidateCache(pattern: string, clinicId: number): Promise<void> {
    await CacheMiddleware.invalidatePattern('repository', clinicId);
  }

  async warmCache(clinicId: number): Promise<void> {
    // Implement cache warming strategy specific to entity
    // This is overridden in specific repositories
  }

  // Validation Helpers

  protected validateClinicId(clinicId: number): void {
    if (!clinicId || typeof clinicId !== 'number' || clinicId <= 0) {
      throw new ValidationError('Invalid clinic ID provided');
    }
  }

  protected validateId(id: number): void {
    if (!id || typeof id !== 'number' || id <= 0) {
      throw new ValidationError('Invalid entity ID provided');
    }
  }

  protected validateTenantContext(context: TenantContext): void {
    if (!context || !context.clinicId) {
      throw new TenantIsolationError('Tenant context is required for all operations');
    }
    
    this.validateClinicId(context.clinicId);
  }

  // Audit Trail

  protected async createAuditTrail(
    operation: 'create' | 'update' | 'delete',
    entity: T,
    context: TenantContext,
    metadata?: any
  ): Promise<void> {
    const auditData: AuditMetadata = {
      operation,
      entityType: this.entityName,
      entityId: (entity as any).id,
      clinicId: context.clinicId,
      userId: context.userId,
      timestamp: new Date(),
      changes: metadata
    };

    // In a production system, this would be sent to an audit service
    console.log(`[AUDIT] ${this.entityName} ${operation}:`, {
      ...auditData,
      // Sanitize sensitive data
      entity: this.sanitizeForAudit(entity)
    });
  }

  protected sanitizeForAudit(entity: T): Partial<T> {
    // Override in specific repositories to handle sensitive fields
    return entity;
  }
}