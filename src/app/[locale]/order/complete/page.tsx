'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import type { OrderResponse } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';

function OrderCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const orderNumber = searchParams.get('orderNumber');

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !orderNumber) {
      router.replace('/');
      return;
    }
    const id = Number(orderId);
    if (isNaN(id)) {
      router.replace('/');
      return;
    }

    ordersApi
      .getById(id)
      .then((data) => setOrder(data))
      .catch(() => {
        router.replace('/');
      })
      .finally(() => setIsLoading(false));
  }, [orderId, orderNumber, router]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 space-y-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-muted mx-auto" />
        <div className="h-8 animate-pulse rounded bg-muted" />
        <div className="h-4 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center space-y-4 mb-10">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold">주문이 완료되었습니다!</h1>
        <p className="text-muted-foreground">
          주문번호: <span className="font-semibold text-foreground">{order.orderNumber}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          주문일시:{' '}
          {new Date(order.createdAt).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <section className="rounded-lg border p-6 space-y-4 mb-8">
        <h2 className="font-semibold text-lg">주문 상품</h2>
        <ul className="divide-y text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="py-3 flex justify-between gap-2">
              <div>
                <p className="font-medium">{item.productName}</p>
                {item.optionName && (
                  <p className="text-xs text-muted-foreground">{item.optionName}</p>
                )}
                <p className="text-muted-foreground">수량 {item.quantity}개</p>
              </div>
              <p className="font-medium shrink-0">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <div className="border-t pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">배송비</span>
            <span>{order.shippingFee === 0 ? '무료' : formatCurrency(order.shippingFee)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">할인</span>
              <span className="text-destructive">-{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
        </div>

        <div className="border-t pt-4 flex justify-between font-bold">
          <span>결제 금액</span>
          <span>{formatCurrency(order.totalAmount)}</span>
        </div>
      </section>

      <div className="flex gap-3">
        <Link
          href="/my/orders"
          className="flex-1 rounded-md border py-3 text-center text-sm font-semibold hover:bg-muted transition-colors"
        >
          주문 내역 보기
        </Link>
        <Link
          href="/"
          className="flex-1 rounded-md bg-foreground py-3 text-center text-sm font-semibold text-background hover:opacity-90 transition-opacity"
        >
          쇼핑 계속하기
        </Link>
      </div>
    </div>
  );
}

export default function OrderCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-16 space-y-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-muted mx-auto" />
          <div className="h-8 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <OrderCompleteContent />
    </Suspense>
  );
}
