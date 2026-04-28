'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Locale } from '@/i18n/routing';
import type { PreparePaymentResponse } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { SESSION_KEYS } from '@/constants/storage';

export interface PaymentGatewayHandle {
  confirm: () => Promise<void>;
}

interface PaymentGatewayProps {
  prepareResult: PreparePaymentResponse;
  orderId: number;
  orderNumber: string;
  amount: number;
  locale: Locale;
  onError: (message: string) => void;
}

// ─── Toss Payments (ko) ───────────────────────────────────────────────────────

const TossPaymentGateway = forwardRef<PaymentGatewayHandle, PaymentGatewayProps>(
  function TossPaymentGateway(
    { prepareResult, orderId, orderNumber, amount, locale, onError },
    ref,
  ) {
    const handlerRef = useRef<(() => Promise<void>) | null>(null);

    useEffect(() => {
      const origin = window.location.origin;

      const handler = async () => {
        try {
          const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
          const tossPayments = await loadTossPayments(prepareResult.clientKey);
          const payment = tossPayments.payment({ customerKey: `user_${orderId}` });

          sessionStorage.setItem(
            SESSION_KEYS.TOSS_CONTEXT,
            JSON.stringify({ orderId, orderNumber, amount }),
          );

          await payment.requestPayment({
            method: 'CARD',
            amount: { currency: 'KRW', value: amount },
            orderId: orderNumber,
            orderName: `주문 ${orderNumber}`,
            successUrl: `${origin}/${locale}/checkout/success`,
            failUrl: `${origin}/${locale}/checkout/fail`,
          });
        } catch (err) {
          onError(handleApiError(err, '결제 초기화 오류'));
        }
      };

      handlerRef.current = handler;

      return () => {
        handlerRef.current = null;
      };
    }, [prepareResult.clientKey, orderId, orderNumber, amount, locale, onError]);

    useImperativeHandle(ref, () => ({
      confirm: async () => {
        if (handlerRef.current) {
          await handlerRef.current();
        }
      },
    }));

    return (
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="radio"
          name="paymentMethod"
          value="toss"
          defaultChecked
          readOnly
          className="accent-foreground"
        />
        <span className="text-sm">토스페이먼츠 (카드)</span>
      </label>
    );
  },
);

// ─── Stripe Payment Element (en) ──────────────────────────────────────────────

const StripePaymentGateway = forwardRef<
  PaymentGatewayHandle,
  {
    clientSecret: string;
    publishableKey: string;
    locale: string;
    onError: (msg: string) => void;
  }
>(function StripePaymentGateway({ clientSecret, publishableKey, locale,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onError: _onError }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [mountError, setMountError] = useState<string | null>(null);
  const confirmRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!clientSecret || !publishableKey) {
      setMountError('Stripe 설정이 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    const stripeLocaleMap: Record<string, string> = {
      en: 'en',
    };
    const stripeLocale = stripeLocaleMap[locale] ?? 'auto';

    let mounted = true;

    import('@stripe/stripe-js').then(async ({ loadStripe }) => {
      if (!mounted || !containerRef.current) return;

      const stripeInstance = await loadStripe(publishableKey);
      if (!stripeInstance || !mounted || !containerRef.current) return;

      const elements = stripeInstance.elements({
        clientSecret,
        locale: stripeLocale as import('@stripe/stripe-js').StripeElementLocale,
      });

      const paymentElement = elements.create('payment');
      paymentElement.mount(containerRef.current);
      paymentElement.on('ready', () => {
        if (mounted) setLoading(false);
      });
      paymentElement.on('loaderror', () => {
        if (mounted) {
          setMountError('결제 수단을 불러오는데 실패했습니다.');
          setLoading(false);
        }
      });

      confirmRef.current = async () => {
        const { error } = await stripeInstance.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/${locale}/checkout/success`,
          },
        });
        if (error) {
          throw new Error(error.message ?? '결제에 실패했습니다.');
        }
      };
    });

    return () => {
      mounted = false;
      confirmRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret, publishableKey]);

  useImperativeHandle(ref, () => ({
    confirm: async () => {
      if (confirmRef.current) {
        await confirmRef.current();
      }
    },
  }));

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3">
        <input
          type="radio"
          name="paymentMethod"
          value="stripe"
          defaultChecked
          readOnly
          className="accent-foreground"
        />
        <span className="text-sm">Stripe (International Card)</span>
      </label>
      {loading && !mountError && (
        <p className="text-xs text-muted-foreground">결제 수단 불러오는 중...</p>
      )}
      {mountError && <p className="text-xs text-destructive">{mountError}</p>}
      <div ref={containerRef} className={loading ? 'sr-only' : undefined} />
    </div>
  );
});

// ─── Mock / fallback ──────────────────────────────────────────────────────────

const MockPaymentGateway = forwardRef<PaymentGatewayHandle>(
  function MockPaymentGateway(_props, ref) {
    useImperativeHandle(ref, () => ({
      confirm: async () => {
        // Mock gateway: no-op — caller handles mock payment directly
      },
    }));

    return (
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="radio"
          name="paymentMethod"
          value="mock"
          defaultChecked
          readOnly
          className="accent-foreground"
        />
        <span className="text-sm">테스트 결제 (Mock)</span>
      </label>
    );
  },
);

// ─── Public component ─────────────────────────────────────────────────────────

const PaymentGateway = forwardRef<PaymentGatewayHandle, PaymentGatewayProps>(
  function PaymentGateway(props, ref) {
    const { prepareResult, locale } = props;

    const isToss =
      locale === 'ko' &&
      prepareResult.clientKey &&
      prepareResult.clientKey !== 'mock_client_key';

    if (isToss) {
      return <TossPaymentGateway ref={ref} {...props} />;
    }

    const isStripe =
      prepareResult.gateway === 'stripe' &&
      prepareResult.clientKey &&
      prepareResult.clientKey !== 'mock_client_key';

    if (isStripe) {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
      return (
        <StripePaymentGateway
          ref={ref}
          clientSecret={prepareResult.clientKey}
          publishableKey={publishableKey}
          locale={locale}
          onError={props.onError}
        />
      );
    }

    return <MockPaymentGateway ref={ref} />;
  },
);

export default PaymentGateway;
