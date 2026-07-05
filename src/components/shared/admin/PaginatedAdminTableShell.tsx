import type { ReactNode } from 'react';
import AdminPagination from './AdminPagination';
import { AdminEmptyState, AdminLoadingState } from './AdminStates';

interface PaginatedAdminTableShellProps {
  loading: boolean;
  loadingMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
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
  emptyAction,
  currentPage,
  totalPages,
  onPageChange,
  children,
}: PaginatedAdminTableShellProps) {
  return (
    <>
      {loading ? (
        <AdminLoadingState title={loadingMessage} />
      ) : isEmpty ? (
        <AdminEmptyState title={emptyMessage} action={emptyAction} />
      ) : (
        children
      )}

      {!loading && (
        <AdminPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </>
  );
}
