import type { ReactNode } from 'react';
import AdminPagination from './AdminPagination';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from './AdminStates';

interface PaginatedAdminTableShellProps {
  loading: boolean;
  loadingMessage?: string;
  error?: boolean;
  errorMessage?: string;
  errorAction?: ReactNode;
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
  error = false,
  errorMessage = 'Failed to load data.',
  errorAction,
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
      ) : error ? (
        <AdminErrorState title={errorMessage} action={errorAction} />
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
