import { useState, useMemo, useCallback } from 'react';
import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface UsePaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
  staleTime?: number;
  enabled?: boolean;
}

export interface UsePaginationResult<T> extends UseQueryResult<PaginatedResponse<T>> {
  pagination: PaginationMeta | null;
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setItemsPerPage: (limit: number) => void;
  isFirstPage: boolean;
  isLastPage: boolean;
}

export function usePagination<T>(
  queryKey: any[],
  queryFn: (params: PaginationParams & any) => Promise<PaginatedResponse<T>>,
  additionalParams: any = {},
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const {
    defaultPage = 1,
    defaultLimit = 25,
    maxLimit = 100,
    staleTime = 5 * 60 * 1000,
    enabled = true
  } = options;

  const [currentPage, setCurrentPage] = useState(defaultPage);
  const [itemsPerPage, setItemsPerPageState] = useState(defaultLimit);

  // Memoized query key with pagination params
  const paginatedQueryKey = useMemo(() => [
    ...queryKey,
    { page: currentPage, limit: itemsPerPage, ...additionalParams }
  ], [queryKey, currentPage, itemsPerPage, additionalParams]);

  // Query with pagination
  const queryResult = useQuery({
    queryKey: paginatedQueryKey,
    queryFn: () => queryFn({ 
      page: currentPage, 
      limit: itemsPerPage, 
      ...additionalParams 
    }),
    staleTime,
    enabled,
    refetchOnWindowFocus: false,
  });

  const pagination = queryResult.data?.pagination || null;

  // Navigation functions
  const goToPage = useCallback((page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  }, [pagination]);

  const nextPage = useCallback(() => {
    if (pagination?.hasNext) {
      setCurrentPage(prev => prev + 1);
    }
  }, [pagination]);

  const prevPage = useCallback(() => {
    if (pagination?.hasPrev) {
      setCurrentPage(prev => prev - 1);
    }
  }, [pagination]);

  const setItemsPerPage = useCallback((limit: number) => {
    const newLimit = Math.min(limit, maxLimit);
    setItemsPerPageState(newLimit);
    setCurrentPage(1); // Reset to first page when changing page size
  }, [maxLimit]);

  return {
    ...queryResult,
    pagination,
    currentPage,
    itemsPerPage,
    totalItems: pagination?.totalItems || 0,
    totalPages: pagination?.totalPages || 0,
    hasNext: pagination?.hasNext || false,
    hasPrev: pagination?.hasPrev || false,
    goToPage,
    nextPage,
    prevPage,
    setItemsPerPage,
    isFirstPage: currentPage === 1,
    isLastPage: !pagination?.hasNext
  };
}