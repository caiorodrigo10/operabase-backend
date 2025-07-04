/**
 * New Contacts Repository using Base Repository Pattern
 * Demonstrates unified CRUD operations with tenant isolation
 */

import { contacts } from './contacts.schema';
import { Contact, InsertContact } from '../../shared/schemas/index';
import { TenantContext, PaginationOptions, FilterOptions } from '../../shared/types/repository.types';
import { CacheMiddleware } from '../../cache-middleware';
import { db } from '../../db';
import { eq, and, ilike, or, count, desc } from 'drizzle-orm';

export class ContactsRepositoryNew {
  private entityName = 'Contact';
  private cachePrefix = 'contacts';

  // Core CRUD Operations with Tenant Isolation

  async findByClinic(
    clinicId: number,
    filters: FilterOptions = {}
  ): Promise<Contact[]> {
    const cacheKey = `${this.cachePrefix}:clinic:${clinicId}:list`;
    
    return CacheMiddleware.cacheAside(
      'repository',
      cacheKey,
      clinicId,
      async () => {
        let query = db.select().from(contacts).where(eq(contacts.clinic_id, clinicId));
        
        // Apply filters
        if (filters.status) {
          query = query.where(and(
            eq(contacts.clinic_id, clinicId),
            eq(contacts.status, filters.status)
          ));
        }
        
        if (filters.search) {
          query = query.where(and(
            eq(contacts.clinic_id, clinicId),
            or(
              ilike(contacts.name, `%${filters.search}%`),
              ilike(contacts.phone, `%${filters.search}%`),
              ilike(contacts.email, `%${filters.search}%`)
            )
          ));
        }

        const result = await query.orderBy(desc(contacts.last_interaction));
        return result;
      },
      300 // 5 minutes TTL
    );
  }

  async findById(id: number, clinicId: number): Promise<Contact | null> {
    const cacheKey = `${this.cachePrefix}:${id}:clinic:${clinicId}`;
    
    return CacheMiddleware.cacheAside(
      'repository',
      cacheKey,
      clinicId,
      async () => {
        const result = await db.select()
          .from(contacts)
          .where(and(
            eq(contacts.id, id),
            eq(contacts.clinic_id, clinicId)
          ))
          .limit(1);
        
        return result[0] || null;
      },
      600 // 10 minutes TTL
    );
  }

  async create(data: InsertContact, context: TenantContext): Promise<Contact> {
    // Ensure clinic_id is set from context
    const contactData = {
      ...data,
      clinic_id: context.clinicId
    };

    const result = await db.insert(contacts)
      .values(contactData)
      .returning();
    
    const created = result[0];
    
    // Invalidate related cache
    await CacheMiddleware.invalidatePattern('repository', context.clinicId);
    
    console.log(`[AUDIT] Contact created:`, {
      id: created.id,
      clinicId: context.clinicId,
      userId: context.userId,
      timestamp: new Date().toISOString()
    });
    
    return created;
  }

  async update(
    id: number,
    data: Partial<InsertContact>,
    context: TenantContext
  ): Promise<Contact> {
    // Verify contact exists and belongs to clinic
    const existing = await this.findById(id, context.clinicId);
    if (!existing) {
      throw new Error(`Contact with id ${id} not found in clinic ${context.clinicId}`);
    }

    // Remove fields that shouldn't be updated
    const updateData = { ...data };
    delete (updateData as any).clinic_id;
    delete (updateData as any).id;

    const result = await db.update(contacts)
      .set(updateData)
      .where(and(
        eq(contacts.id, id),
        eq(contacts.clinic_id, context.clinicId)
      ))
      .returning();

    if (!result.length) {
      throw new Error(`Failed to update contact ${id}`);
    }

    const updated = result[0];
    
    // Invalidate related cache
    await CacheMiddleware.invalidatePattern('repository', context.clinicId);
    
    console.log(`[AUDIT] Contact updated:`, {
      id: updated.id,
      clinicId: context.clinicId,
      userId: context.userId,
      changes: Object.keys(data),
      timestamp: new Date().toISOString()
    });
    
    return updated;
  }

  async updateContactStatus(
    id: number,
    status: string,
    context: TenantContext
  ): Promise<Contact> {
    return this.update(id, { status }, context);
  }

  async delete(id: number, context: TenantContext): Promise<boolean> {
    // Verify contact exists and belongs to clinic
    const existing = await this.findById(id, context.clinicId);
    if (!existing) {
      return false;
    }

    const result = await db.delete(contacts)
      .where(and(
        eq(contacts.id, id),
        eq(contacts.clinic_id, context.clinicId)
      ));

    // Invalidate related cache
    await CacheMiddleware.invalidatePattern('repository', context.clinicId);
    
    console.log(`[AUDIT] Contact deleted:`, {
      id,
      clinicId: context.clinicId,
      userId: context.userId,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }

  // Advanced Operations

  async findWithPagination(
    clinicId: number,
    options: PaginationOptions,
    filters: FilterOptions = {}
  ) {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    let baseQuery = db.select().from(contacts);
    let countQuery = db.select({ count: count() }).from(contacts);

    // Build where conditions
    let whereConditions = eq(contacts.clinic_id, clinicId);
    
    if (filters.status) {
      whereConditions = and(whereConditions, eq(contacts.status, filters.status));
    }
    
    if (filters.search) {
      const searchCondition = or(
        ilike(contacts.name, `%${filters.search}%`),
        ilike(contacts.phone, `%${filters.search}%`),
        ilike(contacts.email, `%${filters.search}%`)
      );
      whereConditions = and(whereConditions, searchCondition);
    }

    // Get total count
    const totalResult = await countQuery.where(whereConditions);
    const total = totalResult[0].count;

    // Get paginated data
    const data = await baseQuery
      .where(whereConditions)
      .orderBy(desc(contacts.last_interaction))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
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

  async count(clinicId: number, filters: FilterOptions = {}): Promise<number> {
    let query = db.select({ count: count() }).from(contacts);
    
    let whereConditions = eq(contacts.clinic_id, clinicId);
    
    if (filters.status) {
      whereConditions = and(whereConditions, eq(contacts.status, filters.status));
    }

    const result = await query.where(whereConditions);
    return result[0].count;
  }
}