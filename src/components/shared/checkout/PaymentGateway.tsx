'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import type { PreparePaymentResponse } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { SESSION_KEYS } from '@/constants/storage';
import { SecureCardEntryShell } from './SecureCardEntryShell';
import { PaymentMethodOption } from './PaymentMethodOption';

export interface PaymentGatewayHandle {
  confirm: () => Promise<void>;
}


type NaverPayMode = 'development' | 'production';

interface NaverPayObject {
  open: (params: {
    merchantUserKey: string;
    merchantPayKey: string;
    productName: string;
    totalPayAmount: number;
    taxScopeAmount: number;
    taxExScopeAmount: number;
    returnUrl: string;
  }) => void;
}

interface NaverPayNamespace {
  Pay?: {
    create: (config: {
      mode: NaverPayMode;
      payType: 'normal';
      clientId: string;
      chainId: string;
    }) => NaverPayObject;
  };
}

interface EximbayNamespace {
  request_pay: (params: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    Naver?: NaverPayNamespace;
    EXIMBAY?: EximbayNamespace;
  }
}

const NAVERPAY_SDK_SRC = 'https://nsp.pay.naver.com/sdk/js/naverpay.min.js';
let naverPaySdkPromise: Promise<void> | null = null;
let eximbaySdkPromise: Promise<void> | null = null;

function loadNaverPaySdk(): Promise<void> {
  if (window.Naver?.Pay) return Promise.resolve();
  if (naverPaySdkPromise) return naverPaySdkPromise;

  naverPaySdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${NAVERPAY_SDK_SRC}"]`);
    const script = existing ?? document.createElement('script');
    script.src = NAVERPAY_SDK_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Naver?.Pay) {
        resolve();
      } else {
        naverPaySdkPromise = null;
        reject(new Error('naverpay_sdk_init_failed'));
      }
    };
    script.onerror = () => {
      naverPaySdkPromise = null;
      reject(new Error('naverpay_sdk_load_failed'));
    };
    if (!existing) document.body.appendChild(script);
  });

  return naverPaySdkPromise;
}

function getGatewayPayloadString(
  prepareResult: PreparePaymentResponse,
  key: string,
): string | undefined {
  const value = prepareResult.gatewayPayload?.[key];
  return typeof value === 'string' ? value : undefined;
}

function getGatewayPayloadObject(
  prepareResult: PreparePaymentResponse,
  key: string,
): Record<string, unknown> {
  const value = getGatewayPayloadString(prepareResult, key);
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function loadEximbaySdk(src: string): Promise<void> {
  if (window.EXIMBAY?.request_pay) return Promise.resolve();
  if (eximbaySdkPromise) return eximbaySdkPromise;

  eximbaySdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      if (window.EXIMBAY?.request_pay) {
        resolve();
      } else {
        eximbaySdkPromise = null;
        reject(new Error('eximbay_sdk_init_failed'));
      }
    };
    script.onerror = () => {
      eximbaySdkPromise = null;
      reject(new Error('eximbay_sdk_load_failed'));
    };
    if (!existing) document.body.appendChild(script);
  });

  return eximbaySdkPromise;
}

interface PaymentGatewayProps {
  prepareResult: PreparePaymentResponse;
  orderId: number;
  orderNumber: string;
  amount: number;
  locale: Locale;
  guestAccessToken?: string;
  guestAccessTokenExpiresAt?: string;
  onError: (message: string) => void;
}

function buildHostedPaymentContext({
  orderId,
  orderNumber,
  amount,
  guestAccessToken,
  guestAccessTokenExpiresAt,
}: Pick<
  PaymentGatewayProps,
  'orderId' | 'orderNumber' | 'amount' | 'guestAccessToken' | 'guestAccessTokenExpiresAt'
>): {
  orderId: number;
  orderNumber: string;
  amount: number;
  guestAccessToken?: string;
  guestAccessTokenExpiresAt?: string;
} {
  return {
    orderId,
    orderNumber,
    amount,
    ...(guestAccessToken
      ? {
          guestAccessToken,
          guestAccessTokenExpiresAt,
        }
      : {}),
  };
}

// ─── Toss Payments (ko) ───────────────────────────────────────────────────────

