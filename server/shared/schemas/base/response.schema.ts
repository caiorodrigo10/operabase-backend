import { z } from 'zod';

/**
 * Standardized response schemas for consistent API responses
 * All API endpoints should use these response patterns
 */

// Base response wrapper
export const baseResponseSchema = z.object({
  success: z.boolean().default(true),
  message: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

// Success response with data
export const successResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => 
  baseResponseSchema.extend({
    data: dataSchema,
    success: z.literal(true),
  });

// Error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
    code: z.string().optional(),
  })).optional(),
  timestamp: z.string().datetime().optional(),
});

// Paginated response schema
export const paginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const paginatedResponseSchema = <T>(itemSchema: z.ZodSchema<T>) =>
  baseResponseSchema.extend({
    data: z.array(itemSchema),
    pagination: paginationSchema,
    success: z.literal(true),
  });

// List response without pagination
export const listResponseSchema = <T>(itemSchema: z.ZodSchema<T>) =>
  successResponseSchema(z.array(itemSchema));

// Single item response
export const itemResponseSchema = <T>(itemSchema: z.ZodSchema<T>) =>
  successResponseSchema(itemSchema);

// Health check response
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'warning', 'error']),
  timestamp: z.string().datetime(),
  version: z.string().optional(),
  uptime: z.number().optional(),
  cache: z.object({
    status: z.enum(['connected', 'disconnected', 'error']),
    responseTime: z.number().optional(),
  }).optional(),
  performance: z.object({
    healthy: z.boolean(),
    avgResponseTime: z.number().optional(),
  }).optional(),
});

// Metrics response
export const metricsResponseSchema = z.object({
  timestamp: z.string().datetime(),
  performance: z.object({
    avgResponseTime: z.number(),
    requestCount: z.number(),
    errorRate: z.number(),
  }),
  cache: z.object({
    hitRate: z.number(),
    missCount: z.number(),
    hitCount: z.number(),
  }),
  database: z.object({
    activeConnections: z.number(),
    queryTime: z.number(),
  }).optional(),
});

// Authentication response
export const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
  }),
  token: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

// Validation error details
export const validationErrorSchema = z.object({
  code: z.string(),
  expected: z.string(),
  received: z.string(),
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
});

// Common response type inference
export type BaseResponse = z.infer<typeof baseResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type MetricsResponse = z.infer<typeof metricsResponseSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type ValidationError = z.infer<typeof validationErrorSchema>;