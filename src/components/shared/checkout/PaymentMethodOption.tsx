'use client';

import { useTranslations } from 'next-intl';
import type { CheckoutGatewayName } from '@/lib/api';
import { cn } from '@/components/ui/utils';
import { PaymentBrandIcon } from './PaymentBrandIcon';

interface PaymentMethodOptionProps {
  gateway: CheckoutGatewayName;
  selected?: boolean;
  onSelect?: (gateway: CheckoutGatewayName) => void;
  readOnly?: boolean;
}

export function PaymentMethodOption({
  gateway,
  selected = false,
  onSelect,
  readOnly = false,
}: PaymentMethodOptionProps) {
  const t = useTranslations('checkout');
  const label = getPaymentMethodLabel(gateway, t);

  return (
    <label
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-soft bg-card px-3 py-2 transition-colors',
        'hover:border-foreground/30 hover:bg-muted/30',
        selected && 'border-foreground bg-muted/35',
        readOnly && 'cursor-default hover:border-soft hover:bg-card',
      )}
      aria-label={label}
    >
      <input
        type="radio"
        name={readOnly ? 'paymentMethod' : 'checkoutGateway'}
        value={gateway}
        checked={selected}
        readOnly={readOnly}
        onChange={() => onSelect?.(gateway)}
        className="h-4 w-4 shrink-0 accent-foreground"
      />
      <span className="flex flex-1 items-center justify-between gap-3">
        <span className="flex items-center gap-2 typo-body-sm font-semibold text-foreground">
          <PaymentBrandIcon brand={gateway} />
          <span>{label}</span>
        </span>
      </span>
    </label>
  );
}

function getPaymentMethodLabel(
  gateway: CheckoutGatewayName,
  t: ReturnType<typeof useTranslations>,
): string {
  if (gateway === 'toss') return t('tossPayment');
  if (gateway === 'naverpay') return t('naverpayPayment');
  if (gateway === 'bank_transfer') return t('bankTransferPayment');
  if (gateway === 'paypal') return t('paypalPayment');
  return t('eximbayPayment');
}
