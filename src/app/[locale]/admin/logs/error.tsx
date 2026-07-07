'use client';

import { useTranslations } from 'next-intl';

export default function AdminLogsError({ reset }: { reset: () => void }) {
  const t = useTranslations('admin.logs.errorBoundary');

  return (
    <div className="flex min-h-96 flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h2 className="typo-h3 font-semibold">{t('title')}</h2>
        <p className="mt-2 typo-body-sm text-muted-foreground">{t('description')}</p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 typo-button text-primary-foreground"
      >
        {t('retry')}
      </button>
    </div>
  );
}
