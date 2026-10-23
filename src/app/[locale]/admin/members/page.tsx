'use client';

import { useEffect, useState } from 'react';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';
import { adminMembersApi } from '@/lib/api';
import type { AdminMember } from '@/lib/api';
import { AdminMembersTable } from '@/components/shared/admin/AdminMembersTable';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { AdminSearchForm } from '@/components/shared/admin/AdminSearchForm';
import { PaginatedAdminTableShell } from '@/components/shared/admin/PaginatedAdminTableShell';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';

const ROLE_FILTERS = [
  { label: localMessage('common.all'), value: '' },
  { label: localMessage('admin.members.roles.user'), value: 'user' },
  { label: localMessage('header.adminPanel'), value: 'admin' },
  { label: localMessage('admin.members.roles.super_admin'), value: 'super_admin' },
] as const;

const STATUS_FILTERS = [
  { label: localMessage('common.all'), value: '' },
  { label: localMessage('popups.active'), value: 'true' },
  { label: localMessage('popups.inactive'), value: 'false' },
] as const;

const PAGE_SIZE = 20;

export default function AdminMembersPage() {
  const { isAdmin } = useAdminGuard();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [total, setTotal] = useState(0);
  const {
    page,
    setPage,
    keyword,
    searchInput,
    setSearchInput,
    filters,
    setFilter,
    submitSearch,
    resetFilters,
    hasActiveFilters,
  } = useAdminListPage({
    initialFilters: {
      role: '',
      status: '',
    },
  });

  const { execute: fetchMembers, isLoading: loading } = useAsyncAction(
    async () => {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
      };

      if (filters.role) params.role = filters.role;
      if (filters.status) params.is_active = filters.status;
      if (keyword) params.q = keyword;

      const res = await adminMembersApi.getList(params);
      setMembers(res.items);
      setTotal(res.total);
    },
    { errorMessage: localMessage('admin.members.loadError') },
  );

  useEffect(() => {
    if (isAdmin) void fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, filters.role, filters.status, keyword]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
      <AdminPageHeader title={localMessage('admin.members.title')} titleClassName="typo-h1" />

      <div className="flex flex-wrap items-center gap-2">
        <AdminFilterChips
          items={ROLE_FILTERS}
          value={filters.role}
          onToggle={(value) => setFilter('role', value)}
          ariaLabel={localMessage('adminEnglish.filterMemberRole')}
          size="sm"
        />
        {hasActiveFilters && (
          <Button type="button" onClick={resetFilters} variant="outline" size="sm" className="typo-button">
            {localMessage('admin.common.resetFilters')}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <AdminSearchForm
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={submitSearch}
          placeholder={localMessage('admin.members.searchPlaceholder')}
        />

        <div className="flex items-center gap-2">
          <span className="typo-label text-muted-foreground">{localMessage('admin.members.statusLabel')}</span>
          <AdminFilterChips
            items={STATUS_FILTERS}
            value={filters.status}
            onToggle={(value) => setFilter('status', value)}
            ariaLabel={localMessage('adminEnglish.filterMemberStatus')}
            size="sm"
          />
        </div>
      </div>

      <PaginatedAdminTableShell
        loading={loading}
        loadingMessage={localMessage('common.loading2')}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        <AdminMembersTable
          members={members}
          onRoleChange={() => void fetchMembers()}
        />
      </PaginatedAdminTableShell>
    </div>
  );
}
