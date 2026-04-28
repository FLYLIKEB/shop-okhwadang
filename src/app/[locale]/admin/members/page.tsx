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

const ROLE_FILTERS = [
  { label: '전체', value: '' },
  { label: '일반회원', value: 'user' },
  { label: '관리자', value: 'admin' },
  { label: '최고관리자', value: 'super_admin' },
] as const;

const STATUS_FILTERS = [
  { label: '전체', value: '' },
  { label: '활성', value: 'true' },
  { label: '비활성', value: 'false' },
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
    { errorMessage: '회원 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) void fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, filters.role, filters.status, keyword]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
      <AdminPageHeader title="회원 관리" />

      <AdminFilterChips
        items={ROLE_FILTERS}
        value={filters.role}
        onToggle={(value) => setFilter('role', value)}
        ariaLabel="회원 역할 필터"
        size="sm"
      />

      <div className="flex flex-wrap items-end gap-4">
        <AdminSearchForm
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={submitSearch}
          placeholder="이메일, 이름 검색"
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">상태:</span>
          <AdminFilterChips
            items={STATUS_FILTERS}
            value={filters.status}
            onToggle={(value) => setFilter('status', value)}
            ariaLabel="회원 상태 필터"
            size="sm"
          />
        </div>
      </div>

      <PaginatedAdminTableShell
        loading={loading}
        loadingMessage="불러오는 중..."
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
