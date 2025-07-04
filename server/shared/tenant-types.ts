/**
 * Types for tenant isolation system
 */

export interface TenantContext {
  clinicId: number;
  userId: string;
  userRole: string;
  isAuthenticated: boolean;
}

export interface TenantRequest extends Request {
  tenantContext?: TenantContext;
  user?: {
    id: string | number;
    email: string;
    name: string;
    role: string;
    clinic_id?: number;
  };
}

export interface TenantFilter {
  clinic_id: number;
}

export interface WithTenantFilter<T = any> {
  where?: T & Partial<TenantFilter>;
}

export interface TenantIsolationOptions {
  skipTenantFilter?: boolean;
  allowCrossClinic?: boolean;
}

export type TenantAwareMethod<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => ReturnType<T>;