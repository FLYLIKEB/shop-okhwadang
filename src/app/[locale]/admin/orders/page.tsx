'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { useAdminListPage } from '@/components/shared/hooks/useAdminListPage';
import { adminOrdersApi } from '@/lib/api';
import type { AdminOrder, OrderServiceRequest, OrderServiceRequestStatus } from '@/lib/api';
import { AdminOrdersTable } from '@/components/shared/admin/AdminOrdersTable';
import { ShippingModal } from '@/components/shared/admin/ShippingModal';
import { CancelOrderModal } from '@/components/shared/admin/CancelOrderModal';
import { MessageDeliveriesDialog } from '@/components/shared/admin/MessageDeliveriesDialog';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import AdminPagination from '@/components/shared/admin/AdminPagination';
import { AdminFilterChips } from '@/components/shared/admin/AdminFilterChips';
import { AdminSearchForm } from '@/components/shared/admin/AdminSearchForm';
import { PaginatedAdminTableShell } from '@/components/shared/admin/PaginatedAdminTableShell';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/utils/date';

const STATUS_FILTERS = [
  { label: localMessage('common.all'), value: '' },
  { label: localMessage('order.status.pending'), value: 'pending' },
  { label: localMessage('order.status.paid'), value: 'paid' },
  { label: localMessage('order.status.preparing'), value: 'preparing' },
  { label: localMessage('order.status.shipped'), value: 'shipped' },
  { label: localMessage('order.status.delivered'), value: 'delivered' },
  { label: localMessage('admin.orders.statusFilter.completed'), value: 'completed' },
  { label: localMessage('order.status.cancelled'), value: 'cancelled' },
  { label: localMessage('order.status.refund_requested'), value: 'refund_requested' },
  { label: localMessage('order.status.refunded'), value: 'refunded' },
] as const;

const PAGE_SIZE = 20;

