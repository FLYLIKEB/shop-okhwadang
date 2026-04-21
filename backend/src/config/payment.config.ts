import { Provider } from '@nestjs/common';

export const PAYMENT_CONFIG = Symbol('PAYMENT_CONFIG');

export type PaymentGatewayName = 'mock' | 'toss' | 'stripe';

export interface PaymentConfig {
  nodeEnv: string;
  gateway: PaymentGatewayName;
  defaultCarrier: string;
  toss: {
    secretKey: string;
    clientKey: string;
  };
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
}

function isPaymentGatewayName(value: string): value is PaymentGatewayName {
  return value === 'mock' || value === 'toss' || value === 'stripe';
}

export function createPaymentConfig(env: NodeJS.ProcessEnv = process.env): PaymentConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const gateway = (env.PAYMENT_GATEWAY ?? 'mock').trim().toLowerCase();

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
    toss: {
      secretKey: env.TOSS_SECRET_KEY ?? '',
      clientKey: env.TOSS_CLIENT_KEY ?? '',
    },
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY ?? '',
      publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
      webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? '',
    },
  };
}

export const paymentConfigProvider: Provider = {
  provide: PAYMENT_CONFIG,
  useFactory: () => createPaymentConfig(),
};
