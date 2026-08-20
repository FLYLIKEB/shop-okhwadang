'use client';

import { CircleHelp, LockKeyhole } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/components/ui/utils';
import { PaymentBrandIcon } from './PaymentBrandIcon';

interface SecureCardEntryShellProps {
  showSubmitButton?: boolean;
}

const CARD_BRANDS = ['visa', 'mastercard', 'amex'] as const;

export function SecureCardEntryShell({ showSubmitButton = false }: SecureCardEntryShellProps) {
  const t = useTranslations('checkout');

  return (
    <div className="layout-stack-md text-left" data-testid="secure-card-entry-shell">
      <div>
        <p className="typo-h3 font-bold text-foreground">{t('cardPaymentTitle')}</p>
        <p className="mt-1 typo-body-sm text-muted-foreground">{t('cardPaymentSubtitle')}</p>
      </div>

      <div className="overflow-hidden surface-card text-card-foreground">
        <div className="flex min-h-14 items-center justify-between gap-3 bg-muted/45 px-4 py-3">
          <span className="typo-body-sm font-medium text-foreground">{t('creditCardTitle')}</span>
          <div className="flex shrink-0 items-center gap-1.5" aria-label={t('cardBrandsLabel')}>
            {CARD_BRANDS.map((brand) => (
              <PaymentBrandIcon key={brand} brand={brand} />
            ))}
          </div>
        </div>

        <div className="border-t border-soft p-4">
          <div className="grid gap-3">
            <SecureInputPreview
              placeholder={t('cardNumberPlaceholder')}
              icon="lock"
              ariaLabel={t('cardNumberLabel')}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <SecureInputPreview
                placeholder={t('cardExpiryPlaceholder')}
                ariaLabel={t('cardExpiryLabel')}
              />
              <SecureInputPreview
                placeholder={t('cardCvcPlaceholder')}
                icon="help"
                ariaLabel={t('cardCvcLabel')}
              />
            </div>
            <SecureInputPreview
              placeholder={t('cardHolderPlaceholder')}
              ariaLabel={t('cardHolderLabel')}
            />
          </div>

          <label className="mt-4 flex items-center gap-3 typo-body-sm text-foreground">
            <Checkbox
              checked
              readOnly
              aria-label={t('billingSameAsShipping')}
            />
            {t('billingSameAsShipping')}
          </label>
        </div>
      </div>

      <div className="border-t border-dashed border-soft pt-4">
        <label className="flex items-start gap-3 typo-body-sm text-muted-foreground">
          <Checkbox
            aria-label={t('cardTermsAriaLabel')}
          />
          <span>{t('cardTermsAgreement')}</span>
        </label>
      </div>

      {showSubmitButton && (
        <Button type="submit" form="checkout-form" className="w-full">
          {t('payNow')}
        </Button>
      )}

      <p className="typo-label text-muted-foreground">{t('cardSecurePageNotice')}</p>
    </div>
  );
}

function SecureInputPreview({
  placeholder,
  ariaLabel,
  icon,
}: {
  placeholder: string;
  ariaLabel: string;
  icon?: 'lock' | 'help';
}) {
  return (
    <div className="relative">
      <input
        aria-label={ariaLabel}
        readOnly
        tabIndex={-1}
        placeholder={placeholder}
        className={cn(
          'min-h-11 w-full rounded-md border field-soft px-3 typo-body-sm text-foreground placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          icon ? 'pr-10' : '',
        )}
      />
      {icon && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
          {icon === 'lock' ? <LockKeyhole className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}
        </span>
      )}
    </div>
  );
}
