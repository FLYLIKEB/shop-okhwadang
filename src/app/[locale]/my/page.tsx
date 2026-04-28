'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi } from '@/lib/api';
import type { OrderResponse } from '@/lib/api';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/utils/currency';
import { handleApiError } from '@/utils/error';
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
  { href: '/my/orders', key: 'orderHistory', icon: Package },
  { href: '/my/wishlist', key: 'wishlist', icon: Heart },
  { href: '/my/profile', key: 'profile', icon: User },
  { href: '/my/address', key: 'addressManagement', icon: MapPin },
  { href: '/my/coupons', key: 'coupons', icon: Ticket },
  { href: '/my/recently-viewed', key: 'recentlyViewed', icon: Eye },
  { href: '/my/inquiries', key: 'inquiries', icon: MessageSquare },
] as const;

export default function MyPage() {
  const t = useTranslations('myPage');
  const tOrder = useTranslations('order');
  const locale = useLocale();
  const { isAuthenticated, isLoading } = useRequireAuth();
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState<OrderResponse[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    ordersApi
      .getList({ page: 1, limit: 3, locale })
      .then((res) => setRecentOrders(res.items))
      .catch((err: unknown) => {
        toast.error(handleApiError(err, t('loadOrdersError')));
        setRecentOrders([]);
      })
      .finally(() => setOrdersLoading(false));
  }, [isAuthenticated, locale, t]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <SkeletonBox width="w-48" height="h-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="typo-h1 mb-10">{t('title')}</h1>

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
            {t('edit')}
          </Link>
        </div>
      </section>

      {/* Quick links */}
      <section className="mb-10">
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 border border-border rounded-md overflow-hidden">
          {QUICK_LINKS.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2.5 bg-background py-6 typo-body-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              {t(key)}
            </Link>
          ))}
        </div>
      </section>

      {/* Recent orders */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="typo-h3">{tOrder('recentOrders')}</h2>
          <Link
            href="/my/orders"
            className="typo-body-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            {t('viewAll')}
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
            {tOrder('noOrders')}
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
                      {order.items.length > 1 &&
                        t('additionalItems', { count: order.items.length - 1 })}
                      {' · '}
                      {new Date(order.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR')}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="typo-body-sm font-medium">
                      {formatCurrency(Number(order.totalAmount))}
                    </p>
                    <p className="typo-label text-muted-foreground mt-0.5">
                      {tOrder.has(`status.${order.status}`) ? tOrder(`status.${order.status}`) : order.status}
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
