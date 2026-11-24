'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TossPaymentsWidgets, WidgetAgreementWidget, WidgetPaymentMethodWidget, WidgetSelectedPaymentMethod } from '@tosspayments/tosspayments-sdk';
import type { Locale } from '@/i18n/routing';
import type { PreparePaymentResponse } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { localMessage } from '@/utils/localMessages';
import { SESSION_KEYS } from '@/constants/storage';
import { SecureCardEntryShell } from './SecureCardEntryShell';
import { PaymentMethodOption } from './PaymentMethodOption';
import { Button } from '@/components/ui/button';

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
  onPaymentMethodChange?: (methodCode: string) => void;
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

function tossErrorCode(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  return typeof code === 'string' && /^[A-Z0-9_]{1,80}$/.test(code) ? code : 'UNKNOWN';
}

function logTossError(stage: 'initialization' | 'request' | 'cleanup', error: unknown): void {
  // The provider code is needed to diagnose SDK failures; never log raw errors or payment data.
  // eslint-disable-next-line no-console
  console.error(`[toss] ${stage}`, tossErrorCode(error));
}

function tossErrorMessage(error: unknown, locale: Locale, initializing: boolean): string {
  const code = tossErrorCode(error);
  const keys: Record<string, string> = {
    INVALID_CLIENT_KEY: 'tossConfigurationError',
    INVALID_CUSTOMER_KEY: 'tossConfigurationError',
    INVALID_VARIANT_KEY: 'tossConfigurationError',
    NEED_AGREEMENT_WITH_REQUIRED_TERMS: 'tossAgreementError',
    NOT_SELECTED_PAYMENT_METHOD: 'tossSelectionError',
    NEED_CARD_PAYMENT_DETAIL: 'tossSelectionError',
    UNSUPPORTED_TEST_PHASE_PAYMENT_METHOD: 'tossTestMethodError',
    PROVIDER_STATUS_UNHEALTHY: 'tossProviderError',
  };
  return localMessage(`checkout.${keys[code] ?? (initializing ? 'paymentMethodLoadError' : 'tossRequestError')}`, undefined, locale);
}

