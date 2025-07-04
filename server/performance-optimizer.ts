import { sql } from 'drizzle-orm';
import { db } from './db.js';
import { PaginatedResponse, PaginationParams, calculatePagination, getPaginationOffset } from './shared/types/pagination.types.js';

/**
 * Sistema de Otimização de Performance
 * Implementa cache inteligente e otimizações de consulta
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly SHORT_TTL = 60 * 1000; // 1 minuto
  private readonly LONG_TTL = 30 * 60 * 1000; // 30 minutos

  /**
   * Cache inteligente com TTL baseado no tipo de dados
   */
  private getCacheKey(operation: string, params: any): string {
    return `${operation}:${JSON.stringify(params)}`;
  }

  private isValidCache(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private setCache(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && this.isValidCache(entry)) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Busca paginada e otimizada de contatos com cache
   */
  async getContactsPaginated(clinicId: number, pagination: PaginationParams, filters?: {
    search?: string;
    status?: string;
  }): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 25 } = pagination;
    const offset = getPaginationOffset(page, limit);
    
    const cacheKey = this.getCacheKey('contacts_paginated', { 
      clinicId, 
      page, 
      limit, 
      ...filters 
    });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const { search, status } = filters || {};
    
    // First get total count
    let countQuery = sql`
      SELECT COUNT(*) as total
      FROM contacts 
      WHERE clinic_id = ${clinicId}
    `;

    const countConditions = [];
    if (search && search.trim()) {
      countConditions.push(sql`(
        name ILIKE ${`%${search}%`} OR 
        phone ILIKE ${`%${search}%`} OR 
        email ILIKE ${`%${search}%`}
      )`);
    }

    if (status && status !== 'all') {
      countConditions.push(sql`status = ${status}`);
    }

    if (countConditions.length > 0) {
      countQuery = sql`${countQuery} AND ${sql.join(countConditions, sql` AND `)}`;
    }

    const countResult = await db.execute(countQuery);
    const totalItems = parseInt(countResult.rows[0]?.total || '0');

    // Then get paginated data
    let dataQuery = sql`
      SELECT 
        id, name, phone, email, status, last_interaction,
        profession, created_at
      FROM contacts 
      WHERE clinic_id = ${clinicId}
    `;

    if (countConditions.length > 0) {
      dataQuery = sql`${dataQuery} AND ${sql.join(countConditions, sql` AND `)}`;
    }

    dataQuery = sql`
      ${dataQuery}
      ORDER BY last_interaction DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;

    const dataResult = await db.execute(dataQuery);
    const pagination_meta = calculatePagination(page, limit, totalItems);

    const result: PaginatedResponse<any> = {
      data: dataResult.rows,
      pagination: pagination_meta
    };
    
    // Cache with shorter TTL for searches
    const ttl = search ? this.SHORT_TTL : this.DEFAULT_TTL;
    this.setCache(cacheKey, result, ttl);
    
    return result;
  }

  /**
   * Legacy method - maintaining backward compatibility
   */
  async getContactsOptimized(clinicId: number, filters?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const cacheKey = this.getCacheKey('contacts', { clinicId, ...filters });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const { search, status, limit = 50, offset = 0 } = filters || {};
    
    let query = sql`
      SELECT 
        id, name, phone, email, status, last_interaction,
        profession, created_at
      FROM contacts 
      WHERE clinic_id = ${clinicId}
    `;

    const conditions = [];
    
    if (search && search.trim()) {
      conditions.push(sql`(
        name ILIKE ${`%${search}%`} OR 
        phone ILIKE ${`%${search}%`} OR 
        email ILIKE ${`%${search}%`}
      )`);
    }

    if (status && status !== 'all') {
      conditions.push(sql`status = ${status}`);
    }

    if (conditions.length > 0) {
      query = sql`${query} AND ${sql.join(conditions, sql` AND `)}`;
    }

    query = sql`
      ${query}
      ORDER BY last_interaction DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await db.execute(query);
    
    // Cache por menos tempo se há filtros de busca
    const ttl = search ? this.SHORT_TTL : this.DEFAULT_TTL;
    this.setCache(cacheKey, result.rows, ttl);
    
    return result.rows;
  }

  /**
   * Busca paginada de agendamentos com otimizações
   */
  async getAppointmentsPaginated(clinicId: number, pagination: PaginationParams, filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    userId?: number;
  }): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 25 } = pagination;
    const offset = getPaginationOffset(page, limit);
    
    const cacheKey = this.getCacheKey('appointments_paginated', { 
      clinicId, 
      page, 
      limit, 
      ...filters 
    });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const { startDate, endDate, status, userId } = filters || {};
    
    // Count query
    let countQuery = sql`
      SELECT COUNT(*) as total
      FROM appointments a
      WHERE a.clinic_id = ${clinicId}
    `;

    const countConditions = [];
    if (startDate) {
      countConditions.push(sql`a.scheduled_date >= ${startDate}`);
    }
    if (endDate) {
      countConditions.push(sql`a.scheduled_date <= ${endDate}`);
    }
    if (status && status !== 'all') {
      countConditions.push(sql`a.status = ${status}`);
    }
    if (userId) {
      countConditions.push(sql`a.user_id = ${userId}`);
    }

    if (countConditions.length > 0) {
      countQuery = sql`${countQuery} AND ${sql.join(countConditions, sql` AND `)}`;
    }

    const countResult = await db.execute(countQuery);
    const totalItems = parseInt(countResult.rows[0]?.total || '0');

    // Data query
    let dataQuery = sql`
      SELECT 
        a.id, a.contact_id, a.scheduled_date, a.status, a.duration_minutes,
        a.appointment_type, a.user_id, a.doctor_name,
        c.name as contact_name, c.phone as contact_phone
      FROM appointments a
      LEFT JOIN contacts c ON a.contact_id = c.id
      WHERE a.clinic_id = ${clinicId}
    `;

    if (countConditions.length > 0) {
      dataQuery = sql`${dataQuery} AND ${sql.join(countConditions, sql` AND `)}`;
    }

    dataQuery = sql`
      ${dataQuery}
      ORDER BY a.scheduled_date ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const dataResult = await db.execute(dataQuery);
    const pagination_meta = calculatePagination(page, limit, totalItems);

    const result: PaginatedResponse<any> = {
      data: dataResult.rows,
      pagination: pagination_meta
    };
    
    this.setCache(cacheKey, result, this.DEFAULT_TTL);
    return result;
  }

  /**
   * Legacy: Busca otimizada de consultas com agregações
   */
  async getAppointmentsOptimized(clinicId: number, filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    userId?: number;
  }): Promise<any[]> {
    const cacheKey = this.getCacheKey('appointments', { clinicId, ...filters });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const { startDate, endDate, status, userId } = filters || {};
    
    let query = sql`
      SELECT 
        a.id, a.contact_id, a.scheduled_date, a.status, a.duration,
        a.service_type, a.notes, a.user_id,
        c.name as contact_name, c.phone as contact_phone
      FROM appointments a
      LEFT JOIN contacts c ON a.contact_id = c.id
      WHERE a.clinic_id = ${clinicId}
    `;

    const conditions = [];
    
    if (startDate) {
      conditions.push(sql`a.scheduled_date >= ${startDate}`);
    }
    
    if (endDate) {
      conditions.push(sql`a.scheduled_date <= ${endDate}`);
    }
    
    if (status && status !== 'all') {
      conditions.push(sql`a.status = ${status}`);
    }
    
    if (userId) {
      conditions.push(sql`a.user_id = ${userId}`);
    }

    if (conditions.length > 0) {
      query = sql`${query} AND ${sql.join(conditions, sql` AND `)}`;
    }

    query = sql`
      ${query}
      ORDER BY a.scheduled_date ASC
    `;

    const result = await db.execute(query);
    this.setCache(cacheKey, result.rows, this.DEFAULT_TTL);
    
    return result.rows;
  }

  /**
   * Busca de estatísticas do dashboard com cache longo
   */
  async getDashboardStats(clinicId: number): Promise<any> {
    const cacheKey = this.getCacheKey('dashboard_stats', { clinicId });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const statsQuery = sql`
      SELECT 
        (SELECT COUNT(*) FROM contacts WHERE clinic_id = ${clinicId}) as total_contacts,
        (SELECT COUNT(*) FROM contacts WHERE clinic_id = ${clinicId} AND status = 'novo') as new_contacts,
        (SELECT COUNT(*) FROM appointments WHERE clinic_id = ${clinicId} AND scheduled_date >= CURRENT_DATE) as upcoming_appointments,
        (SELECT COUNT(*) FROM appointments WHERE clinic_id = ${clinicId} AND status = 'agendado' AND scheduled_date >= CURRENT_DATE) as scheduled_appointments,
        (SELECT COUNT(*) FROM conversations WHERE clinic_id = ${clinicId} AND status = 'ativa') as active_conversations
    `;

    const result = await db.execute(statsQuery);
    const stats = result.rows[0];
    
    // Cache por mais tempo pois estatísticas mudam menos frequentemente
    this.setCache(cacheKey, stats, this.LONG_TTL);
    
    return stats;
  }

  /**
   * Invalidação de cache baseada em operações
   */
  invalidateCache(operation: string, clinicId?: number): void {
    for (const [key] of this.cache) {
      if (key.includes(operation)) {
        if (!clinicId || key.includes(`"clinicId":${clinicId}`)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Invalidação completa do cache de uma clínica
   */
  invalidateClinicCache(clinicId: number): void {
    for (const [key] of this.cache) {
      if (key.includes(`"clinicId":${clinicId}`) || key.includes(`clinic_id":${clinicId}`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Aplicação de índices otimizados
   */
  async applyOptimizedIndexes(): Promise<void> {
    console.log('🚀 Aplicando índices otimizados...');
    
    const indexes = [
      // Índices para contatos
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_clinic_search 
          ON contacts USING gin(to_tsvector('portuguese', name || ' ' || COALESCE(phone, '') || ' ' || COALESCE(email, '')))`,
      
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_clinic_status_interaction 
          ON contacts (clinic_id, status, last_interaction DESC) WHERE clinic_id IS NOT NULL`,
      
      // Índices para consultas
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_clinic_date_status 
          ON appointments (clinic_id, scheduled_date, status) WHERE clinic_id IS NOT NULL`,
      
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_user_date 
          ON appointments (user_id, scheduled_date) WHERE user_id IS NOT NULL`,
      
      // Índices para conversas
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_clinic_status_updated 
          ON conversations (clinic_id, status, updated_at DESC) WHERE clinic_id IS NOT NULL`,
      
      // Índices compostos para joins frequentes
      sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_contact_clinic 
          ON appointments (contact_id, clinic_id) WHERE contact_id IS NOT NULL`,
    ];

    for (const indexSql of indexes) {
      try {
        await db.execute(indexSql);
        console.log('✅ Índice criado com sucesso');
      } catch (error) {
        console.log('ℹ️ Índice já existe ou erro:', error.message);
      }
    }
  }

  /**
   * Limpeza de cache expirado
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Estatísticas do cache
   */
  getCacheStats(): any {
    return {
      totalEntries: this.cache.size,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
      hits: this.cacheHits,
      misses: this.cacheMisses
    };
  }

  private cacheHits = 0;
  private cacheMisses = 0;
}

// Instância singleton
export const performanceOptimizer = new PerformanceOptimizer();

// Limpeza automática de cache a cada 10 minutos
setInterval(() => {
  performanceOptimizer.cleanExpiredCache();
}, 10 * 60 * 1000);