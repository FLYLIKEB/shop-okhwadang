'use client';

import { useEffect, useState } from 'react';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';
import { adminOrdersApi } from '@/lib/api';
import type { AdminOrder, OrderServiceRequest, OrderServiceRequestStatus } from '@/lib/api';
import { AdminOrdersTable } from '@/components/shared/admin/AdminOrdersTable';
import { ShippingModal } from '@/components/shared/admin/ShippingModal';
import { CancelOrderModal } from '@/components/shared/admin/CancelOrderModal';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { AdminSearchForm } from '@/components/shared/admin/AdminSearchForm';
import { PaginatedAdminTableShell } from '@/components/shared/admin/PaginatedAdminTableShell';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/utils/date';

const STATUS_FILTERS = [
  { label: '전체', value: '' },
  { label: '결제대기', value: 'pending' },
  { label: '결제완료', value: 'paid' },
  { label: '상품준비중', value: 'preparing' },
  { label: '배송중', value: 'shipped' },
  { label: '배송완료', value: 'delivered' },
  { label: '구매확정', value: 'completed' },
  { label: '취소됨', value: 'cancelled' },
  { label: '환불요청', value: 'refund_requested' },
  { label: '환불완료', value: 'refunded' },
] as const;

const PAGE_SIZE = 20;

export default function AdminOrdersPage() {
  const { isAdmin } = useAdminGuard();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [shippingOrder, setShippingOrder] = useState<AdminOrder | null>(null);
  const [cancelOrder, setCancelOrder] = useState<AdminOrder | null>(null);
  const [serviceRequests, setServiceRequests] = useState<OrderServiceRequest[]>([]);
  const [loadError, setLoadError] = useState(false);
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
      status: '',
      startDate: '',
      endDate: '',
    },
  });

  const { execute: fetchOrders, isLoading: loading } = useAsyncAction(
    async () => {
      setLoadError(false);
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
      };
      if (filters.status) params.status = filters.status;
      if (keyword) params.keyword = keyword;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [res, requestRes] = await Promise.all([
        adminOrdersApi.getList(params),
        adminOrdersApi.getServiceRequests({ status: 'requested', limit: 10 }),
      ]);
      setOrders(res.items);
      setTotal(res.total);
      setServiceRequests(requestRes.items);
    },
    { errorMessage: '주문 목록을 불러오지 못했습니다.', onError: () => setLoadError(true) },
  );

  useEffect(() => {
    if (isAdmin) void fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, filters.status, filters.startDate, filters.endDate, keyword]);

  const handleShippingSuccess = () => {
    setShippingOrder(null);
    void fetchOrders();
  };

  const handleCancelSuccess = () => {
    setCancelOrder(null);
    void fetchOrders();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleRequestStatus = async (id: number, status: OrderServiceRequestStatus) => {
    await adminOrdersApi.updateServiceRequest(id, { status });
    await fetchOrders();
  };

  const requestTypeLabels = { cancel: '취소', return: '반품', exchange: '교환', refund: '환불' };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
      <AdminPageHeader title="주문 관리" titleClassName="typo-h1" />

      <div className="flex flex-wrap items-center gap-2">
        <AdminFilterChips
          items={STATUS_FILTERS}
          value={filters.status}
          onToggle={(value) => setFilter('status', value)}
          ariaLabel="주문 상태 필터"
          size="sm"
        />
        {hasActiveFilters && (
          <Button type="button" onClick={resetFilters} variant="outline" size="sm" className="typo-button">
            {localMessage('admin.common.resetFilters')}
          </Button>
        )}
      </div>


      {serviceRequests.length > 0 && (
        <section className="surface-card p-4">
          <h2 className="mb-3 typo-body font-semibold">처리 대기 신청</h2>
          <ul className="divide-soft">
            {serviceRequests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3 typo-body-sm">
                <div>
                  <p className="typo-body-sm font-medium">
                    #{request.orderId} {request.order?.orderNumber} · {requestTypeLabels[request.type]} · {request.reason}
                  </p>
                  <p className="typo-label text-muted-foreground">{request.userId} · {formatDateTime(request.createdAt, 'ko')}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleRequestStatus(request.id, 'approved')}
                    variant="outline"
                    size="sm"
                    className="typo-button"
                  >
                    승인
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleRequestStatus(request.id, 'rejected')}
                    variant="outline"
                    size="sm"
                    className="typo-button"
                  >
                    반려
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleRequestStatus(request.id, 'completed')}
                    variant="black"
                    size="sm"
                    className="typo-button"
                  >
                    처리 완료
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
            className="field-soft rounded-lg typo-body-sm"
          />
          <span className="typo-label text-muted-foreground">~</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilter('endDate', event.target.value)}
            className="field-soft rounded-lg typo-body-sm"
          />
        </div>
      </div>

      <PaginatedAdminTableShell
        loading={loading}
        error={loadError}
        errorMessage={loadError ? '주문 목록을 불러오지 못했습니다.' : undefined}
        errorAction={
          <Button type="button" onClick={() => void fetchOrders()} variant="outline" size="sm">
            {localMessage('ui.retry')}
          </Button>
        }
        isEmpty={orders.length === 0}
        emptyMessage="주문이 없습니다."
        loadingMessage="불러오는 중..."
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        <AdminOrdersTable
          orders={orders}
          onStatusChange={() => void fetchOrders()}
          onShippingRegister={(order) => setShippingOrder(order)}
          onCancelOrder={(order) => setCancelOrder(order)}
        />
      </PaginatedAdminTableShell>

      {cancelOrder && (
        <CancelOrderModal
          orderId={cancelOrder.id}
          orderNumber={cancelOrder.orderNumber}
          onClose={() => setCancelOrder(null)}
          onSuccess={handleCancelSuccess}
        />
      )}

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
