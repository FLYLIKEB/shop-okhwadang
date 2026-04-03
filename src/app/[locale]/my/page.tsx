'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi } from '@/lib/api';
import type { OrderResponse } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ORDER_STATUS_LABELS } from '@/constants/status';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/utils/currency';
import {
  Package,
  Heart,
  User,
  MapPin,
  Ticket,
  Eye,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';

const QUICK_LINKS = [
  { href: '/my/orders', label: '주문 내역', icon: Package },
  { href: '/my/wishlist', label: '위시리스트', icon: Heart },
  { href: '/my/profile', label: '회원정보', icon: User },
  { href: '/my/address', label: '배송지 관리', icon: MapPin },
  { href: '/my/coupons', label: '쿠폰함', icon: Ticket },
  { href: '/my/recently-viewed', label: '최근 본 상품', icon: Eye },
  { href: '/my/inquiries', label: '1:1 문의', icon: MessageSquare },
];

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
      <div className="mx-auto max-w-3xl px-4 py-12">
        <SkeletonBox width="w-48" height="h-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="typo-h1 mb-10">마이페이지</h1>

      {/* User info */}
      <section className="mb-10 border-b border-border pb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="typo-h3">{user.name}</p>
            <p className="typo-body-sm text-muted-foreground mt-1">{user.email}</p>
            {user.phone && (
              <p className="typo-body-sm text-muted-foreground">{user.phone}</p>
            )}
          </div>
          <Link
            href="/my/profile"
            className="typo-button border border-border rounded-md px-4 py-2 text-foreground hover:bg-muted transition-colors"
          >
            수정
          </Link>
        </div>
      </section>

      {/* Quick links */}
      <section className="mb-10">
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 border border-border rounded-md overflow-hidden">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2.5 bg-background py-6 typo-body-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* Recent orders */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="typo-h3">최근 주문</h2>
          <Link
            href="/my/orders"
            className="typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            전체 보기
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {ordersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonBox key={i} height="h-16" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="typo-body-sm text-muted-foreground py-8 text-center">
            주문 내역이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/my/orders/${order.id}`}
                  className="flex items-center justify-between py-4 hover:opacity-75 transition-opacity"
                >
                  <div className="min-w-0">
                    <p className="typo-body-sm font-medium">{order.orderNumber}</p>
                    <p className="typo-label text-muted-foreground mt-0.5">
                      {order.items[0]?.productName}
                      {order.items.length > 1 && ` 외 ${order.items.length - 1}개`}
                      {' · '}
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="typo-body-sm font-medium">
                      {formatCurrency(Number(order.totalAmount))}
                    </p>
                    <p className="typo-label text-muted-foreground mt-0.5">
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
