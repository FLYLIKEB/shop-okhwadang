'use client';

import { Suspense, use } from 'react';
import { authApi } from '@/lib/api';
import OAuthCallbackHandler from '@/components/shared/auth/OAuthCallbackHandler';

function KakaoCallbackFallback({ locale }: { locale: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">
        {locale === 'en' ? 'Processing Kakao login...' : 'Kakao 로그인 처리 중...'}
      </p>
    </div>
  );
}

export default function KakaoCallbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);

  return (
    <Suspense fallback={<KakaoCallbackFallback locale={locale} />}>
      <OAuthCallbackHandler provider="kakao" apiMethod={authApi.kakaoCallback} />
    </Suspense>
  );
}
