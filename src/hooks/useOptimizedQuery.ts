import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Hook otimizado para consultas com cache inteligente e stale time configurado
 */
export function useOptimizedQuery<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options?: {
    cacheTime?: number;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
    enabled?: boolean;
  }
) {
  const optimizedOptions: UseQueryOptions<T> = useMemo(() => ({
    queryKey,
    queryFn,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutos por padrão
    gcTime: options?.cacheTime ?? 10 * 60 * 1000, // 10 minutos por padrão
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    enabled: options?.enabled ?? true,
  }), [queryKey, queryFn, options]);

  return useQuery(optimizedOptions);
}

/**
 * Hook para consultas de contatos com otimizações específicas
 */
export function useOptimizedContacts(clinicId: number, filters?: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const queryKey = useMemo(() => [
    '/api/contacts/optimized',
    { clinic_id: clinicId, ...filters }
  ], [clinicId, filters]);

  return useOptimizedQuery(
    queryKey,
    async () => {
      const params = new URLSearchParams({
        clinic_id: clinicId.toString(),
        ...(filters?.search && { search: filters.search }),
        ...(filters?.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters?.limit && { limit: filters.limit.toString() }),
        ...(filters?.offset && { offset: filters.offset.toString() }),
      });

      const response = await fetch(`/api/contacts/optimized?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar contatos');
      return response.json();
    },
    {
      staleTime: filters?.search ? 30 * 1000 : 5 * 60 * 1000, // Cache menor para buscas
      enabled: !!clinicId,
    }
  );
}

/**
 * Hook para consultas de agendamentos com otimizações
 */
export function useOptimizedAppointments(clinicId: number, filters?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  userId?: number;
}) {
  const queryKey = useMemo(() => [
    '/api/appointments/optimized',
    { clinic_id: clinicId, ...filters }
  ], [clinicId, filters]);

  return useOptimizedQuery(
    queryKey,
    async () => {
      const params = new URLSearchParams({
        clinic_id: clinicId.toString(),
        ...(filters?.startDate && { start_date: filters.startDate }),
        ...(filters?.endDate && { end_date: filters.endDate }),
        ...(filters?.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters?.userId && { user_id: filters.userId.toString() }),
      });

      const response = await fetch(`/api/appointments/optimized?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar agendamentos');
      return response.json();
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutos para agendamentos
      enabled: !!clinicId,
    }
  );
}

/**
 * Hook para estatísticas do dashboard com cache longo
 */
export function useOptimizedDashboardStats(clinicId: number) {
  const queryKey = useMemo(() => [
    '/api/dashboard/stats',
    { clinic_id: clinicId }
  ], [clinicId]);

  return useOptimizedQuery(
    queryKey,
    async () => {
      const response = await fetch(`/api/dashboard/stats?clinic_id=${clinicId}`);
      if (!response.ok) throw new Error('Erro ao carregar estatísticas');
      return response.json();
    },
    {
      staleTime: 15 * 60 * 1000, // 15 minutos para estatísticas
      cacheTime: 30 * 60 * 1000, // 30 minutos no cache
      enabled: !!clinicId,
    }
  );
}