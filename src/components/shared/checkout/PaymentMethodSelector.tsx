'use client';

import { useTranslations } from 'next-intl';
import type { CheckoutGatewayName } from '@/lib/api';
import { SecureCardEntryShell } from './SecureCardEntryShell';
import { PaymentMethodOption } from './PaymentMethodOption';

interface PaymentMethodSelectorProps {
  gatewayOptions: CheckoutGatewayName[];
  selectedGateway: CheckoutGatewayName;
  onSelect: (gateway: CheckoutGatewayName) => void;
  showCardSubmitButton?: boolean;
}

export function PaymentMethodSelector({
  gatewayOptions,
  selectedGateway,
  onSelect,
  showCardSubmitButton = false,
}: PaymentMethodSelectorProps) {
  const t = useTranslations('checkout');

  return (
    <div className="layout-stack-sm">
      <div className="layout-stack-md" role="radiogroup" aria-label={t('paymentMethod')}>
        <div className="grid gap-2">
          {gatewayOptions.map((gateway) => (
            <PaymentMethodOption
              key={gateway}
              gateway={gateway}
              selected={selectedGateway === gateway}
              onSelect={onSelect}
            />
          ))}
        </div>

        {gatewayOptions.includes('eximbay') && selectedGateway === 'eximbay' && (
          <SecureCardEntryShell showSubmitButton={showCardSubmitButton} />
        )}
      </div>
    </div>
  );
}
