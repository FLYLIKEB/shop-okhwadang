'use client';

import { Suspense, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { Locale } from '@/i18n/routing';
import { SESSION_KEYS } from '@/constants/storage';

function CheckoutFailContent({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get('code') ?? '';
  const message = searchParams.get('message') ?? '결제에 실패했습니다.';

  useEffect(() => {
    toast.error(message);
    sessionStorage.removeItem(SESSION_KEYS.TOSS_CONTEXT);
  }, [message]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-4 text-xl font-bold text-destructive">결제 실패</h1>
      {code && (
        <p className="mb-2 text-xs text-muted-foreground">오류 코드: {code}</p>
      )}
      <p className="mb-6 text-sm text-muted-foreground">{message}</p>
      <button
        onClick={() => router.replace(`/${locale}/checkout`)}
        className="rounded-md bg-foreground px-6 py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
      >
        돌아가기
      </button>
    </div>
  );
}

export default function CheckoutFailPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <CheckoutFailContent locale={locale} />
    </Suspense>
  );
}
