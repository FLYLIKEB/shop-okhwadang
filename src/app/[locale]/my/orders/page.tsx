'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ordersApi } from '@/lib/api';
import type { OrderResponse } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { handleApiError } from '@/utils/error';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import StatusBadge from '@/components/common/StatusBadge';
import { SkeletonBox } from '@/components/ui/Skeleton';

const PAGE_LIMIT = 10;

export default function OrdersPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { execute: fetchOrders, isLoading: loading } = useAsyncAction(
    async () => {
      setError(null);
      const res = await ordersApi.getList({ page, limit: PAGE_LIMIT });
      setOrders(res.items);
      setTotal(res.total);
    },
    {
      errorMessage: '주문 내역을 불러오지 못했습니다.',
      onError: (err) => setError(handleApiError(err, '주문 내역을 불러오지 못했습니다.')),
    },
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, page]);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <SkeletonBox width="w-48" height="h-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/my" className="text-sm text-muted-foreground hover:underline">
          마이페이지
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">주문 내역</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonBox key={i} height="h-24" />
          ))}
        </div>
      ) : error !== null ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-12 text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => void fetchOrders()}
            className="mt-4 inline-block rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 transition-opacity"
          >
            다시 시도
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">주문 내역이 없습니다.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 transition-opacity"
          >
            쇼핑 계속하기
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/my/orders/${order.id}`}
                  className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{order.orderNumber}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm truncate">
                        {order.items[0]?.productName}
                        {order.items.length > 1 && ` 외 ${order.items.length - 1}개`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">{formatCurrency(order.totalAmount)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted transition-colors"
              >
                이전
              </button>
              <span className="flex items-center px-3 text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
