import { MockPaymentAdapter } from './adapters/mock.adapter';
import { TossPaymentAdapter } from './adapters/toss.adapter';
import { StripePaymentAdapter } from './adapters/stripe.adapter';
import { KGInicisPaymentAdapter } from './adapters/inicis.adapter';
import { PayPalPaymentAdapter } from './adapters/paypal.adapter';
import { EximbayPaymentAdapter } from './adapters/eximbay.adapter';
import {
  PAYMENT_CONFIG,
  PaymentConfig,
  paymentConfigProvider,
} from '../../config/payment.config';

export function resolvePaymentGateway(config: PaymentConfig): string {
  return config.gateway;
}

export interface PaymentGatewayAdapters {
  mock: MockPaymentAdapter;
  toss: TossPaymentAdapter;
  stripe: StripePaymentAdapter;
  inicis: KGInicisPaymentAdapter;
  paypal: PayPalPaymentAdapter;
  eximbay: EximbayPaymentAdapter;
}

export function selectPaymentGatewayAdapter(
  config: PaymentConfig,
  adapters: PaymentGatewayAdapters,
) {
  const gateway = resolvePaymentGateway(config);
  switch (gateway) {
    case 'toss':
      return adapters.toss;
    case 'stripe':
      return adapters.stripe;
    case 'inicis':
      return adapters.inicis;
    case 'paypal':
      return adapters.paypal;
    case 'eximbay':
      return adapters.eximbay;
    case 'mock':
      return adapters.mock;
    default:
      throw new Error(`Unknown PAYMENT_GATEWAY: ${gateway}`);
  }
}

export const paymentGatewayProvider = {
  provide: 'PaymentGateway',
  useFactory: (
    config: PaymentConfig,
    mock: MockPaymentAdapter,
    toss: TossPaymentAdapter,
    stripe: StripePaymentAdapter,
    inicis: KGInicisPaymentAdapter,
    paypal: PayPalPaymentAdapter,
    eximbay: EximbayPaymentAdapter,
  ) => selectPaymentGatewayAdapter(config, {
    mock,
    toss,
    stripe,
    inicis,
    paypal,
    eximbay,
  }),
  inject: [
    PAYMENT_CONFIG,
    MockPaymentAdapter,
    TossPaymentAdapter,
    StripePaymentAdapter,
    KGInicisPaymentAdapter,
    PayPalPaymentAdapter,
    EximbayPaymentAdapter,
  ],
};

export const gatewayProviders = [
  paymentConfigProvider,
  MockPaymentAdapter,
  TossPaymentAdapter,
  StripePaymentAdapter,
  KGInicisPaymentAdapter,
  PayPalPaymentAdapter,
  EximbayPaymentAdapter,
  paymentGatewayProvider,
];
