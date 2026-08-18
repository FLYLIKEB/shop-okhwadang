'use client';

import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/utils/currency';
import type { Locale } from '@/i18n/routing';

export interface CheckoutPricingItem {
  productId: number;
  productOptionId: number | null;
  productName: string;
  optionName: string | null;
  unitPrice: number;
  subtotal: number;
  quantity: number;
}

interface OrderSummarySectionProps {
  pricedItems: CheckoutPricingItem[];
  locale: Locale;
  subtotalAmount: number;
  shippingFee: number;
  freeShippingThreshold: number;
  couponDiscount?: number;
  pointsUsed?: number;
  totalPayable: number;
}

export function OrderSummarySection({
  pricedItems,
  locale,
  subtotalAmount,
  shippingFee,
  freeShippingThreshold,
  couponDiscount = 0,
  pointsUsed = 0,
  totalPayable,
}: OrderSummarySectionProps) {
  const t = useTranslations('checkout');
  const remainingForFreeShipping = Math.max(freeShippingThreshold - subtotalAmount, 0);
  const freeShippingProgress = freeShippingThreshold > 0
    ? Math.min((subtotalAmount / freeShippingThreshold) * 100, 100)
    : 100;

  return (
    <section className="surface-card p-6">
      <h2 className="typo-h3">{t('orderItems')}</h2>

      <ul className="mt-4 divide-y divide-soft text-sm">
        {pricedItems.map((item) => (
          <li key={`${item.productId}:${item.productOptionId ?? 'none'}`} className="space-y-0.5 py-3">
            <p className="font-medium">{item.productName}</p>
            {item.optionName && (
              <p className="text-xs text-muted-foreground">{item.optionName}</p>
            )}
            <p className="text-muted-foreground">
              {formatCurrency(item.unitPrice, locale)} × {item.quantity} = {formatCurrency(item.subtotal, locale)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-md border border-soft bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">
          {remainingForFreeShipping === 0
            ? t('freeShippingUnlocked')
            : t('freeShippingRemaining', { amount: formatCurrency(remainingForFreeShipping, locale) })}
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-background">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${freeShippingProgress}%` }}
            aria-hidden
          />
        </div>
      </div>

      <div className="mt-4 border-t border-soft pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('productAmount')}</span>
          <span className="typo-price">{formatCurrency(subtotalAmount, locale)}</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-muted-foreground">{t('shippingFee')}</span>
          <span className="typo-price">{shippingFee === 0 ? t('freeShipping') : formatCurrency(shippingFee, locale)}</span>
        </div>
        {couponDiscount > 0 && (
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground">{t('discountAmount')}</span>
            <span className="typo-price text-destructive">-{formatCurrency(couponDiscount, locale)}</span>
          </div>
        )}
        {pointsUsed > 0 && (
          <div className="mt-2 flex justify-between">
            <span className="text-muted-foreground">{t('pointsUsed')}</span>
            <span className="typo-price text-destructive">-{formatCurrency(pointsUsed, locale)}</span>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-soft pt-4">
        <div className="flex items-end justify-between">
          <span className="typo-title">{t('total')}</span>
          <span className="typo-price-lg text-foreground">{formatCurrency(totalPayable, locale)}</span>
        </div>
      </div>
    </section>
  );
}
