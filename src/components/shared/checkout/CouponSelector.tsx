'use client';

import { useEffect, useState } from 'react';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { couponsApi } from '@/lib/api';
import type { CouponItem, CalculateDiscountResponse } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/components/ui/utils';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { toastMessage } from '@/utils/toastMessages';
import { getClientLocale } from '@/utils/clientLocale';
import { localMessage } from '@/utils/localMessages';

interface CouponSelectorProps {
  orderAmount: number;
  onDiscountChange: (result: CalculateDiscountResponse | null, userCouponId?: number) => void;
}

export default function CouponSelector({ orderAmount, onDiscountChange }: CouponSelectorProps) {
  const locale = getClientLocale();
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [calculating, setCalculating] = useState(false);

  const { execute: loadCoupons, isLoading: loading } = useAsyncAction(
    async () => {
      const res = await couponsApi.getList('available');
      setCoupons(res.coupons);
    },
    { onError: () => setCoupons([]), errorMessage: localMessage('checkout.couponLoadError') },
  );

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

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
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('couponDiscountError')));
      onDiscountChange(null, undefined);
      setSelectedId('');
    } finally {
      setCalculating(false);
    }
  };

  const selected = coupons.find((c) => c.id === selectedId);

  if (loading) {
    return <p className="text-sm text-muted-foreground">{localMessage('checkout.couponLoading')}</p>;
  }

  return (
    <div className="space-y-2">
      <label htmlFor="coupon-select" className="text-sm font-medium">
        {localMessage('checkout.couponSelect')}
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
        <option value="">{localMessage('checkout.couponPlaceholder')}</option>
        {coupons.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} (
            {c.type === 'percentage'
              ? `${c.value}% ${localMessage('checkout.discount')}${c.maxDiscount ? ` / ${localMessage('checkout.maxDiscount', { amount: formatCurrency(c.maxDiscount, locale) })}` : ''}`
              : `${formatCurrency(c.value, locale)} ${localMessage('checkout.discount')}`}
            )
          </option>
        ))}
      </select>

      {selected && (
        <p className="text-xs text-muted-foreground">
          {localMessage('checkout.minimumOrderAmount', { amount: formatCurrency(selected.minOrderAmount, locale) })} &middot; {localMessage('checkout.expires')}:{' '}
          {new Date(selected.expiresAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR')}
        </p>
      )}

      {coupons.length === 0 && (
        <p className="text-xs text-muted-foreground">{localMessage('checkout.noCoupons')}</p>
      )}
    </div>
  );
}
