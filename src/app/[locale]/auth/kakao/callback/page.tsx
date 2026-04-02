'use client';

import { Suspense } from 'react';
import { authApi } from '@/lib/api';
import OAuthCallbackHandler from '@/components/auth/OAuthCallbackHandler';

function KakaoCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">카카오 로그인 처리 중...</p>
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={<KakaoCallbackFallback />}>
      <OAuthCallbackHandler provider="kakao" apiMethod={(code) => authApi.kakaoCallback(code)} />
    </Suspense>
  );
}
