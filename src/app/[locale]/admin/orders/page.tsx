'use client';

import { useEffect, useState } from 'react';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';
import { adminOrdersApi } from '@/lib/api';
import type { AdminOrder } from '@/lib/api';
import { AdminOrdersTable } from '@/components/shared/admin/AdminOrdersTable';
import { ShippingModal } from '@/components/shared/admin/ShippingModal';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { AdminSearchForm } from '@/components/shared/admin/AdminSearchForm';
import { PaginatedAdminTableShell } from '@/components/shared/admin/PaginatedAdminTableShell';

const STATUS_FILTERS = [
  { label: '전체', value: '' },
  { label: '결제대기', value: 'pending' },
  { label: '결제완료', value: 'paid' },
  { label: '상품준비중', value: 'preparing' },
  { label: '배송중', value: 'shipped' },
  { label: '배송완료', value: 'delivered' },
  { label: '주문취소', value: 'cancelled' },
  { label: '환불완료', value: 'refunded' },
] as const;

const PAGE_SIZE = 20;

export default function AdminOrdersPage() {
  const { isAdmin } = useAdminGuard();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [shippingOrder, setShippingOrder] = useState<AdminOrder | null>(null);
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
      status: '',
      startDate: '',
      endDate: '',
    },
  });

  const { execute: fetchOrders, isLoading: loading } = useAsyncAction(
    async () => {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
      };
      if (filters.status) params.status = filters.status;
      if (keyword) params.keyword = keyword;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await adminOrdersApi.getList(params);
      setOrders(res.items);
      setTotal(res.total);
    },
    { errorMessage: '주문 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) void fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, filters.status, filters.startDate, filters.endDate, keyword]);

  const handleShippingSuccess = () => {
    setShippingOrder(null);
    void fetchOrders();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
      <AdminPageHeader title="주문 관리" />

      <AdminFilterChips
        items={STATUS_FILTERS}
        value={filters.status}
        onToggle={(value) => setFilter('status', value)}
        ariaLabel="주문 상태 필터"
        size="sm"
      />

      <div className="flex flex-wrap items-end gap-4">
        <AdminSearchForm
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={submitSearch}
          placeholder="주문번호, 수령인, 이메일 검색"
        />

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilter('startDate', event.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilter('endDate', event.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
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
        <AdminOrdersTable
          orders={orders}
          onStatusChange={() => void fetchOrders()}
          onShippingRegister={(order) => setShippingOrder(order)}
        />
      </PaginatedAdminTableShell>

      {shippingOrder && (
        <ShippingModal
          orderId={shippingOrder.id}
          orderNumber={shippingOrder.orderNumber}
          onClose={() => setShippingOrder(null)}
          onSuccess={handleShippingSuccess}
        />
      )}
    </div>
  );
}
