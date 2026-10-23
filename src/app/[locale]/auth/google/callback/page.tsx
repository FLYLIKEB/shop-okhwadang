'use client';

import { Suspense, use } from 'react';
import { authApi } from '@/lib/api';
import OAuthCallbackHandler from '@/components/shared/auth/OAuthCallbackHandler';
import { localMessage } from '@/utils/localMessages';

function GoogleCallbackFallback({ locale }: { locale: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">
        {localMessage('auth.processingOAuth', { provider: 'Google' }, locale === 'en' ? 'en' : 'ko')}
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
