'use client';

import { useEffect, useState } from 'react';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { couponsApi } from '@/lib/api';
import type { CouponItem } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/components/ui/utils';
import { getClientLocale } from '@/utils/clientLocale';
import { localMessage } from '@/utils/localMessages';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/date';

interface CouponSelectorProps {
  onSelectionChange: (userCouponId?: number, pointsToUse?: number) => void;
}

export default function CouponSelector({ onSelectionChange }: CouponSelectorProps) {
  const locale = getClientLocale();
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const userCouponId = val === '' ? undefined : Number(val);
    setSelectedId(val === '' ? '' : Number(val));
    onSelectionChange(userCouponId, Number(pointsInput) || 0);
  };

  const handleApplyPoints = () => {
    const pointsToUse = Math.min(Math.max(Number(pointsInput) || 0, 0), pointsBalance);
    setPointsInput(pointsToUse > 0 ? String(pointsToUse) : '');
    onSelectionChange(selectedId === '' ? undefined : Number(selectedId), pointsToUse);
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
        className={cn(
          'w-full rounded-md border field-soft px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring',
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
          disabled={pointsBalance <= 0}
          className="w-full rounded-md border field-soft px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          placeholder={localMessage('checkout.pointsPlaceholder')}
        />
        <Button
          type="button"
          variant="gray"
          size="sm"
          onClick={handleApplyPoints}
          disabled={pointsBalance <= 0}
        >
          {localMessage('checkout.applyPoints')}
        </Button>
        <p className="text-xs text-muted-foreground md:col-span-2">
          {localMessage('checkout.pointsBalance', { amount: formatCurrency(pointsBalance, locale) })}
        </p>
      </div>

      {selected && (
        <p className="text-xs text-muted-foreground">
          {localMessage('checkout.minimumOrderAmount', { amount: formatCurrency(selected.minOrderAmount, locale) })} &middot; {localMessage('checkout.expires')}:{' '}
          {formatDate(selected.expiresAt, locale)}
        </p>
      )}

      {coupons.length === 0 && (
        <p className="text-xs text-muted-foreground">{localMessage('checkout.noCoupons')}</p>
      )}
    </div>
  );
}
