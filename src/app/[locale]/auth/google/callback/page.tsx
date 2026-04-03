'use client';

import { Suspense } from 'react';
import { authApi } from '@/lib/api';
import OAuthCallbackHandler from '@/components/auth/OAuthCallbackHandler';

function GoogleCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Google 로그인 처리 중...</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<GoogleCallbackFallback />}>
      <OAuthCallbackHandler provider="google" apiMethod={authApi.googleCallback} />
    </Suspense>
  );
}