const TossPaymentGateway = forwardRef<PaymentGatewayHandle, PaymentGatewayProps>(
  function TossPaymentGateway(props, ref) {
    const { prepareResult, orderNumber, locale, amount } = props;
    const clientKey = prepareResult.clientKey;
    const customerKey = getGatewayPayloadString(prepareResult, 'customerKey') ?? 'ANONYMOUS';
    const latestProps = useRef(props);
    latestProps.current = props;
    const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
    const cleanupRef = useRef<Promise<void>>(Promise.resolve());
    const amountUpdateRef = useRef<Promise<void>>(Promise.resolve());
    const confirmInFlightRef = useRef(false);
    const reportErrorRef = useRef<((error: unknown) => void) | null>(null);
    const [lifecycle, setLifecycle] = useState<'loading' | 'ready' | 'error'>('loading');
    const [mountError, setMountError] = useState<string | null>(null);
    const [retryGeneration, setRetryGeneration] = useState(0);

    useEffect(() => {
      let cancelled = false;
      let failed = false;
      setLifecycle('loading');
      setMountError(null);
      widgetsRef.current = null;
      amountUpdateRef.current = Promise.resolve();
      let paymentMethodWidget: WidgetPaymentMethodWidget | null = null;
      let agreementWidget: WidgetAgreementWidget | null = null;
      const reportError = (error: unknown) => {
        if (cancelled || failed) return;
        failed = true;
        const message = tossErrorMessage(error, locale, true);
        logTossError('initialization', error);
        setMountError(message);
        setLifecycle('error');
        widgetsRef.current = null;
        latestProps.current.onError(message);
      };
      reportErrorRef.current = reportError;

      const initialize = async () => {
        try {
          await cleanupRef.current;
          if (cancelled) return;
          const { ANONYMOUS, loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
          if (cancelled) return;
          const tossPayments = await loadTossPayments(clientKey);
          if (cancelled) return;
          const widgets = tossPayments.widgets({ customerKey: customerKey === 'ANONYMOUS' ? ANONYMOUS : customerKey });
          await widgets.setAmount({ currency: 'KRW', value: latestProps.current.amount });
          if (cancelled) return;
          const paymentVariant = process.env.NEXT_PUBLIC_TOSS_PAYMENT_VARIANT_KEY?.trim();
          const agreementVariant = process.env.NEXT_PUBLIC_TOSS_AGREEMENT_VARIANT_KEY?.trim();
          paymentMethodWidget = await widgets.renderPaymentMethods({
            selector: '#toss-payment-methods',
            ...(paymentVariant ? { variantKey: paymentVariant } : {}),
          });
          if (cancelled) return;
          agreementWidget = await widgets.renderAgreement({
            selector: '#toss-payment-agreement',
            ...(agreementVariant ? { variantKey: agreementVariant } : {}),
          });
          if (cancelled) return;
          const notifySelectedPaymentMethod = (paymentMethod: WidgetSelectedPaymentMethod) => {
            if (!cancelled) latestProps.current.onPaymentMethodChange?.(paymentMethod.code);
          };
          paymentMethodWidget.on('paymentMethodSelect', notifySelectedPaymentMethod);
          notifySelectedPaymentMethod(await paymentMethodWidget.getSelectedPaymentMethod());
          // Pricing may have changed while the SDK and iframe were loading.
          await widgets.setAmount({ currency: 'KRW', value: latestProps.current.amount });
          if (cancelled) return;
          widgetsRef.current = widgets;
          setLifecycle('ready');
        } catch (error) {
          reportError(error);
        }
      };
      const initialization = initialize();
      return () => {
        cancelled = true;
        widgetsRef.current = null;
        reportErrorRef.current = null;
        cleanupRef.current = initialization.then(async () => {
          await Promise.all([paymentMethodWidget?.destroy(), agreementWidget?.destroy()]);
        }).catch((error: unknown) => logTossError('cleanup', error));
      };
    }, [clientKey, customerKey, orderNumber, locale, retryGeneration]);

    useEffect(() => {
      const widgets = widgetsRef.current;
      if (!widgets || lifecycle !== 'ready') return;
      // Serialize amount updates so an older asynchronous update cannot win.
      const reportError = reportErrorRef.current;
      amountUpdateRef.current = amountUpdateRef.current
        .then(() => widgetsRef.current === widgets ? widgets.setAmount({ currency: 'KRW', value: amount }) : undefined)
        .catch((error: unknown) => reportError?.(error));
    }, [amount, lifecycle]);

    useImperativeHandle(ref, () => ({
      confirm: async () => {
        if (confirmInFlightRef.current) throw new Error(localMessage('checkout.paymentConfirmationInProgress', undefined, locale));
        const widgets = widgetsRef.current;
        if (lifecycle !== 'ready' || !widgets) {
          throw new Error(mountError ?? localMessage('checkout.loadingPaymentMethods', undefined, locale));
        }
        const current = latestProps.current;
        if (current.amount > 10_000_000) throw new Error(localMessage('checkout.tossAmountLimitError', undefined, locale));
        confirmInFlightRef.current = true;
        try {
          await amountUpdateRef.current;
          if (widgetsRef.current !== widgets) throw new Error(localMessage('checkout.paymentMethodLoadError', undefined, locale));
          await widgets.setAmount({ currency: 'KRW', value: current.amount });
          const latest = latestProps.current;
          if (widgetsRef.current !== widgets || latest.orderId !== current.orderId
            || latest.orderNumber !== current.orderNumber || latest.amount !== current.amount) {
            throw new Error(localMessage('checkout.paymentMethodLoadError', undefined, locale));
          }
          sessionStorage.setItem(SESSION_KEYS.TOSS_CONTEXT, JSON.stringify(buildHostedPaymentContext(current)));
          await widgets.requestPayment({
            orderId: current.orderNumber,
            orderName: locale === 'en' ? `Order ${current.orderNumber}` : `주문 ${current.orderNumber}`,
            successUrl: `${window.location.origin}/${locale}/checkout/success`,
            failUrl: `${window.location.origin}/${locale}/checkout/fail`,
          });
        } catch (error) {
          if (tossErrorCode(error) === 'USER_CANCEL') return;
          logTossError('request', error);
          throw new Error(tossErrorMessage(error, locale, false));
        } finally {
          confirmInFlightRef.current = false;
        }
      },
    }), [lifecycle, mountError, locale]);

    return (
      <div className="checkout-toss-widget layout-stack-md">
        {lifecycle === 'error' && (
          <div className="space-y-2">
            <p role="alert" className="typo-body-sm text-destructive">{mountError}</p>
            <Button type="button" variant="gray" size="sm" onClick={() => setRetryGeneration((generation) => generation + 1)}>
              {localMessage('checkout.retryPaymentInitialization', undefined, locale)}
            </Button>
          </div>
        )}
        <div id="toss-payment-methods" aria-busy={lifecycle === 'loading'} />
        <div id="toss-payment-agreement" />
      </div>
    );
  },
);

// ─── Stripe Payment Element (en) ──────────────────────────────────────────────

const STRIPE_INITIALIZATION_TIMEOUT_MS = 15_000;

const StripePaymentGateway = forwardRef<
  PaymentGatewayHandle,
  {
    clientSecret: string;
    publishableKey: string;
    locale: string;
    onError: (msg: string) => void;
  }
>(function StripePaymentGateway({ clientSecret, publishableKey, locale,
  onError }, ref) {
  const t = useTranslations('checkout');
  const containerRef = useRef<HTMLDivElement>(null);
  const [lifecycle, setLifecycle] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mountError, setMountError] = useState<string | null>(null);
  const [retryGeneration, setRetryGeneration] = useState(0);
  const confirmRef = useRef<(() => Promise<void>) | null>(null);
  const confirmInFlightRef = useRef(false);
  const onErrorRef = useRef(onError);
  const translationsRef = useRef(t);

  useEffect(() => {
    onErrorRef.current = onError;
    translationsRef.current = t;
  }, [onError, t]);

  useEffect(() => {
    let initializationFailed = false;
    let initializationTimeout: ReturnType<typeof setTimeout> | null = null;
    setLifecycle('loading');
    setMountError(null);
    confirmRef.current = null;
    if (containerRef.current) {
      containerRef.current.replaceChildren();
    }

    const reportInitializationError = (message: string) => {
      if (initializationFailed) return;
      initializationFailed = true;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
        initializationTimeout = null;
      }
      setLifecycle('error');
      setMountError(message);
      confirmRef.current = null;
      onErrorRef.current(message);
    };

    if (!clientSecret || !publishableKey) {
      reportInitializationError(translationsRef.current('stripeConfigurationError'));
      return;
    }

    const stripeLocaleMap: Record<string, string> = {
      en: 'en',
    };
    const stripeLocale = stripeLocaleMap[locale] ?? 'auto';

    let mounted = true;
    let paymentElement: import('@stripe/stripe-js').StripePaymentElement | null = null;
    initializationTimeout = setTimeout(() => {
      if (mounted) {
        reportInitializationError(translationsRef.current('stripeInitializationTimeout'));
      }
    }, STRIPE_INITIALIZATION_TIMEOUT_MS);

    const initialize = async () => {
      try {
        const { loadStripe } = await import('@stripe/stripe-js');
        if (!mounted || initializationFailed || !containerRef.current) return;

        const stripeInstance = await loadStripe(publishableKey);
        if (!stripeInstance) {
          throw new Error(translationsRef.current('stripeInitializationError'));
        }
        if (!mounted || initializationFailed || !containerRef.current) return;

        const elements = stripeInstance.elements({
          clientSecret,
          locale: stripeLocale as import('@stripe/stripe-js').StripeElementLocale,
        });

        paymentElement = elements.create('payment');
        paymentElement.mount(containerRef.current);
        paymentElement.on('ready', () => {
          if (mounted && !initializationFailed) {
            if (initializationTimeout) {
              clearTimeout(initializationTimeout);
              initializationTimeout = null;
            }
            setLifecycle('ready');
          }
        });
        paymentElement.on('loaderror', () => {
          if (mounted) reportInitializationError(translationsRef.current('stripeLoadError'));
        });

        confirmRef.current = async () => {
          const { error } = await stripeInstance.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/${locale}/checkout/success`,
            },
          });
          if (error) {
            throw new Error(error.message ?? translationsRef.current('paymentFailed'));
          }
        };
      } catch (error) {
        if (mounted) {
          reportInitializationError(
            handleApiError(error, translationsRef.current('stripeInitializationError')),
          );
        }
      } finally {
        if (!mounted) {
          confirmRef.current = null;
        }
      }
    };
    void initialize();

    return () => {
      mounted = false;
      if (initializationTimeout) clearTimeout(initializationTimeout);
      confirmRef.current = null;
      paymentElement?.unmount();
    };
  }, [clientSecret, locale, publishableKey, retryGeneration]);

  useImperativeHandle(ref, () => ({
    confirm: async () => {
      if (lifecycle === 'loading') {
        throw new Error(translationsRef.current('stripeNotReadyError'));
      }
      if (lifecycle === 'error' || !confirmRef.current) {
        throw new Error(mountError ?? translationsRef.current('stripeInitializationError'));
      }
      if (confirmInFlightRef.current) {
        throw new Error(translationsRef.current('paymentConfirmationInProgress'));
      }
      confirmInFlightRef.current = true;
      try {
        await confirmRef.current();
      } finally {
        confirmInFlightRef.current = false;
      }
    },
  }), [lifecycle, mountError]);

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
        <span className="text-sm">{t('stripePayment')}</span>
      </label>
      {lifecycle === 'loading' && (
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
          {t('stripeLoading')}
        </p>
      )}
      {lifecycle === 'error' && mountError && (
        <div className="space-y-2">
          <p role="alert" className="text-xs text-destructive">{mountError}</p>
          <Button
            type="button"
            variant="gray"
            size="sm"
            onClick={() => setRetryGeneration((generation) => generation + 1)}
          >
            {t('retryPaymentInitialization')}
          </Button>
        </div>
      )}
      <div
        ref={containerRef}
        aria-busy={lifecycle === 'loading'}
        className={lifecycle !== 'ready' ? 'sr-only' : undefined}
      />
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
        <span className="text-sm">{localMessage('checkout.mockPayment', undefined, locale)}</span>
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
      prepareResult.clientKey !== 'mock_client_key';

    if (isStripe) {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
      return (
        <StripePaymentGateway
          key={`${prepareResult.clientKey}:${publishableKey}:${locale}`}
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
