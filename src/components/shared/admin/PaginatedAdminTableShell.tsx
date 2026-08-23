import type { ReactNode } from 'react';
import AdminPagination from './AdminPagination';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from './AdminStates';

interface PaginatedAdminTableShellProps {
  loading: boolean;
  loadingMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  errorMessage?: string | null;
  errorAction?: ReactNode;
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
  errorMessage,
  errorAction,
  currentPage,
  totalPages,
  onPageChange,
  children,
}: PaginatedAdminTableShellProps) {
  return (
    <>
      {loading ? (
        <AdminLoadingState title={loadingMessage} />
      ) : errorMessage ? (
        <AdminErrorState title={errorMessage} action={errorAction} />
      ) : isEmpty ? (
        <AdminEmptyState title={emptyMessage} action={emptyAction} />
      ) : (
        children
      )}

      {!loading && !errorMessage && (
        <AdminPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </>
  );
}
