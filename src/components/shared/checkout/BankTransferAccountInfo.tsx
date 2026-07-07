'use client';

import { useTranslations } from 'next-intl';

interface BankTransferAccountInfoProps {
  compact?: boolean;
}

export function BankTransferAccountInfo({ compact = false }: BankTransferAccountInfoProps) {
  const t = useTranslations('checkout');

  return (
    <div className="rounded-md border border-soft bg-muted/25 p-4" data-testid="bank-transfer-account-info">
      <p className="typo-body-sm font-semibold text-foreground">{t('bankTransferAccountTitle')}</p>
      <dl className="mt-3 grid gap-2 typo-body-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">{t('bankTransferBankLabel')}</dt>
          <dd className="font-medium text-foreground">{t('bankTransferBankName')}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">{t('bankTransferAccountLabel')}</dt>
          <dd className="font-mono font-semibold tracking-wide text-foreground">{t('bankTransferAccountNumber')}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">{t('bankTransferHolderLabel')}</dt>
          <dd className="font-medium text-foreground">{t('bankTransferAccountHolder')}</dd>
        </div>
      </dl>
      {!compact && (
        <p className="mt-3 typo-label leading-relaxed text-muted-foreground">
          {t('bankTransferAccountNote')}
        </p>
      )}
    </div>
  );
}
