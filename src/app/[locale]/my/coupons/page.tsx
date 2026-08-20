'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { couponsApi } from '@/lib/api';
import type { CouponItem } from '@/lib/api';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/utils';
import { formatCurrency, type Locale } from '@/utils/currency';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { AccountPageHeader } from '@/components/shared/account/AccountPageHeader';
import { AccountPageShell } from '@/components/shared/account/AccountPageShell';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/date';

type TabStatus = 'available' | 'used' | 'expired';

function CouponCard({
  coupon,
  locale,
  t,
}: {
  coupon: CouponItem;
  locale: Locale;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const discountText =
    coupon.type === 'percentage'
      ? coupon.maxDiscount
        ? t('discountPercentWithMax', {
          value: coupon.value,
          max: formatCurrency(coupon.maxDiscount, locale),
        })
        : t('discountPercent', { value: coupon.value })
      : t('discountFixed', { value: formatCurrency(coupon.value, locale) });

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-1',
        coupon.status !== 'available' && 'opacity-50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-base">{coupon.name}</p>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
            coupon.status === 'available' && 'bg-primary/10 text-primary',
            coupon.status === 'used' && 'bg-muted text-muted-foreground',
            coupon.status === 'expired' && 'bg-destructive/10 text-destructive',
          )}
        >
          {t(`tab.${coupon.status}`)}
        </span>
      </div>
      <p className="text-sm font-medium text-primary">{discountText}</p>
      {coupon.minOrderAmount > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('minOrderAmount', { amount: formatCurrency(coupon.minOrderAmount, locale) })}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {t('expiresAt')}: {formatDate(coupon.expiresAt, locale)}
      </p>
    </div>
  );
}

export default function MyCouponsPage() {
  const t = useTranslations('myCoupons');
  const locale = useLocale() as Locale;
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [tab, setTab] = useState<TabStatus>('available');
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [pointBalance, setPointBalance] = useState(0);

  const { execute: loadCoupons, isLoading: dataLoading } = useAsyncAction(
    async () => {
      const res = await couponsApi.getList(tab);
      setCoupons(res.coupons);
      setPointBalance(res.points.balance);
    },
    { errorMessage: t('loadError') },
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadCoupons();
  }, [isAuthenticated, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <SkeletonBox width="w-40" height="h-8" />
      </div>
    );
  }

  return (
    <AccountPageShell maxWidth="max-w-2xl">
      <AccountPageHeader title={t('title')} className="mb-4" />

      {/* 적립금 잔액 */}
      <div className="mb-6 rounded-lg border p-4 flex items-center justify-between">
        <span className="text-sm font-medium">{t('pointBalance')}</span>
        <span className="text-lg font-bold">{formatCurrency(pointBalance, locale)}</span>
      </div>

      {/* 탭 */}
      <div className="mb-4 flex border-b">
        {(['available', 'used', 'expired'] as TabStatus[]).map((status) => (
          <Button
            key={status}
            type="button"
            variant={tab === status ? 'black' : 'gray'}
            size="sm"
            onClick={() => setTab(status)}
            className="rounded-none"
          >
            {t(`tab.${status}`)}
          </Button>
        ))}
      </div>

      {/* 쿠폰 목록 */}
      {dataLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonBox key={i} height="h-24" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t('emptyByTab', { status: t(`tab.${tab}`) })}
        </p>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} locale={locale} t={t} />
          ))}
        </div>
      )}
    </AccountPageShell>
  );
}
