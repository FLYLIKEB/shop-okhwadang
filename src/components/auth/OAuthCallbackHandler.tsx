'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AuthTokenResponse } from '@/lib/api';
import { handleApiError } from '@/utils/error';

interface OAuthCallbackHandlerProps {
  provider: 'kakao' | 'google';
  apiMethod: (code: string, state: string | null) => Promise<AuthTokenResponse>;
}

export default function OAuthCallbackHandler({ provider, apiMethod }: OAuthCallbackHandlerProps) {
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

    if (!state || !storedState || state !== storedState) {
      toast.error('보안 검증에 실패했습니다. 다시 시도해 주세요.');
      router.replace('/login');
      return;
    }

    sessionStorage.removeItem('oauth_state');

    apiMethod(code, state)
      .then(() => {
        toast.success(`${provider} 로그인되었습니다.`);
        window.location.href = '/';
      })
      .catch((err: unknown) => {
        toast.error(handleApiError(err, `${provider} 로그인에 실패했습니다.`));
        router.replace('/login');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">{provider} 로그인 처리 중...</p>
    </div>
  );
}
