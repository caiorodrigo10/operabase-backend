import { PaginationMeta } from "@/hooks/usePagination";

interface PaginationInfoProps {
  pagination: PaginationMeta | null;
  isLoading?: boolean;
}

export function PaginationInfo({ pagination, isLoading }: PaginationInfoProps) {
  if (isLoading) {
    return (
      <div className="text-sm text-gray-500">
        Carregando...
      </div>
    );
  }

  if (!pagination || pagination.totalItems === 0) {
    return (
      <div className="text-sm text-gray-500">
        Nenhum resultado encontrado
      </div>
    );
  }

  const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
  const end = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);

  return (
    <div className="text-sm text-gray-600 dark:text-gray-400">
      Mostrando {start} - {end} de {pagination.totalItems} resultados
    </div>
  );
}