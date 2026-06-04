'use client';

import { Suspense, use } from 'react';
import { authApi } from '@/lib/api';
import OAuthCallbackHandler from '@/components/shared/auth/OAuthCallbackHandler';

function GoogleCallbackFallback({ locale }: { locale: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">
        {locale === 'en' ? 'Processing Google login...' : 'Google 로그인 처리 중...'}
      </p>
    </div>
  );
}

export default function GoogleCallbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);

  return (
    <Suspense fallback={<GoogleCallbackFallback locale={locale} />}>
      <OAuthCallbackHandler provider="google" apiMethod={authApi.googleCallback} />
    </Suspense>
  );
}
