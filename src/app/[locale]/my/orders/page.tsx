'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ordersApi } from '@/lib/api';
import type { OrderResponse } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { handleApiError } from '@/utils/error';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import StatusBadge from '@/components/shared/common/StatusBadge';
import { SkeletonBox } from '@/components/ui/Skeleton';

const PAGE_LIMIT = 10;

export default function OrdersPage() {
  const t = useTranslations('order');
  const tMy = useTranslations('myPage');
  const locale = useLocale();
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
      errorMessage: tMy('loadOrdersError'),
      onError: (err) => setError(handleApiError(err, tMy('loadOrdersError'))),
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
          {tMy('title')}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">{t('orderHistory')}</h1>
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
            {tMy('retry')}
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">{t('noOrders')}</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 transition-opacity"
          >
            {t('noOrdersAction')}
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
                        {order.items.length > 1 &&
                          tMy('additionalItems', { count: order.items.length - 1 })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
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
                {tMy('previousPage')}
              </button>
              <span className="flex items-center px-3 text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted transition-colors"
              >
                {tMy('nextPage')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
