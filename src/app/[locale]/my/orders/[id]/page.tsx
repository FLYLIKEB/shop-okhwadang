'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ordersApi } from '@/lib/api';
import type { OrderResponse } from '@/lib/api';
import { formatPrice } from '@/utils/price';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ORDER_STATUS_LABELS } from '@/constants/orderStatus';
import { SkeletonBox } from '@/components/ui/Skeleton';
import ShippingTimeline from '@/components/ShippingTimeline';

const STATUS_TIMELINE = ['pending', 'paid', 'preparing', 'shipped', 'delivered'];

export default function OrderDetailPage() {
  const params = useParams();
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const id = Number(params.id);
    if (isNaN(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    ordersApi
      .getById(id)
      .then((res) => setOrder(res))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
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
        <p className="text-muted-foreground">주문을 찾을 수 없습니다.</p>
        <Link href="/my/orders" className="mt-4 inline-block text-sm hover:underline">
          주문 목록으로
        </Link>
      </div>
    );
  }

  const currentStatusIndex = STATUS_TIMELINE.indexOf(order.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/my" className="text-sm text-muted-foreground hover:underline">
          마이페이지
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link href="/my/orders" className="text-sm text-muted-foreground hover:underline">
          주문 내역
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">{order.orderNumber}</h1>
      </div>

      <div className="space-y-6">
        {/* Status timeline */}
        {!['cancelled', 'refunded'].includes(order.status) && (
          <section className="rounded-lg border p-6">
            <h2 className="mb-4 text-base font-semibold">배송 현황</h2>
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
                      {ORDER_STATUS_LABELS[status]}
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
          <h2 className="mb-4 text-base font-semibold">주문 상품</h2>
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
                      {formatPrice(item.price)} × {item.quantity}개
                    </p>
                  </div>
                  <p className="font-medium shrink-0">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Order amounts */}
        <section className="rounded-lg border p-6">
          <h2 className="mb-4 text-base font-semibold">결제 금액</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">상품 금액</dt>
              <dd>{formatPrice(order.totalAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">할인 금액</dt>
              <dd>-{formatPrice(order.discountAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">배송비</dt>
              <dd>
                {Number(order.shippingFee) === 0
                  ? '무료'
                  : formatPrice(order.shippingFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <dt>합계</dt>
              <dd>
                {formatPrice(
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
          <h2 className="mb-4 text-base font-semibold">배송지 정보</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-4">
              <dt className="w-20 shrink-0 text-muted-foreground">받는 분</dt>
              <dd>{order.recipientName}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-20 shrink-0 text-muted-foreground">연락처</dt>
              <dd>{order.recipientPhone}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-20 shrink-0 text-muted-foreground">주소</dt>
              <dd>
                [{order.zipcode}] {order.address}
                {order.addressDetail && `, ${order.addressDetail}`}
              </dd>
            </div>
            {order.memo && (
              <div className="flex gap-4">
                <dt className="w-20 shrink-0 text-muted-foreground">배송 메모</dt>
                <dd>{order.memo}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>
    </div>
  );
}
