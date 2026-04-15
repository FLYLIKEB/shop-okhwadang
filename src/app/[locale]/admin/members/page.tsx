'use client';

import { useEffect, useState } from 'react';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { adminMembersApi } from '@/lib/api';
import type { AdminMember } from '@/lib/api';
import { AdminMembersTable } from '@/components/shared/admin/AdminMembersTable';
import AdminPagination from '@/components/shared/admin/AdminPagination';

const ROLE_FILTERS = [
  { label: '전체', value: '' },
  { label: '일반회원', value: 'user' },
  { label: '관리자', value: 'admin' },
  { label: '최고관리자', value: 'super_admin' },
];

const STATUS_FILTERS = [
  { label: '전체', value: '' },
  { label: '활성', value: 'true' },
  { label: '비활성', value: 'false' },
];

const PAGE_SIZE = 20;

export default function AdminMembersPage() {
  const { isAdmin } = useAdminGuard();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { execute: fetchMembers, isLoading: loading } = useAsyncAction(
    async () => {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
      };
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.is_active = statusFilter;
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
  }, [isAdmin, page, roleFilter, statusFilter, keyword]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">회원 관리</h1>

      {/* 역할 필터 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setRoleFilter(f.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-sm ${
              roleFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 검색 & 상태 필터 */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="이메일, 이름 검색"
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            검색
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">상태:</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-sm ${
                statusFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      {loading ? (
        <p className="py-8 text-center text-muted-foreground">불러오는 중...</p>
      ) : (
        <AdminMembersTable
          members={members}
          onRoleChange={() => void fetchMembers()}
        />
      )}

      {/* 페이지네이션 */}
      <AdminPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
