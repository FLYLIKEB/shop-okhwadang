'use client';

import Image from 'next/image';
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
  thumbnailUrl?: string | null;
  imageAlt?: string | null;
}

interface OrderSummarySectionProps {
  pricedItems: CheckoutPricingItem[];
  locale: Locale;
  subtotalAmount: number;
  shippingFee: number;
  couponDiscount?: number;
  pointsUsed?: number;
  totalPayable: number;
}

export function OrderSummarySection({
  pricedItems,
  locale,
  subtotalAmount,
  shippingFee,
  couponDiscount = 0,
  pointsUsed = 0,
  totalPayable,
}: OrderSummarySectionProps) {
  const t = useTranslations('checkout');

  return (
    <section className="surface-card p-6">
      <h2 className="typo-h3">{t('orderItems')}</h2>

      <ul className="mt-4 divide-y divide-soft text-sm">
        {pricedItems.map((item) => (
          <li key={`${item.productId}:${item.productOptionId ?? 'none'}`} className="space-y-0.5 py-3">
            <div className="flex items-start gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.thumbnailUrl && (
                  <Image
                    src={item.thumbnailUrl}
                    alt={item.imageAlt ?? item.productName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="font-medium">{item.productName}</p>
                {item.optionName && (
                  <p className="text-xs text-muted-foreground">{item.optionName}</p>
                )}
                <p className="text-muted-foreground">
                  {formatCurrency(item.unitPrice, locale)} × {item.quantity} = {formatCurrency(item.subtotal, locale)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

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
