'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/utils';

interface SecureCardEntryShellProps {
  selected?: boolean;
  onSelect?: () => void;
  showSubmitButton?: boolean;
}

const CARD_BRANDS = ['Visa', 'Mastercard', 'Amex'] as const;

export function SecureCardEntryShell({
  selected = true,
  onSelect,
  showSubmitButton = false,
}: SecureCardEntryShellProps) {
  const t = useTranslations('checkout');

  return (
    <div className="layout-stack-md text-left" data-testid="secure-card-entry-shell">
      <div>
        <p className="text-xl font-bold text-foreground">{t('cardPaymentTitle')}</p>
        <p className="mt-1 typo-body-sm text-muted-foreground">{t('cardPaymentSubtitle')}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-foreground bg-background">
        <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3" style={{ backgroundColor: '#F6F6F6' }}>
          <label className="flex cursor-pointer items-center gap-3">
            {onSelect && (
              <input
                type="radio"
                name="checkoutGateway"
                value="eximbay"
                checked={selected}
                onChange={onSelect}
                className="accent-foreground"
              />
            )}
            <span className="typo-body-sm font-bold text-foreground">{t('creditCardTitle')}</span>
          </label>
          <div className="flex shrink-0 items-center gap-1" aria-label={t('cardBrandsLabel')}>
            {CARD_BRANDS.map((brand) => (
              <span
                key={brand}
                className="rounded-sm border border-border bg-background px-2 py-1 typo-label font-semibold text-foreground shadow-sm"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-border p-4">
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
            <input
              type="checkbox"
              checked
              readOnly
              aria-label={t('billingSameAsShipping')}
              className="h-4 w-4 rounded-sm accent-foreground"
            />
            {t('billingSameAsShipping')}
          </label>
        </div>
      </div>

      <div className="border-t border-dashed border-border pt-4">
        <label className="flex items-start gap-3 typo-body-sm text-muted-foreground">
          <input
            type="checkbox"
            aria-label={t('cardTermsAriaLabel')}
            className="mt-0.5 h-4 w-4 rounded-sm accent-foreground"
          />
          <span>{t('cardTermsAgreement')}</span>
        </label>
      </div>

      {showSubmitButton && (
        <button
          type="submit"
          form="checkout-form"
          className="min-h-11 w-full rounded-md px-4 py-3 typo-body-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#8FA8C4' }}
        >
          {t('payNow')}
        </button>
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
          'min-h-11 w-full rounded-md border border-border bg-background px-3 typo-body-sm text-foreground placeholder:text-muted-foreground',
          icon ? 'pr-10' : '',
        )}
      />
      {icon && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
          {icon === 'lock' ? '🔒' : '?'}
        </span>
      )}
    </div>
  );
}