export default function AdminOrdersPage() {
  const t = useTranslations('admin.orders');
  const { isAdmin } = useAdminGuard();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [shippingOrder, setShippingOrder] = useState<AdminOrder | null>(null);
  const [cancelOrder, setCancelOrder] = useState<AdminOrder | null>(null);
  const [messageOrder, setMessageOrder] = useState<AdminOrder | null>(null);
  const [serviceRequests, setServiceRequests] = useState<OrderServiceRequest[]>([]);
  const [requestStatus, setRequestStatus] = useState<'requested' | 'approved'>('requested');
  const [requestPage, setRequestPage] = useState(1);
  const [requestTotal, setRequestTotal] = useState(0);
  const requestLoadId = useRef(0);
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
      isPreOrder: '',
      startDate: '',
      endDate: '',
    },
  });

  const { execute: fetchOrders, isLoading: loading } = useAsyncAction(
    async () => {
      setLoadError(false);
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        limit: PAGE_SIZE,
      };
      if (filters.status) params.status = filters.status;
      if (filters.isPreOrder) params.isPreOrder = filters.isPreOrder === 'true';
      if (keyword) params.keyword = keyword;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await adminOrdersApi.getList(params);
      setOrders(res.items);
      setTotal(res.total);
    },
    { errorMessage: t('loadError'), onError: () => setLoadError(true) },
  );

  const { execute: fetchRequests, isLoading: requestsLoading } = useAsyncAction(
    async () => {
      const loadId = ++requestLoadId.current;
      const res = await adminOrdersApi.getServiceRequests({ status: requestStatus, page: requestPage, limit: 10 });
      if (loadId !== requestLoadId.current) return;
      if (res.items.length === 0 && requestPage > 1) {
        setRequestPage(requestPage - 1);
        return;
      }
      setServiceRequests(res.items);
      setRequestTotal(res.total);
    },
    { errorMessage: t('loadError') },
  );

  useEffect(() => {
    if (isAdmin) void fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, requestStatus, requestPage]);

  const { execute: handleRequestStatus, isLoading: requestUpdating } = useAsyncAction(
    async ({ id, status }: { id: number; status: OrderServiceRequestStatus }) => {
      await adminOrdersApi.updateServiceRequest(id, { status });
      if (status === 'approved' && requestStatus !== 'approved') {
        setServiceRequests([]);
        setRequestPage(1);
        setRequestStatus('approved');
      } else {
        await fetchRequests();
      }
      await fetchOrders();
    },
    { successMessage: t('requestUpdated'), errorMessage: t('requestUpdateError') },
  );

  useEffect(() => {
    if (isAdmin) void fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, filters.status, filters.startDate, filters.endDate, filters.isPreOrder, keyword]);

  const handleShippingSuccess = () => {
    setShippingOrder(null);
    void fetchOrders();
  };

  const handleCancelSuccess = () => {
    setCancelOrder(null);
    void fetchOrders();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
      <AdminPageHeader title={localMessage('admin.orders.title')} titleClassName="typo-h1" />

      <div className="flex flex-wrap items-center gap-2">
        <AdminFilterChips
          items={STATUS_FILTERS}
          value={filters.status}
          onToggle={(value) => setFilter('status', value)}
          ariaLabel={localMessage('adminEnglish.filterOrderStatus')}
          size="sm"
        />
        <AdminFilterChips
          items={[
            { label: t('purchaseTypeAll'), value: '' },
            { label: t('purchaseTypePreOrder'), value: 'true' },
            { label: t('purchaseTypeRegular'), value: 'false' },
          ]}
          value={filters.isPreOrder}
          onToggle={(value) => setFilter('isPreOrder', value)}
          ariaLabel={t('purchaseTypeFilter')}
          size="sm"
        />
        {hasActiveFilters && (
          <Button type="button" onClick={resetFilters} variant="outline" size="sm" className="typo-button">
            {localMessage('admin.common.resetFilters')}
          </Button>
        )}
      </div>


        <section className="surface-card p-4" aria-busy={requestsLoading || requestUpdating}>
          <h2 className="mb-3 typo-body font-semibold">{t('serviceRequestsTitle')}</h2>
          <select
            aria-label={t('requestStatusLabel')}
            value={requestStatus}
            disabled={requestUpdating}
            onChange={(event) => {
              requestLoadId.current += 1;
              setServiceRequests([]);
              setRequestPage(1);
              setRequestStatus(event.target.value as 'requested' | 'approved');
            }}
            className="field-soft rounded-lg typo-body-sm"
          >
            <option value="requested">{t('requestStatus.requested')}</option>
            <option value="approved">{t('requestStatus.approved')}</option>
          </select>
          <ul className="divide-soft">
            {serviceRequests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3 typo-body-sm">
                <div>
                  <p className="typo-body-sm font-medium">
                    #{request.orderId} {request.order?.orderNumber} · {t(`requestType.${request.type}`)} · {request.reason}
                  </p>
                  <p className="typo-label text-muted-foreground">{request.userId} · {formatDateTime(request.createdAt, 'ko')}</p>
                </div>
                <div className="flex gap-2">
                  {request.status === 'requested' && <Button
                    type="button"
                    disabled={requestUpdating || requestsLoading}
                    onClick={() => void handleRequestStatus({ id: request.id, status: 'approved' })}
                    variant="outline"
                    size="sm"
                    className="typo-button"
                  >
                    {t('approveRequest')}
                  </Button>}
                  <Button
                    type="button"
                    disabled={requestUpdating || requestsLoading}
                    onClick={() => void handleRequestStatus({ id: request.id, status: 'rejected' })}
                    variant="outline"
                    size="sm"
                    className="typo-button"
                  >
                    {t('rejectRequest')}
                  </Button>
                  <Button
                    type="button"
                    disabled={requestUpdating || requestsLoading}
                    onClick={() => void handleRequestStatus({ id: request.id, status: 'completed' })}
                    variant="black"
                    size="sm"
                    className="typo-button"
                  >
                    {t('completeRequest')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <AdminPagination
            currentPage={requestPage}
            totalPages={Math.ceil(requestTotal / 10)}
            onPageChange={setRequestPage}
          />
        </section>

      <div className="flex flex-wrap items-end gap-4">
        <AdminSearchForm
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={submitSearch}
          placeholder={localMessage('admin.orders.searchPlaceholder')}
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
        errorMessage={loadError ? t('loadError') : undefined}
        errorAction={
          <Button type="button" onClick={() => void fetchOrders()} variant="outline" size="sm">
            {t('retry')}
          </Button>
        }
        isEmpty={orders.length === 0}
        emptyMessage={t('noOrders')}
        loadingMessage={t('loading')}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        <AdminOrdersTable
          orders={orders}
          onStatusChange={() => void fetchOrders()}
          onShippingRegister={(order) => setShippingOrder(order)}
          onCancelOrder={(order) => setCancelOrder(order)}
          onMessageDeliveries={(order) => setMessageOrder(order)}
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

      {messageOrder && (
        <MessageDeliveriesDialog
          orderId={messageOrder.id}
          orderNumber={messageOrder.orderNumber}
          onClose={() => setMessageOrder(null)}
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
