'use client';

import { useTranslations } from 'next-intl';
import type { CheckoutGatewayName } from '@/lib/api';
import { cn } from '@/components/ui/utils';

interface PaymentMethodSelectorProps {
  gatewayOptions: CheckoutGatewayName[];
  selectedGateway: CheckoutGatewayName;
  onSelect: (gateway: CheckoutGatewayName) => void;
}

export function PaymentMethodSelector({
  gatewayOptions,
  selectedGateway,
  onSelect,
}: PaymentMethodSelectorProps) {
  const t = useTranslations('checkout');

  const labels: Record<CheckoutGatewayName, string> = {
    naverpay: t('naverpayPayment'),
    eximbay: t('eximbayPayment'),
    paypal: t('paypalPayment'),
  };

  const descriptions: Partial<Record<CheckoutGatewayName, string>> = {
    naverpay: t('naverpayDomesticHint'),
    eximbay: t('eximbayHostedPaymentHint'),
    paypal: t('paypalRedirectHint'),
  };

  return (
    <div className="layout-stack-sm">
      <p className="typo-body-sm text-muted-foreground">{t('paymentMethodHint')}</p>
      <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label={t('paymentMethod')}>
        {gatewayOptions.map((gateway) => (
          <label
            key={gateway}
            className={cn(
              'flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors',
              selectedGateway === gateway ? 'bg-muted/40' : 'bg-background',
            )}
          >
            <input
              type="radio"
              name="checkoutGateway"
              value={gateway}
              checked={selectedGateway === gateway}
              onChange={() => onSelect(gateway)}
              className="mt-1 accent-foreground"
            />
            <span className="layout-stack-xs">
              <span className="flex items-center gap-2 typo-body-sm text-foreground">
                {labels[gateway]}
                {gateway === 'naverpay' && (
                  <span
                    className="rounded-sm bg-muted px-2 py-0.5 typo-label text-muted-foreground"
                    title={t('naverpayDomesticHint')}
                  >
                    {t('naverpayDomesticBadge')}
                  </span>
                )}
              </span>
              {descriptions[gateway] && (
                <span className="typo-label text-muted-foreground">{descriptions[gateway]}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
