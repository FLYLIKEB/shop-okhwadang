'use client';

import { Suspense } from 'react';
import { authApi } from '@/lib/api';
import OAuthCallbackHandler from '@/components/auth/OAuthCallbackHandler';

export default function KakaoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">kakao 로그인 처리 중...</p>
        </div>
      }
    >
      <OAuthCallbackHandler
        provider="kakao"
        apiMethod={(code) => authApi.kakaoCallback(code)}
      />
    </Suspense>
  );
}
