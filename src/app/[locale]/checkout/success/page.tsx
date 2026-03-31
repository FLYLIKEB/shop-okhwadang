'use client';

import { Suspense, use } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { paymentsApi } from '@/lib/api';
import type { Locale } from '@/i18n/routing';

function CheckoutSuccessContent({ locale }: { locale: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refetch } = useCart();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey');
    const tossOrderId = searchParams.get('orderId');
    const amountParam = searchParams.get('amount');

    if (!paymentKey || !tossOrderId || !amountParam) {
      toast.error('결제 정보가 올바르지 않습니다.');
      router.replace(`/${locale}/cart`);
      return;
    }

    const raw = sessionStorage.getItem('tossPaymentContext');
    if (!raw) {
      toast.error('결제 컨텍스트를 찾을 수 없습니다.');
      router.replace(`/${locale}/cart`);
      return;
    }

    const ctx = JSON.parse(raw) as {
      orderId: number;
      orderNumber: string;
      amount: number;
    };

    const amount = Number(amountParam);
    if (amount !== ctx.amount) {
      toast.error('결제 금액이 일치하지 않습니다.');
      router.replace(`/${locale}/cart`);
      return;
    }

    paymentsApi
      .confirm({ orderId: ctx.orderId, paymentKey, amount })
      .then(async () => {
        toast.success('결제가 완료되었습니다.');
        sessionStorage.removeItem('checkoutItems');
        sessionStorage.removeItem('tossPaymentContext');
        await refetch();
        router.replace(
          `/${locale}/order/complete?orderId=${ctx.orderId}&orderNumber=${ctx.orderNumber}`,
        );
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : '결제 확인 중 오류가 발생했습니다.';
        toast.error(message);
        setProcessing(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!processing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-4 text-xl font-bold text-destructive">결제 확인 실패</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          결제 확인 중 문제가 발생했습니다. 고객센터에 문의해주세요.
        </p>
        <button
          onClick={() => router.replace(`/${locale}/cart`)}
          className="rounded-md bg-foreground px-6 py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
        >
          장바구니로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-4 text-xl font-bold">결제 처리 중...</h1>
      <p className="text-sm text-muted-foreground">잠시만 기다려주세요.</p>
    </div>
  );
}

export default function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="mb-4 text-xl font-bold">결제 처리 중...</h1>
          <p className="text-sm text-muted-foreground">잠시만 기다려주세요.</p>
        </div>
      }
    >
      <CheckoutSuccessContent locale={locale} />
    </Suspense>
  );
}
