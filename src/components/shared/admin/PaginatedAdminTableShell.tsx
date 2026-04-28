import type { ReactNode } from 'react';
import AdminPagination from './AdminPagination';

interface PaginatedAdminTableShellProps {
  loading: boolean;
  loadingMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  children: ReactNode;
}

export function PaginatedAdminTableShell({
  loading,
  loadingMessage = '불러오는 중...',
  isEmpty = false,
  emptyMessage = '데이터가 없습니다.',
  currentPage,
  totalPages,
  onPageChange,
  children,
}: PaginatedAdminTableShellProps) {
  return (
    <>
      {loading ? (
        <p className="py-8 text-center text-muted-foreground">{loadingMessage}</p>
      ) : isEmpty ? (
        <p className="py-8 text-center text-muted-foreground">{emptyMessage}</p>
      ) : (
        children
      )}

      {!loading && (
        <AdminPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </>
  );
}
