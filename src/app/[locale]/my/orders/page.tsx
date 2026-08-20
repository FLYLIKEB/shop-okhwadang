'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ordersApi, productsApi } from '@/lib/api';
import type { OrderResponse, Product } from '@/lib/api';
import { type Locale } from '@/utils/currency';
import { handleApiError } from '@/utils/error';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { OrderSummaryCard } from '@/components/shared/account/OrderSummaryCard';
import { AccountPageHeader } from '@/components/shared/account/AccountPageHeader';
import { AccountPageShell } from '@/components/shared/account/AccountPageShell';

const PAGE_LIMIT = 10;

export default function OrdersPage() {
  const t = useTranslations('order');
  const tMy = useTranslations('myPage');
  const locale = useLocale() as Locale;
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [products, setProducts] = useState<Map<number, Product>>(new Map());
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { execute: fetchOrders, isLoading: loading } = useAsyncAction(
    async () => {
      setError(null);
      const res = await ordersApi.getList({ page, limit: PAGE_LIMIT, locale });
      setOrders(res.items);
      setTotal(res.total);
      const productIds = [...new Set(res.items.flatMap((order) => order.items.map((item) => item.productId)))];
      if (productIds.length === 0) {
        setProducts(new Map());
        return;
      }
      try {
        const productItems = await productsApi.getBulk(productIds, locale);
        setProducts(new Map(productItems.map((product) => [product.id, product])));
      } catch {
        setProducts(new Map());
      }
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
  }, [isAuthenticated, locale, page]);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <SkeletonBox width="w-48" height="h-8" />
      </div>
    );
  }

  return (
    <AccountPageShell maxWidth="max-w-4xl">
      <AccountPageHeader title={t('orderHistory')} backHref="/my" backLabel={tMy('title')} />

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
        <div className="surface-card p-12 text-center">
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
                <OrderSummaryCard
                  order={order}
                  products={products}
                  locale={locale}
                  href={`/my/orders/${order.id}`}
                  moreLabel={order.items.length > 1 ? tMy('additionalItems', { count: order.items.length - 1 }) : undefined}
                />
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-soft px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted transition-colors"
              >
                {tMy('previousPage')}
              </button>
              <span className="flex items-center px-3 text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border border-soft px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted transition-colors"
              >
                {tMy('nextPage')}
              </button>
            </div>
          )}
        </>
      )}
    </AccountPageShell>
  );
}
