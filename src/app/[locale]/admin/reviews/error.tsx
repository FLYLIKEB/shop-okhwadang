'use client';

import { useTranslations } from 'next-intl';

export default function AdminReviewsError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('admin.reviews.error');
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="typo-h2 font-semibold">{t('title')}</h1>
      <p className="mt-3 typo-body-sm text-muted-foreground">{t('description')}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded bg-primary px-4 py-2 typo-body-sm text-primary-foreground"
      >
        {t('retry')}
      </button>
    </div>
  );
}