const TossPaymentGateway = forwardRef<PaymentGatewayHandle, PaymentGatewayProps>(
  function TossPaymentGateway(
    { prepareResult, orderId, orderNumber, amount, locale, guestAccessToken, guestAccessTokenExpiresAt, onError },
    ref,
  ) {
    const handlerRef = useRef<(() => Promise<void>) | null>(null);
    const onErrorRef = useRef(onError);
    const [isReady, setIsReady] = useState(false);
    onErrorRef.current = onError;

    useEffect(() => {
      let cancelled = false;

      const initialize = async () => {
        try {
          const { ANONYMOUS, loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
          const tossPayments = await loadTossPayments(prepareResult.clientKey);
          const preparedCustomerKey = getGatewayPayloadString(prepareResult, 'customerKey');
          const customerKey = preparedCustomerKey === 'ANONYMOUS' || !preparedCustomerKey
            ? ANONYMOUS
            : preparedCustomerKey;
          const widgets = tossPayments.widgets({ customerKey });

          await widgets.setAmount({ currency: 'KRW', value: amount });
          await widgets.renderPaymentMethods({
            selector: '#toss-payment-methods',
            variantKey: 'DEFAULT',
          });
          await widgets.renderAgreement({
            selector: '#toss-payment-agreement',
            variantKey: 'AGREEMENT',
          });
          if (cancelled) return;

          setIsReady(true);
          handlerRef.current = async () => {
            const origin = window.location.origin;

            sessionStorage.setItem(
              SESSION_KEYS.TOSS_CONTEXT,
              JSON.stringify(
                buildHostedPaymentContext({
                  orderId,
                  orderNumber,
                  amount,
                  guestAccessToken,
                  guestAccessTokenExpiresAt,
                }),
              ),
            );

            await widgets.requestPayment({
              orderId: orderNumber,
              orderName: locale === 'en' ? `Order ${orderNumber}` : `주문 ${orderNumber}`,
              successUrl: `${origin}/${locale}/checkout/success`,
              failUrl: `${origin}/${locale}/checkout/fail`,
            });
          };
        } catch (err) {
          onErrorRef.current(handleApiError(err, locale === 'en' ? 'Failed to initialize payment.' : '결제 초기화 오류'));
        }
      };

      void initialize();

      return () => {
        cancelled = true;
        handlerRef.current = null;
      };
    }, [prepareResult, orderId, orderNumber, amount, locale, guestAccessToken, guestAccessTokenExpiresAt]);

    useImperativeHandle(ref, () => ({
      confirm: async () => {
        if (!isReady || !handlerRef.current) {
          throw new Error(locale === 'en' ? 'Payment widget is loading.' : '결제위젯을 불러오는 중입니다.');
        }
        await handlerRef.current();
      },
    }), [isReady, locale]);

    return (
      <div className="layout-stack-md">
        <div id="toss-payment-methods" aria-busy={!isReady} />
        <div id="toss-payment-agreement" />
      </div>
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
      setMountError(locale === 'en' ? 'Stripe is not configured correctly.' : 'Stripe 설정이 올바르지 않습니다.');
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
          setMountError(locale === 'en' ? 'Failed to load payment methods.' : '결제 수단을 불러오는데 실패했습니다.');
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
          throw new Error(error.message ?? (locale === 'en' ? 'Payment failed.' : '결제에 실패했습니다.'));
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
        <p className="text-xs text-muted-foreground">{locale === 'en' ? 'Loading payment methods...' : '결제 수단 불러오는 중...'}</p>
      )}
      {mountError && <p className="text-xs text-destructive">{mountError}</p>}
      <div ref={containerRef} className={loading ? 'sr-only' : undefined} />
    </div>
  );
});

// ─── Mock / fallback ──────────────────────────────────────────────────────────

const MockPaymentGateway = forwardRef<PaymentGatewayHandle, { locale: Locale }>(
  function MockPaymentGateway({ locale }, ref) {
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
        <span className="text-sm">{locale === 'en' ? 'Test Payment (Mock)' : '테스트 결제 (Mock)'}</span>
      </label>
    );
  },
);

// ─── External redirect/hosted gateways (PayPal / NaverPay / Eximbay) ──────────

