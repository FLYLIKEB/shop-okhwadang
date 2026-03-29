'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';

function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const storedState = sessionStorage.getItem('oauth_state');

    if (!code) {
      toast.error('인증 코드가 없습니다.');
      router.replace('/login');
      return;
    }

    if (state !== storedState) {
      toast.error('보안 검증에 실패했습니다. 다시 시도해 주세요.');
      router.replace('/login');
      return;
    }

    sessionStorage.removeItem('oauth_state');

    authApi
      .googleCallback(code)
      .then((res) => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        toast.success('Google 로그인되었습니다.');
        window.location.href = '/';
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.');
        router.replace('/login');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Google 로그인 처리 중...</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Google 로그인 처리 중...</p>
        </div>
      }
    >
      <GoogleCallbackInner />
    </Suspense>
  );
}
