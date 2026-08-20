'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';
import { formatCurrency } from '@/utils/currency';
import type { Locale } from '@/i18n/routing';

interface FreeShippingProgressProps {
  locale: Locale;
  subtotalAmount: number;
  freeShippingThreshold: number;
  variant?: 'card' | 'top-edge';
  className?: string;
}

export function FreeShippingProgress({
  locale,
  subtotalAmount,
  freeShippingThreshold,
  variant = 'card',
  className,
}: FreeShippingProgressProps) {
  const t = useTranslations('checkout');
  const isTopEdge = variant === 'top-edge';
  const remainingForFreeShipping = Math.max(freeShippingThreshold - subtotalAmount, 0);
  const freeShippingProgress = freeShippingThreshold > 0
    ? Math.min((subtotalAmount / freeShippingThreshold) * 100, 100)
    : 100;

  const message = (
    <p className={cn(
      'text-xs text-muted-foreground',
      isTopEdge && 'checkout-toss-free-shipping__message px-4 pb-2 pt-3',
    )}>
        {remainingForFreeShipping === 0
          ? t('freeShippingUnlocked')
          : t('freeShippingRemaining', { amount: formatCurrency(remainingForFreeShipping, locale) })}
    </p>
  );
  const progressBar = (
    <div className={cn(
      'h-1.5 w-full rounded-full bg-background',
      isTopEdge && 'checkout-toss-free-shipping__progress mt-0 rounded-none',
    )}>
        <div
          className={cn(
            'h-full rounded-full bg-primary transition-[width] duration-300',
            isTopEdge && 'rounded-none',
          )}
          style={{ width: `${freeShippingProgress}%` }}
          aria-hidden
        />
    </div>
  );

  return (
    <div className={cn(
      'checkout-toss-free-shipping rounded-md bg-muted/20 p-3',
      isTopEdge && 'checkout-toss-free-shipping--top-edge rounded-none bg-transparent p-0',
      className,
    )}>
      {isTopEdge ? progressBar : message}
      {isTopEdge ? message : progressBar}
    </div>
  );
}
