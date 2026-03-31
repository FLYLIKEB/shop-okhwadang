'use client';

import { useEffect, useState } from 'react';
import { couponsApi } from '@/lib/api';
import type { CouponItem } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/utils';
import { formatPrice } from '@/utils/price';

type TabStatus = 'available' | 'used' | 'expired';

const TAB_LABELS: Record<TabStatus, string> = {
  available: '사용 가능',
  used: '사용 완료',
  expired: '만료',
};

function CouponCard({ coupon }: { coupon: CouponItem }) {
  const discountText =
    coupon.type === 'percentage'
      ? `${coupon.value}% 할인${coupon.maxDiscount ? ` (최대 ${formatPrice(coupon.maxDiscount)}원)` : ''}`
      : `${formatPrice(coupon.value)}원 할인`;

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
          {TAB_LABELS[coupon.status]}
        </span>
      </div>
      <p className="text-sm font-medium text-primary">{discountText}</p>
      {coupon.minOrderAmount > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatPrice(coupon.minOrderAmount)}원 이상 구매 시 사용 가능
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        유효기간: {new Date(coupon.expiresAt).toLocaleDateString('ko-KR')}
      </p>
    </div>
  );
}

export default function MyCouponsPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [tab, setTab] = useState<TabStatus>('available');
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [pointBalance, setPointBalance] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    setDataLoading(true);
    couponsApi
      .getList(tab)
      .then((res) => {
        setCoupons(res.coupons);
        setPointBalance(res.points.balance);
      })
      .catch(() => setCoupons([]))
      .finally(() => setDataLoading(false));
  }, [isAuthenticated, tab]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <SkeletonBox width="w-40" height="h-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">쿠폰함</h1>

      {/* 적립금 잔액 */}
      <div className="mb-6 rounded-lg border p-4 flex items-center justify-between">
        <span className="text-sm font-medium">보유 적립금</span>
        <span className="text-lg font-bold">{formatPrice(pointBalance)}원</span>
      </div>

      {/* 탭 */}
      <div className="mb-4 flex border-b">
        {(Object.keys(TAB_LABELS) as TabStatus[]).map((status) => (
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
            {TAB_LABELS[status]}
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
          {TAB_LABELS[tab]} 쿠폰이 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </div>
      )}
    </div>
  );
}