const ExternalRedirectGateway = forwardRef<PaymentGatewayHandle, PaymentGatewayProps>(
  function ExternalRedirectGateway(
    { prepareResult, orderId, orderNumber, amount, locale, guestAccessToken, guestAccessTokenExpiresAt, onError },
    ref,
  ) {
    const t = useTranslations('checkout');
    const isEximbay = prepareResult.gateway === 'eximbay';

    useImperativeHandle(ref, () => ({
      confirm: async () => {
        if (prepareResult.gateway === 'naverpay') {
          const chainId = getGatewayPayloadString(prepareResult, 'chainId');
          const mode = getGatewayPayloadString(prepareResult, 'mode') === 'production'
            ? 'production'
            : 'development';

          if (!prepareResult.clientKey || !chainId) {
            onError(t('externalPaymentUnavailable'));
            return;
          }

          sessionStorage.setItem(
            SESSION_KEYS.NAVERPAY_CONTEXT,
            JSON.stringify(
              buildHostedPaymentContext({
                orderId,
                orderNumber,
                amount,
                guestAccessToken,
                guestAccessTokenExpiresAt,
              }),
            ),
          );

          try {
            await loadNaverPaySdk();
            const naverPay = window.Naver?.Pay?.create({
              mode,
              payType: 'normal',
              clientId: prepareResult.clientKey,
              chainId,
            });
            if (!naverPay) throw new Error('naverpay_sdk_init_failed');

            naverPay.open({
              merchantUserKey: `order_${orderId}`,
              merchantPayKey: orderNumber,
              productName: orderNumber,
              totalPayAmount: amount,
              taxScopeAmount: amount,
              taxExScopeAmount: 0,
              returnUrl: `${window.location.origin}/${locale}/checkout/success`,
            });
          } catch {
            onError(t('externalPaymentUnavailable'));
          }
          return;
        }

        if (prepareResult.gateway === 'eximbay') {
          const fgkey = getGatewayPayloadString(prepareResult, 'fgkey');
          const jsSdkUrl = getGatewayPayloadString(prepareResult, 'jsSdkUrl');
          if (!fgkey || !jsSdkUrl) {
            onError(t('externalPaymentUnavailable'));
            return;
          }

          sessionStorage.setItem(
            SESSION_KEYS.EXIMBAY_CONTEXT,
            JSON.stringify(
              buildHostedPaymentContext({
                orderId,
                orderNumber,
                amount,
                guestAccessToken,
                guestAccessTokenExpiresAt,
              }),
            ),
          );

          try {
            await loadEximbaySdk(jsSdkUrl);
            window.EXIMBAY?.request_pay({
              fgkey,
              payment: getGatewayPayloadObject(prepareResult, 'payment'),
              merchant: getGatewayPayloadObject(prepareResult, 'merchant'),
              buyer: getGatewayPayloadObject(prepareResult, 'buyer'),
              url: getGatewayPayloadObject(prepareResult, 'url'),
            });
          } catch {
            onError(t('externalPaymentUnavailable'));
          }
          return;
        }

        if (!prepareResult.redirectUrl) {
          onError(t('externalPaymentUnavailable'));
          return;
        }

        sessionStorage.setItem(
          SESSION_KEYS.PAYPAL_CONTEXT,
          JSON.stringify(
            buildHostedPaymentContext({
              orderId,
              orderNumber,
              amount,
              guestAccessToken,
              guestAccessTokenExpiresAt,
            }),
          ),
        );
        window.location.assign(prepareResult.redirectUrl);
      },
    }));

    if (isEximbay) {
      return <SecureCardEntryShell />;
    }

    return (
      <PaymentMethodOption
        gateway={prepareResult.gateway === 'naverpay' ? 'naverpay' : 'paypal'}
        selected
        readOnly
      />
    );
  },
);

// ─── Public component ─────────────────────────────────────────────────────────

const PaymentGateway = forwardRef<PaymentGatewayHandle, PaymentGatewayProps>(
  function PaymentGateway(props, ref) {
    const { prepareResult, locale } = props;

    if (prepareResult.gateway === 'paypal' || prepareResult.gateway === 'naverpay' || prepareResult.gateway === 'eximbay') {
      return <ExternalRedirectGateway ref={ref} {...props} />;
    }

    const isToss =
      prepareResult.gateway === 'toss' &&
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

    return <MockPaymentGateway ref={ref} locale={locale} />;
  },
);

export default PaymentGateway;
