import { Provider } from '@nestjs/common';

export const PAYMENT_CONFIG = Symbol('PAYMENT_CONFIG');

export type PaymentGatewayName = 'mock' | 'toss' | 'stripe' | 'inicis' | 'naverpay' | 'paypal' | 'eximbay';

export interface PaymentConfig {
  nodeEnv: string;
  gateway: PaymentGatewayName;
  defaultCarrier: string;
  frontendUrl: string;
  backendUrl: string;
  toss: {
    secretKey: string;
    clientKey: string;
  };
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    krwPerUsd: string;
    krwPerUsdUpdatedAt: string;
  };
  inicis: {
    mid: string;
    signKey: string;
    apiKey: string;
    clientKey: string;
  };
  naverpay: {
    partnerId: string;
    clientId: string;
    clientSecret: string;
    chainId: string;
  };
  paypal: {
    clientId: string;
    clientSecret: string;
    webhookId: string;
    apiBaseUrl: string;
    krwPerUsd: number;
  };
  eximbay: {
    merchantId: string;
    apiKey: string;
    secretKey: string;
    apiBaseUrl: string;
    jsSdkUrl: string;
    webhookSecret: string;
    currency: string;
    lang: string;
    shopName: string;
    krwPerUsd: number;
  };
}

function isPaymentGatewayName(value: string): value is PaymentGatewayName {
  return (
    value === 'mock' ||
    value === 'toss' ||
    value === 'stripe' ||
    value === 'inicis' ||
    value === 'naverpay' ||
    value === 'paypal' ||
    value === 'eximbay'
  );
}

export function createPaymentConfig(env: NodeJS.ProcessEnv = process.env): PaymentConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const gateway = (env.PAYMENT_GATEWAY ?? 'mock').trim().toLowerCase();
  const paypalKrwPerUsd = parsePositiveNumber(env.PAYPAL_KRW_PER_USD, 1350);
  const eximbayKrwPerUsd = parsePositiveNumber(env.EXIMBAY_KRW_PER_USD, paypalKrwPerUsd);

  if (nodeEnv === 'production' && (gateway === 'mock' || !env.PAYMENT_GATEWAY)) {
    throw new Error(
      'Mock payment gateway는 프로덕션에서 사용할 수 없습니다. PAYMENT_GATEWAY 환경변수를 설정하세요.',
    );
  }

  if (!isPaymentGatewayName(gateway)) {
    throw new Error(`Unknown PAYMENT_GATEWAY: ${gateway}`);
  }

  return {
    nodeEnv,
    gateway,
    defaultCarrier: env.DEFAULT_CARRIER || 'mock',
    frontendUrl: (env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
    backendUrl: (env.BACKEND_URL ?? 'http://localhost:3000/api').replace(/\/$/, ''),
    toss: {
      secretKey: env.TOSS_SECRET_KEY ?? '',
      clientKey: env.TOSS_CLIENT_KEY ?? '',
    },
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY ?? '',
      publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
      webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? '',
      krwPerUsd: env.STRIPE_KRW_PER_USD?.trim() ?? '',
      krwPerUsdUpdatedAt: env.STRIPE_KRW_PER_USD_UPDATED_AT?.trim() ?? '',
    },
    inicis: {
      mid: env.INICIS_MID ?? '',
      signKey: env.INICIS_SIGN_KEY ?? '',
      apiKey: env.INICIS_API_KEY ?? '',
      clientKey: env.INICIS_CLIENT_KEY ?? '',
    },
    naverpay: {
      partnerId: env.NAVERPAY_PARTNER_ID ?? '',
      clientId: env.NAVERPAY_CLIENT_ID ?? '',
      clientSecret: env.NAVERPAY_CLIENT_SECRET ?? '',
      chainId: env.NAVERPAY_CHAIN_ID ?? '',
    },
    paypal: {
      clientId: env.PAYPAL_CLIENT_ID ?? '',
      clientSecret: env.PAYPAL_CLIENT_SECRET ?? '',
      webhookId: env.PAYPAL_WEBHOOK_ID ?? '',
      apiBaseUrl: (
        env.PAYPAL_API_BASE_URL
        ?? (nodeEnv === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com')
      ).replace(/\/$/, ''),
      krwPerUsd: paypalKrwPerUsd,
    },
    eximbay: {
      merchantId: env.EXIMBAY_MERCHANT_ID ?? '',
      apiKey: env.EXIMBAY_API_KEY ?? '',
      secretKey: env.EXIMBAY_SECRET_KEY ?? '',
      apiBaseUrl: (env.EXIMBAY_API_BASE_URL ?? 'https://api-test.eximbay.com').replace(/\/$/, ''),
      jsSdkUrl: env.EXIMBAY_JS_SDK_URL ?? 'https://api-test.eximbay.com/v1/javascriptSDK.js',
      webhookSecret: env.EXIMBAY_WEBHOOK_SECRET ?? '',
      currency: (env.EXIMBAY_CURRENCY ?? 'KRW').trim().toUpperCase(),
      lang: (env.EXIMBAY_LANG ?? '').trim().toUpperCase(),
      shopName: env.EXIMBAY_SHOP_NAME ?? 'Okhwadang',
      krwPerUsd: eximbayKrwPerUsd,
    },
  };
}

export const paymentConfigProvider: Provider = {
  provide: PAYMENT_CONFIG,
  useFactory: () => createPaymentConfig(),
};

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (!value || !value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
