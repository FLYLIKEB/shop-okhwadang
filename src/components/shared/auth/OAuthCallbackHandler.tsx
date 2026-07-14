'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AuthTokenResponse } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { LOCAL_KEYS, SESSION_KEYS } from '@/constants/storage';

import { toastMessage } from '@/utils/toastMessages';
import { localMessage } from '@/utils/localMessages';

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
    const storedState = sessionStorage.getItem(SESSION_KEYS.OAUTH_STATE);

    if (!code) {
      toast.error(toastMessage('oauthMissingCode'));
      router.replace('/login');
      return;
    }

    if (!state || !storedState || state !== storedState) {
      toast.error(toastMessage('oauthStateFailed'));
      router.replace('/login');
      return;
    }

    sessionStorage.removeItem(SESSION_KEYS.OAUTH_STATE);

    apiMethod(code, state)
      .then(() => {
        toast.success(toastMessage('oauthLoginSuccess', { provider }));
        try {
          window.localStorage.setItem(LOCAL_KEYS.AUTH_SESSION_HINT, 'present');
        } catch {
          // ignore storage errors
        }
        window.location.href = '/';
      })
      .catch((err: unknown) => {
        toast.error(handleApiError(err, toastMessage('oauthLoginError', { provider })));
        router.replace('/login');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">{localMessage('auth.processingOAuth', { provider })}</p>
    </div>
  );
}
