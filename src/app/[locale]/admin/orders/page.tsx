'use client';

import { useEffect, useState } from 'react';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { adminOrdersApi } from '@/lib/api';
import type { AdminOrder } from '@/lib/api';
import { AdminOrdersTable } from '@/components/admin/AdminOrdersTable';
import { ShippingModal } from '@/components/admin/ShippingModal';

const STATUS_FILTERS = [
  { label: '전체', value: '' },
  { label: '결제대기', value: 'pending' },
  { label: '결제완료', value: 'paid' },
  { label: '상품준비중', value: 'preparing' },
  { label: '배송중', value: 'shipped' },
  { label: '배송완료', value: 'delivered' },
  { label: '주문취소', value: 'cancelled' },
  { label: '환불완료', value: 'refunded' },
];

const PAGE_SIZE = 20;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shippingOrder, setShippingOrder] = useState<AdminOrder | null>(null);

  const { execute: fetchOrders, isLoading: loading } = useAsyncAction(
    async () => {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
      };
      if (statusFilter) params.status = statusFilter;
      if (keyword) params.keyword = keyword;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await adminOrdersApi.getList(params);
      setOrders(res.items);
      setTotal(res.total);
    },
    { errorMessage: '주문 목록을 불러오지 못했습니다.' },
  );

  useEffect(() => {
    void fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, keyword, startDate, endDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput);
    setPage(1);
  };

  const handleShippingSuccess = () => {
    setShippingOrder(null);
    void fetchOrders();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">주문 관리</h1>

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap gap-2">
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

      {/* 검색 & 날짜 필터 */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="주문번호, 수령인, 이메일 검색"
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
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* 테이블 */}
      {loading ? (
        <p className="py-8 text-center text-muted-foreground">불러오는 중...</p>
      ) : (
        <AdminOrdersTable
          orders={orders}
          onStatusChange={() => void fetchOrders()}
          onShippingRegister={(order) => setShippingOrder(order)}
        />
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded px-3 py-1 text-sm ${
                page === p ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* 운송장 등록 모달 */}
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
