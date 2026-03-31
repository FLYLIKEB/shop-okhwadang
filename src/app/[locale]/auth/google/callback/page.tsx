'use client';

import { Suspense } from 'react';
import { authApi } from '@/lib/api';
import OAuthCallbackHandler from '@/components/auth/OAuthCallbackHandler';

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">google 로그인 처리 중...</p>
        </div>
      }
    >
      <OAuthCallbackHandler
        provider="google"
        apiMethod={(code) => authApi.googleCallback(code)}
      />
    </Suspense>
  );
}
