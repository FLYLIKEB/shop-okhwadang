'use client';

import { Suspense, use } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { useCart } from '@/contexts/CartContext';
import { paymentsApi } from '@/lib/api';
import type { Locale } from '@/i18n/routing';
import { SESSION_KEYS } from '@/constants/storage';
import { toastMessage } from '@/utils/toastMessages';
import { useTranslations } from 'next-intl';

function CheckoutSuccessContent({ locale }: { locale: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refetch } = useCart();
  const t = useTranslations('checkoutResult');
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const paypalToken = searchParams.get('token');
    const naverPayResultCode = searchParams.get('resultCode');
    const naverPayPaymentId = searchParams.get('paymentId');
    const isNaverPayReturn = naverPayResultCode !== null || naverPayPaymentId !== null;
    const paymentKey = paypalToken ?? naverPayPaymentId ?? searchParams.get('paymentKey');
    const tossOrderId = searchParams.get('orderId');
    const amountParam = searchParams.get('amount');
    const contextKey = paypalToken
      ? SESSION_KEYS.PAYPAL_CONTEXT
      : isNaverPayReturn
        ? SESSION_KEYS.NAVERPAY_CONTEXT
        : SESSION_KEYS.TOSS_CONTEXT;

    if (isNaverPayReturn && naverPayResultCode !== 'Success') {
      toast.error(searchParams.get('resultMessage') ?? toastMessage('paymentInvalidInfo'));
      router.replace(`/${locale}/cart`);
      return;
    }

    if (!paymentKey || (!paypalToken && !isNaverPayReturn && (!tossOrderId || !amountParam))) {
      toast.error(toastMessage('paymentInvalidInfo'));
      router.replace(`/${locale}/cart`);
      return;
    }

    const raw = sessionStorage.getItem(contextKey);
    if (!raw) {
      toast.error(toastMessage('paymentContextMissing'));
      router.replace(`/${locale}/cart`);
      return;
    }

    const ctx = JSON.parse(raw) as {
      orderId: number;
      orderNumber: string;
      amount: number;
    };

    if (!paypalToken && !isNaverPayReturn) {
      const amount = Number(amountParam);
      if (amount !== ctx.amount) {
        toast.error(toastMessage('paymentAmountMismatch'));
        router.replace(`/${locale}/cart`);
        return;
      }
    }

    paymentsApi
      .confirm({ orderId: ctx.orderId, paymentKey, amount: ctx.amount })
      .then(async () => {
        toast.success(toastMessage('paymentComplete'));
        sessionStorage.removeItem(SESSION_KEYS.CHECKOUT_ITEMS);
        sessionStorage.removeItem(SESSION_KEYS.TOSS_CONTEXT);
        sessionStorage.removeItem(SESSION_KEYS.PAYPAL_CONTEXT);
        sessionStorage.removeItem(SESSION_KEYS.NAVERPAY_CONTEXT);
        await refetch();
        router.replace(
          `/${locale}/order/complete?orderId=${ctx.orderId}&orderNumber=${ctx.orderNumber}`,
        );
      })
      .catch((err: unknown) => {
        toast.error(handleApiError(err, toastMessage('paymentConfirmError')));
        setProcessing(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!processing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-4 text-xl font-bold text-destructive">{t('confirmFailedTitle')}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {t('confirmFailedDescription')}
        </p>
        <button
          onClick={() => router.replace(`/${locale}/cart`)}
          className="rounded-md bg-foreground px-6 py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
        >
          {t('backToCart')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-4 text-xl font-bold">{t('processingTitle')}</h1>
      <p className="text-sm text-muted-foreground">{t('processingDescription')}</p>
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
          <h1 className="mb-4 text-xl font-bold">
            {locale === 'en' ? 'Processing payment...' : '결제 처리 중...'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {locale === 'en' ? 'Please wait a moment.' : '잠시만 기다려주세요.'}
          </p>
        </div>
      }
    >
      <CheckoutSuccessContent locale={locale} />
    </Suspense>
  );
}
