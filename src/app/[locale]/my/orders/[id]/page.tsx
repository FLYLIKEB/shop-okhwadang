'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ordersApi } from '@/lib/api';
import type { OrderResponse } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { ORDER_STATUS_LABELS } from '@/constants/status';
import { SkeletonBox } from '@/components/ui/Skeleton';
import ShippingTimeline from '@/components/shared/ShippingTimeline';

const STATUS_TIMELINE = ['pending', 'paid', 'preparing', 'shipped', 'delivered'];

export default function OrderDetailPage() {
  const params = useParams();
  const tOrder = useTranslations('order');
  const tMy = useTranslations('myPage');
  const t = useTranslations('orderDetail');
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  const { execute: loadOrder, isLoading: loading } = useAsyncAction(
    async () => {
      const id = Number(params.id);
      if (isNaN(id)) {
        setNotFound(true);
        return;
      }
      const res = await ordersApi.getById(id);
      setOrder(res);
    },
    { onError: () => setNotFound(true) },
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, params.id]);

  if (isLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <SkeletonBox width="w-48" height="h-8" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center">
        <p className="text-muted-foreground">{t('notFound')}</p>
        <Link href="/my/orders" className="mt-4 inline-block text-sm hover:underline">
          {t('backToOrders')}
        </Link>
      </div>
    );
  }

  const currentStatusIndex = STATUS_TIMELINE.indexOf(order.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/my" className="text-sm text-muted-foreground hover:underline">
          {tMy('title')}
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link href="/my/orders" className="text-sm text-muted-foreground hover:underline">
          {tOrder('orderHistory')}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">{order.orderNumber}</h1>
      </div>

      <div className="space-y-6">
        {/* Status timeline */}
        {!['cancelled', 'refunded'].includes(order.status) && (
          <section className="rounded-lg border p-6">
            <h2 className="mb-4 text-base font-semibold">{t('shippingStatus')}</h2>
            <div className="flex items-center justify-between">
              {STATUS_TIMELINE.map((status, index) => (
                <div key={status} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        index <= currentStatusIndex
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-xs text-center whitespace-nowrap">
                      {tOrder.has(`status.${status}`) ? tOrder(`status.${status}`) : status}
                    </span>
                  </div>
                  {index < STATUS_TIMELINE.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1 ${
                        index < currentStatusIndex ? 'bg-foreground' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Shipping tracking */}
        {!['cancelled', 'refunded'].includes(order.status) && (
          <ShippingTimeline orderId={Number(params.id)} />
        )}

        {/* Order items */}
        <section className="rounded-lg border p-6">
          <h2 className="mb-4 text-base font-semibold">{t('orderItems')}</h2>
          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="py-3 text-sm">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {item.optionName && (
                      <p className="text-xs text-muted-foreground">{item.optionName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.price)} × {t('quantity', { count: item.quantity })}
                    </p>
                  </div>
                  <p className="font-medium shrink-0">
                    {formatCurrency(Number(item.price) * item.quantity)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Order amounts */}
        <section className="rounded-lg border p-6">
          <h2 className="mb-4 text-base font-semibold">{t('paymentSummary')}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('productAmount')}</dt>
              <dd>{formatCurrency(order.totalAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('discountAmount')}</dt>
              <dd>-{formatCurrency(order.discountAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('shippingFee')}</dt>
              <dd>
                {Number(order.shippingFee) === 0
                  ? t('freeShipping')
                  : formatCurrency(order.shippingFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <dt>{t('total')}</dt>
              <dd>
                {formatCurrency(
                  Number(order.totalAmount) -
                  Number(order.discountAmount) +
                  Number(order.shippingFee)
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* Shipping address */}
        <section className="rounded-lg border p-6">
          <h2 className="mb-4 text-base font-semibold">{t('shippingAddress')}</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-4">
              <dt className="w-20 shrink-0 text-muted-foreground">{t('recipient')}</dt>
              <dd>{order.recipientName}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-20 shrink-0 text-muted-foreground">{t('phone')}</dt>
              <dd>{order.recipientPhone}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-20 shrink-0 text-muted-foreground">{t('address')}</dt>
              <dd>
                [{order.zipcode}] {order.address}
                {order.addressDetail && `, ${order.addressDetail}`}
              </dd>
            </div>
            {order.memo && (
              <div className="flex gap-4">
                <dt className="w-20 shrink-0 text-muted-foreground">{t('deliveryMemo')}</dt>
                <dd>{order.memo}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>
    </div>
  );
}
