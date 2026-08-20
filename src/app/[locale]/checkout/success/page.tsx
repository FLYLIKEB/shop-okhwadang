'use client';

import { Suspense, use } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { handleApiError } from '@/utils/error';
import { useCart } from '@/contexts/CartContext';
import { guestPaymentsApi, paymentsApi, type ConfirmPaymentResponse, type GuestConfirmPaymentResponse } from '@/lib/api';
import type { Locale } from '@/i18n/routing';
import { SESSION_KEYS } from '@/constants/storage';
import { toastMessage } from '@/utils/toastMessages';
import { ApiHttpError } from '@/lib/api-error';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface HostedPaymentContext {
  orderId: number;
  orderNumber: string;
  amount: number;
  guestAccessToken?: string;
  guestAccessTokenExpiresAt?: string;
}

function clearHostedProviderContexts(): void {
  sessionStorage.removeItem(SESSION_KEYS.TOSS_CONTEXT);
  sessionStorage.removeItem(SESSION_KEYS.PAYPAL_CONTEXT);
  sessionStorage.removeItem(SESSION_KEYS.NAVERPAY_CONTEXT);
  sessionStorage.removeItem(SESSION_KEYS.EXIMBAY_CONTEXT);
}

function clearCheckoutState(): void {
  sessionStorage.removeItem(SESSION_KEYS.CHECKOUT_ITEMS);
  clearHostedProviderContexts();
}

function getHostedConfirmOperationKey(providerContextKey: string, orderId: number): string {
  const storageKey = `${SESSION_KEYS.PAYMENT_CONFIRM_OPERATION_PREFIX}${providerContextKey}:${orderId}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing && /^[A-Za-z0-9-]{36}$/.test(existing)) return existing;
  const key = crypto.randomUUID();
  sessionStorage.setItem(storageKey, key);
  return key;
}

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
    const eximbayRescode = searchParams.get('rescode');
    const eximbayTransactionId = searchParams.get('transaction_id');
    const isEximbayReturn = eximbayRescode !== null || eximbayTransactionId !== null;
    const paymentKey = paypalToken
      ?? naverPayPaymentId
      ?? (isEximbayReturn ? searchParams.toString() : searchParams.get('paymentKey'));
    const tossOrderId = searchParams.get('orderId');
    const amountParam = searchParams.get('amount');
    const contextKey = paypalToken
      ? SESSION_KEYS.PAYPAL_CONTEXT
      : isNaverPayReturn
        ? SESSION_KEYS.NAVERPAY_CONTEXT
        : isEximbayReturn
          ? SESSION_KEYS.EXIMBAY_CONTEXT
          : SESSION_KEYS.TOSS_CONTEXT;

    if (isNaverPayReturn && naverPayResultCode !== 'Success') {
      toast.error(searchParams.get('resultMessage') ?? toastMessage('paymentInvalidInfo'));
      router.replace(`/${locale}/cart`);
      return;
    }

    if (isEximbayReturn && eximbayRescode !== '0000') {
      toast.error(searchParams.get('resmsg') ?? toastMessage('paymentInvalidInfo'));
      router.replace(`/${locale}/cart`);
      return;
    }

    if (
      !paymentKey ||
      (!paypalToken && !isNaverPayReturn && !isEximbayReturn && (!tossOrderId || !amountParam))
    ) {
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

    let ctx: HostedPaymentContext;
    try {
      ctx = JSON.parse(raw) as HostedPaymentContext;
    } catch {
      toast.error(toastMessage('paymentContextMissing'));
      router.replace(`/${locale}/cart`);
      return;
    }

    if (!paypalToken && !isNaverPayReturn && !isEximbayReturn) {
      const amount = Number(amountParam);
      if (amount !== ctx.amount) {
        toast.error(toastMessage('paymentAmountMismatch'));
        router.replace(`/${locale}/cart`);
        return;
      }
    }

    const isGuestConfirmResponse = (
      result: ConfirmPaymentResponse | GuestConfirmPaymentResponse,
    ): result is GuestConfirmPaymentResponse => 'guestAccessToken' in result;
    const idempotencyKey = getHostedConfirmOperationKey(contextKey, ctx.orderId);

    const confirmPromise: Promise<ConfirmPaymentResponse | GuestConfirmPaymentResponse> = ctx.guestAccessToken
      ? guestPaymentsApi.confirm(
          ctx.orderId,
          { paymentKey, amount: ctx.amount },
          ctx.guestAccessToken,
          { headers: { 'Idempotency-Key': idempotencyKey } },
        )
      : paymentsApi.confirm(
          { orderId: ctx.orderId, paymentKey, amount: ctx.amount },
          { headers: { 'Idempotency-Key': idempotencyKey } },
        );

    confirmPromise
      .then(async (result) => {
        toast.success(toastMessage('paymentComplete'));
        clearCheckoutState();

        if (isGuestConfirmResponse(result)) {
          sessionStorage.setItem(
            SESSION_KEYS.GUEST_ORDER_CONTEXT,
            JSON.stringify({
              orderId: result.orderId,
              orderNumber: result.orderNumber,
              guestAccessToken: result.guestAccessToken,
              guestAccessTokenExpiresAt: result.guestAccessTokenExpiresAt,
            }),
          );
        }

        await refetch();
        router.replace(
          isGuestConfirmResponse(result)
            ? `/${locale}/order/complete?orderId=${result.orderId}&orderNumber=${result.orderNumber}&flow=guest`
            : `/${locale}/order/complete?orderId=${ctx.orderId}&orderNumber=${ctx.orderNumber}`,
        );
      })
      .catch((err: unknown) => {
        if (ctx.guestAccessToken && err instanceof ApiHttpError && err.status === 401) {
          clearCheckoutState();
          sessionStorage.removeItem(SESSION_KEYS.GUEST_ORDER_CONTEXT);
          toast.error(t('guestAccessExpired'));
          router.replace(`/${locale}/order/lookup`);
          return;
        }

        toast.error(handleApiError(err, toastMessage('paymentConfirmError')));
        setProcessing(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!processing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-4 text-xl font-bold text-destructive">{t('confirmFailedTitle')}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t('confirmFailedDescription')}</p>
        <Button
          variant="black"
          onClick={() => router.replace(`/${locale}/cart`)}
        >
          {t('backToCart')}
        </Button>
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
  const t = useTranslations('checkoutResult');

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="mb-4 text-xl font-bold">{t('processingTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('processingDescription')}</p>
        </div>
      }
    >
      <CheckoutSuccessContent locale={locale} />
    </Suspense>
  );
}
