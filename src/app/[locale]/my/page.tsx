'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { ordersApi, productsApi } from '@/lib/api';
import type { OrderResponse, Product } from '@/lib/api';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { type Locale } from '@/utils/currency';
import { handleApiError } from '@/utils/error';
import { OrderSummaryCard } from '@/components/shared/account/OrderSummaryCard';
import { AccountPageShell } from '@/components/shared/account/AccountPageShell';
import { Button } from '@/components/ui/button';
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
  const locale = useLocale() as Locale;
  const { isAuthenticated, isLoading } = useRequireAuth();
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState<OrderResponse[]>([]);
  const [recentProducts, setRecentProducts] = useState<Map<number, Product>>(new Map());
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    ordersApi
      .getList({ page: 1, limit: 3, locale })
      .then(async (res) => {
        setRecentOrders(res.items);
        const productIds = [...new Set(res.items.flatMap((order) => order.items.map((item) => item.productId)))];
        if (productIds.length === 0) {
          setRecentProducts(new Map());
          return;
        }
        try {
          const products = await productsApi.getBulk(productIds, locale);
          setRecentProducts(new Map(products.map((product) => [product.id, product])));
        } catch {
          setRecentProducts(new Map());
        }
      })
      .catch((err: unknown) => {
        toast.error(handleApiError(err, t('loadOrdersError')));
        setRecentOrders([]);
      })
      .finally(() => setOrdersLoading(false));
  }, [isAuthenticated, locale, t]);

  if (isLoading || !user) {
    return (
      <div className="toss-account checkout-toss-theme min-h-screen">
        <AccountPageShell maxWidth="max-w-3xl" className="py-12">
          <SkeletonBox width="w-48" height="h-8" />
        </AccountPageShell>
      </div>
    );
  }

  return (
    <div className="toss-account checkout-toss-theme min-h-screen pb-16">
      <AccountPageShell maxWidth="max-w-3xl" className="toss-account__inner">
      <h1 className="toss-account__title checkout-toss-title typo-h1 mb-8">{t('title')}</h1>

      {/* User info */}
      <section className="toss-account__profile checkout-toss-section surface-card mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="typo-h3">{user.name}</p>
            <p className="typo-body-sm text-muted-foreground mt-1">{user.email}</p>
            {user.phone && (
              <p className="typo-body-sm text-muted-foreground">{user.phone}</p>
            )}
          </div>
          <Button asChild variant="gray" className="toss-account__edit">
            <Link href="/my/profile">{t('edit')}</Link>
          </Button>
        </div>
      </section>

      {/* Quick links */}
      <section className="mb-6">
        <div className="toss-account__quick-grid grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_LINKS.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="toss-account__quick-link flex flex-col items-center gap-2.5 rounded-2xl bg-card py-6 typo-body-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              {t(key)}
            </Link>
          ))}
        </div>
      </section>

      {/* Recent orders */}
      <section className="toss-account__orders checkout-toss-section surface-card p-6">
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
          <ul className="toss-account__recent-orders space-y-4">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <OrderSummaryCard
                  order={order}
                  products={recentProducts}
                  locale={locale}
                  href={`/my/orders/${order.id}`}
                  moreLabel={order.items.length > 1 ? t('additionalItems', { count: order.items.length - 1 }) : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      </AccountPageShell>
    </div>
  );
}
