import type { ReactNode } from 'react';
import AdminPagination from './AdminPagination';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from './AdminStates';

interface PaginatedAdminTableShellProps {
  loading: boolean;
  loadingMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  error?: boolean;
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
  error = false,
  errorMessage,
  errorAction,
  currentPage,
  totalPages,
  onPageChange,
  children,
}: PaginatedAdminTableShellProps) {
  const hasError = error || Boolean(errorMessage);
  const resolvedErrorMessage = errorMessage ?? '데이터를 불러오지 못했습니다.';

  return (
    <>
      {loading ? (
        <AdminLoadingState title={loadingMessage} />
      ) : hasError ? (
        <AdminErrorState title={resolvedErrorMessage} action={errorAction} />
      ) : isEmpty ? (
        <AdminEmptyState title={emptyMessage} action={emptyAction} />
      ) : (
        children
      )}

      {!loading && !hasError && (
        <AdminPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </>
  );
}
