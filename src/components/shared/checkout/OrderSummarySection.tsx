'use client';

import { useTranslations } from 'next-intl';
import type { CartItem } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import type { Locale } from '@/i18n/routing';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/constants/shipping';

interface OrderSummarySectionProps {
  checkoutItems: CartItem[];
  locale: Locale;
}

export function OrderSummarySection({ checkoutItems, locale }: OrderSummarySectionProps) {
  const t = useTranslations('checkout');
  const totalAmount = checkoutItems.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = totalAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const grandTotal = totalAmount + shippingFee;
  const remainingForFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - totalAmount, 0);
  const freeShippingProgress = Math.min((totalAmount / FREE_SHIPPING_THRESHOLD) * 100, 100);

  return (
    <section className="rounded-lg border p-6 lg:sticky lg:top-24">
      <h2 className="typo-h3">{t('orderItems')}</h2>

      <ul className="mt-4 divide-y text-sm">
        {checkoutItems.map((item) => (
          <li key={item.id} className="space-y-0.5 py-3">
            <p className="font-medium">{item.product.name}</p>
            {item.option && (
              <p className="text-xs text-muted-foreground">
                {item.option.name}: {item.option.value}
              </p>
            )}
            <p className="text-muted-foreground">
              {formatCurrency(item.unitPrice, locale)} × {item.quantity} = {formatCurrency(item.subtotal, locale)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
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

      <div className="mt-4 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('productAmount')}</span>
          <span className="typo-price">{formatCurrency(totalAmount, locale)}</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-muted-foreground">{t('shippingFee')}</span>
          <span className="typo-price">{shippingFee === 0 ? t('freeShipping') : formatCurrency(shippingFee, locale)}</span>
        </div>
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="flex items-end justify-between">
          <span className="typo-title">{t('total')}</span>
          <span className="typo-price-lg text-foreground">{formatCurrency(grandTotal, locale)}</span>
        </div>
      </div>
    </section>
  );
}
