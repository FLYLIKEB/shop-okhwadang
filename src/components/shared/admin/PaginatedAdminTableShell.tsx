import { localMessage } from '@/utils/localMessages';
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
  loadingMessage = localMessage('common.loading2'),
  isEmpty = false,
  emptyMessage = localMessage('adminEnglish.noDataAvailable'),
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
  const resolvedErrorMessage = errorMessage ?? localMessage('adminEnglish.unableToLoadData');

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
