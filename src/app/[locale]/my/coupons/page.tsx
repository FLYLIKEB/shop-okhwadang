'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { couponsApi } from '@/lib/api';
import type { CouponItem } from '@/lib/api';
import { useRequireAuth } from '@/components/shared/hooks/useRequireAuth';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/utils';
import { formatCurrency } from '@/utils/currency';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';

type TabStatus = 'available' | 'used' | 'expired';

function CouponCard({
  coupon,
  locale,
  t,
}: {
  coupon: CouponItem;
  locale: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const discountText =
    coupon.type === 'percentage'
      ? coupon.maxDiscount
        ? t('discountPercentWithMax', {
          value: coupon.value,
          max: formatCurrency(coupon.maxDiscount),
        })
        : t('discountPercent', { value: coupon.value })
      : t('discountFixed', { value: formatCurrency(coupon.value) });

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
          {t('minOrderAmount', { amount: formatCurrency(coupon.minOrderAmount) })}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {t('expiresAt')}: {new Date(coupon.expiresAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR')}
      </p>
    </div>
  );
}

export default function MyCouponsPage() {
  const t = useTranslations('myCoupons');
  const locale = useLocale();
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-4 typo-h1">{t('title')}</h1>

      {/* 적립금 잔액 */}
      <div className="mb-6 rounded-lg border p-4 flex items-center justify-between">
        <span className="text-sm font-medium">{t('pointBalance')}</span>
        <span className="text-lg font-bold">{formatCurrency(pointBalance)}</span>
      </div>

      {/* 탭 */}
      <div className="mb-4 flex border-b">
        {(['available', 'used', 'expired'] as TabStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setTab(status)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              tab === status
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`tab.${status}`)}
          </button>
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
    </div>
  );
}
