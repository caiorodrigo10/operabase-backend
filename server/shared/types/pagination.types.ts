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
  cacheTime?: number;
}

export const PAGINATION_DEFAULTS = {
  itemsPerPage: 25,
  maxItemsPerPage: 100,
  availablePageSizes: [10, 25, 50, 100],
  showPaginationInfo: true,
  showItemsPerPageSelector: true
};

export function calculatePagination(
  page: number = 1,
  limit: number = PAGINATION_DEFAULTS.itemsPerPage,
  totalItems: number
): PaginationMeta {
  const currentPage = Math.max(1, page);
  const itemsPerPage = Math.min(limit, PAGINATION_DEFAULTS.maxItemsPerPage);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}

export function getPaginationOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}