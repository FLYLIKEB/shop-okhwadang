'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi } from '@/lib/api';
import type { OrderResponse } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ORDER_STATUS_LABELS } from '@/constants/orderStatus';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/utils/currency';

export default function MyPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState<OrderResponse[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    ordersApi
      .getList({ page: 1, limit: 3 })
      .then((res) => setRecentOrders(res.items))
      .catch(() => setRecentOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [isAuthenticated]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <SkeletonBox width="w-48" height="h-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">마이페이지</h1>

      {/* User info card */}
      <section className="mb-6 rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
          </div>
          <Link
            href="/my/profile"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            회원정보 수정
          </Link>
        </div>
      </section>

      {/* Quick links */}
      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link
          href="/my/orders"
          className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-muted transition-colors text-center"
        >
          <span className="text-2xl">📦</span>
          주문 내역
        </Link>
        <Link
          href="/my/wishlist"
          className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-muted transition-colors text-center"
        >
          <span className="text-2xl">❤️</span>
          위시리스트
        </Link>
        <Link
          href="/my/profile"
          className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-muted transition-colors text-center"
        >
          <span className="text-2xl">👤</span>
          회원정보 수정
        </Link>
        <Link
          href="/my/address"
          className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-muted transition-colors text-center"
        >
          <span className="text-2xl">📍</span>
          배송지 관리
        </Link>
        <Link
          href="/my/coupons"
          className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-muted transition-colors text-center"
        >
          <span className="text-2xl">🎟️</span>
          쿠폰함
        </Link>
        <Link
          href="/my/recently-viewed"
          className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-muted transition-colors text-center"
        >
          <span className="text-2xl">👁</span>
          최근 본 상품
        </Link>
      </section>

      {/* Recent orders */}
      <section className="rounded-lg border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">최근 주문</h2>
          <Link href="/my/orders" className="text-sm text-muted-foreground hover:underline">
            전체 보기
          </Link>
        </div>

        {ordersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonBox key={i} height="h-16" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">주문 내역이 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/my/orders/${order.id}`}
                  className="flex items-center justify-between py-3 text-sm hover:opacity-75 transition-opacity"
                >
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.items[0]?.productName}
                      {order.items.length > 1 && ` 외 ${order.items.length - 1}개`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(Number(order.totalAmount))}</p>
                    <p className="text-xs text-muted-foreground">
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
