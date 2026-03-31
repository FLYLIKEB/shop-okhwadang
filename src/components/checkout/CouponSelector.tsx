'use client';

import { useEffect, useState } from 'react';
import { couponsApi } from '@/lib/api';
import type { CouponItem, CalculateDiscountResponse } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/components/ui/utils';

interface CouponSelectorProps {
  orderAmount: number;
  onDiscountChange: (result: CalculateDiscountResponse | null, userCouponId?: number) => void;
}

export default function CouponSelector({ orderAmount, onDiscountChange }: CouponSelectorProps) {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    couponsApi
      .getList('available')
      .then((res) => setCoupons(res.coupons))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedId(val === '' ? '' : Number(val));

    if (val === '') {
      onDiscountChange(null, undefined);
      return;
    }

    const userCouponId = Number(val);
    setCalculating(true);
    try {
      const result = await couponsApi.calculate({ orderAmount, userCouponId });
      onDiscountChange(result, userCouponId);
    } catch {
      onDiscountChange(null, undefined);
      setSelectedId('');
    } finally {
      setCalculating(false);
    }
  };

  const selected = coupons.find((c) => c.id === selectedId);

  if (loading) {
    return <p className="text-sm text-muted-foreground">쿠폰 불러오는 중...</p>;
  }

  return (
    <div className="space-y-2">
      <label htmlFor="coupon-select" className="text-sm font-medium">
        쿠폰 선택
      </label>
      <select
        id="coupon-select"
        value={selectedId}
        onChange={handleChange}
        disabled={calculating}
        className={cn(
          'w-full rounded-md border px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          calculating && 'opacity-50 cursor-not-allowed',
        )}
      >
        <option value="">쿠폰을 선택하세요</option>
        {coupons.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} (
            {c.type === 'percentage'
              ? `${c.value}% 할인${c.maxDiscount ? ` / 최대 ${formatCurrency(c.maxDiscount)}원` : ''}`
              : `${formatCurrency(c.value)}원 할인`}
            )
          </option>
        ))}
      </select>

      {selected && (
        <p className="text-xs text-muted-foreground">
          최소 주문금액: {formatCurrency(selected.minOrderAmount)}원 &middot; 만료:{' '}
          {new Date(selected.expiresAt).toLocaleDateString('ko-KR')}
        </p>
      )}

      {coupons.length === 0 && (
        <p className="text-xs text-muted-foreground">사용 가능한 쿠폰이 없습니다.</p>
      )}
    </div>
  );
}
