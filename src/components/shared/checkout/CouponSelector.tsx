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
  onDiscountChange: (result: CalculateDiscountResponse | null, userCouponId?: number, pointsUsed?: number) => void;
}

export default function CouponSelector({ orderAmount, onDiscountChange }: CouponSelectorProps) {
  const locale = getClientLocale();
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [calculating, setCalculating] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsInput, setPointsInput] = useState('');

  const { execute: loadCoupons, isLoading: loading } = useAsyncAction(
    async () => {
      const res = await couponsApi.getList('available');
      setCoupons(res.coupons);
      setPointsBalance(res.points.balance);
    },
    { onError: () => setCoupons([]), errorMessage: localMessage('checkout.couponLoadError') },
  );

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const calculateDiscount = async (userCouponId?: number, pointsToUse = 0) => {
    if (!userCouponId && pointsToUse <= 0) {
      onDiscountChange(null, undefined, 0);
      return;
    }

    setCalculating(true);
    try {
      const result = await couponsApi.calculate({ orderAmount, userCouponId, pointsToUse });
      onDiscountChange(result, userCouponId, pointsToUse);
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('couponDiscountError')));
      onDiscountChange(null, undefined, 0);
      setSelectedId('');
      setPointsInput('');
    } finally {
      setCalculating(false);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedId(val === '' ? '' : Number(val));

    const pointsToUse = Number(pointsInput) || 0;
    await calculateDiscount(val === '' ? undefined : Number(val), pointsToUse);
  };

  const handleApplyPoints = async () => {
    const pointsToUse = Math.min(Math.max(Number(pointsInput) || 0, 0), pointsBalance);
    setPointsInput(pointsToUse > 0 ? String(pointsToUse) : '');
    await calculateDiscount(selectedId === '' ? undefined : Number(selectedId), pointsToUse);
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

      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <label className="text-sm font-medium md:col-span-2" htmlFor="points-input">
          {localMessage('checkout.pointsUse')}
        </label>
        <input
          id="points-input"
          type="number"
          min={0}
          max={pointsBalance}
          value={pointsInput}
          onChange={(event) => setPointsInput(event.target.value)}
          disabled={calculating || pointsBalance <= 0}
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          placeholder={localMessage('checkout.pointsPlaceholder')}
        />
        <button
          type="button"
          onClick={handleApplyPoints}
          disabled={calculating || pointsBalance <= 0}
          className="rounded-md border px-4 py-2 text-sm font-medium transition-colors enabled:hover:bg-muted disabled:opacity-50"
        >
          {localMessage('checkout.applyPoints')}
        </button>
        <p className="text-xs text-muted-foreground md:col-span-2">
          {localMessage('checkout.pointsBalance', { amount: formatCurrency(pointsBalance, locale) })}
        </p>
      </div>

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
