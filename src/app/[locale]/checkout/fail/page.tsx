'use client';

import { Suspense, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { Locale } from '@/i18n/routing';
import { SESSION_KEYS } from '@/constants/storage';
import { useTranslations } from 'next-intl';

function CheckoutFailContent({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const t = useTranslations('checkoutResult');
  const code = searchParams.get('code') ?? '';
  const message = searchParams.get('message') ?? t('defaultFailMessage');

  useEffect(() => {
    toast.error(message);
    sessionStorage.removeItem(SESSION_KEYS.TOSS_CONTEXT);
    sessionStorage.removeItem(SESSION_KEYS.EXIMBAY_CONTEXT);
  }, [message]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-4 text-xl font-bold text-destructive">{t('failedTitle')}</h1>
      {code && (
        <p className="mb-2 text-xs text-muted-foreground">{t('errorCode', { code })}</p>
      )}
      <p className="mb-6 text-sm text-muted-foreground">{message}</p>
      <button
        onClick={() => router.replace(`/${locale}/checkout`)}
        className="rounded-md bg-foreground px-6 py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
      >
        {t('back')}
      </button>
    </div>
  );
}

export default function CheckoutFailPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {locale === 'en' ? 'Loading...' : '로딩 중...'}
          </p>
        </div>
      }
    >
      <CheckoutFailContent locale={locale} />
    </Suspense>
  );
}
