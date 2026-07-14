export type CheckoutGatewayName = 'naverpay' | 'bank_transfer' | 'paypal' | 'eximbay';
export type CheckoutRuntimeGatewayName = CheckoutGatewayName | 'toss' | 'stripe';
export type CheckoutCspDirective =
  'style-src' | 'script-src' | 'img-src' | 'connect-src' | 'child-src' | 'frame-src';

export const DEFAULT_CHECKOUT_ENABLED_GATEWAYS = [
  'naverpay',
  'bank_transfer',
  'paypal',
  'eximbay',
] as const satisfies readonly CheckoutGatewayName[];

export const CHECKOUT_GATEWAY_ORDER_BY_LOCALE = {
  ko: ['naverpay', 'bank_transfer', 'paypal', 'eximbay'],
  default: ['paypal', 'eximbay'],
} as const satisfies Record<'ko' | 'default', readonly CheckoutGatewayName[]>;

export type CheckoutEnvTarget = 'backend' | 'frontend';

export const CHECKOUT_GATEWAY_ENV_KEYS = {
  bank_transfer: { backend: [], frontend: [] },
  naverpay: {
    backend: [
      'NAVERPAY_PARTNER_ID',
      'NAVERPAY_CLIENT_ID',
      'NAVERPAY_CLIENT_SECRET',
      'NAVERPAY_CHAIN_ID',
    ],
    frontend: [],
  },
  paypal: {
    backend: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
    frontend: [],
  },
  eximbay: {
    backend: ['EXIMBAY_MERCHANT_ID', 'EXIMBAY_API_KEY', 'EXIMBAY_SECRET_KEY'],
    frontend: [],
  },
  toss: {
    backend: ['TOSS_SECRET_KEY', 'TOSS_CLIENT_KEY'],
    frontend: [],
  },
  stripe: {
    backend: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    frontend: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
  },
} as const satisfies Record<
  CheckoutRuntimeGatewayName,
  Record<CheckoutEnvTarget, readonly string[]>
>;

export const CHECKOUT_GATEWAY_CSP_SOURCES = {
  bank_transfer: {},
  naverpay: {
    'script-src': ['https://nsp.pay.naver.com'],
    'connect-src': [
      'https://nsp.pay.naver.com',
      'https://pay.naver.com',
      'https://m.pay.naver.com',
      'https://test-pay.naver.com',
      'https://test-m.pay.naver.com',
    ],
    'child-src': [
      'https://pay.naver.com',
      'https://m.pay.naver.com',
      'https://test-pay.naver.com',
      'https://test-m.pay.naver.com',
    ],
    'frame-src': [
      'https://pay.naver.com',
      'https://m.pay.naver.com',
      'https://test-pay.naver.com',
      'https://test-m.pay.naver.com',
    ],
  },
  paypal: {
    'style-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
    'script-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
    'img-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
    'connect-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
    'child-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
    'frame-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
  },
  eximbay: {
    'script-src': [
      'https://api-test.eximbay.com',
      'https://api.eximbay.com',
      'https://pgonline-test.eximbay.com',
      'https://pgonline.eximbay.com',
    ],
    'connect-src': [
      'https://api-test.eximbay.com',
      'https://api.eximbay.com',
      'https://pgonline-test.eximbay.com',
      'https://pgonline.eximbay.com',
    ],
    'child-src': [
      'https://api-test.eximbay.com',
      'https://api.eximbay.com',
      'https://pgonline-test.eximbay.com',
      'https://pgonline.eximbay.com',
    ],
    'frame-src': [
      'https://api-test.eximbay.com',
      'https://api.eximbay.com',
      'https://pgonline-test.eximbay.com',
      'https://pgonline.eximbay.com',
    ],
  },
  toss: {
    'script-src': ['https://js.tosspayments.com', 'https://js.sandbox.tosspayments.com'],
  },
  stripe: {
    'script-src': ['https://js.stripe.com', 'https://*.js.stripe.com'],
    'connect-src': ['https://api.stripe.com'],
    'child-src': ['https://js.stripe.com', 'https://*.js.stripe.com', 'https://hooks.stripe.com'],
    'frame-src': ['https://js.stripe.com', 'https://*.js.stripe.com', 'https://hooks.stripe.com'],
  },
} as const satisfies Record<
  CheckoutRuntimeGatewayName,
  Partial<Record<CheckoutCspDirective, readonly string[]>>
>;

export function isCheckoutGatewayName(value: string): value is CheckoutGatewayName {
  return (
    value === 'naverpay' || value === 'bank_transfer' || value === 'paypal' || value === 'eximbay'
  );
}

export function isCheckoutRuntimeGatewayName(value: string): value is CheckoutRuntimeGatewayName {
  return (
    value === 'naverpay' ||
    value === 'bank_transfer' ||
    value === 'paypal' ||
    value === 'eximbay' ||
    value === 'toss' ||
    value === 'stripe'
  );
}

function parseCheckoutRuntimeGateways(
  value: string | undefined,
  predicate: (candidate: string) => candidate is CheckoutRuntimeGatewayName,
): CheckoutRuntimeGatewayName[] {
  if (!value || value.trim() === '') return [];

  const gateways = value
    .split(',')
    .map((candidate) => candidate.trim().toLowerCase())
    .filter(predicate);

  return [...new Set(gateways)];
}

export function getEnabledCheckoutGateways(
  configuredGateways: string | undefined,
): CheckoutGatewayName[] {
  const explicitGateways = parseCheckoutRuntimeGateways(configuredGateways, isCheckoutGatewayName);
  if (explicitGateways.length === 0) {
    return [...DEFAULT_CHECKOUT_ENABLED_GATEWAYS];
  }

  return [...new Set([...explicitGateways, 'bank_transfer'])] as CheckoutGatewayName[];
}

export function getCheckoutGatewayOrder(locale: string): readonly CheckoutGatewayName[] {
  return locale === 'ko'
    ? CHECKOUT_GATEWAY_ORDER_BY_LOCALE.ko
    : CHECKOUT_GATEWAY_ORDER_BY_LOCALE.default;
}

export function getAvailableCheckoutGateways(
  locale: string,
  configuredGateways: string | undefined,
): CheckoutGatewayName[] {
  const enabledGateways = getEnabledCheckoutGateways(configuredGateways);
  return getCheckoutGatewayOrder(locale).filter((gateway) => enabledGateways.includes(gateway));
}

export function getContractRuntimeGateways(env: NodeJS.ProcessEnv): CheckoutRuntimeGatewayName[] {
  const gateways = getEnabledCheckoutGateways(env.CHECKOUT_ENABLED_GATEWAYS);
  const paymentGateway = (env.PAYMENT_GATEWAY ?? '').trim().toLowerCase();

  if (
    isCheckoutRuntimeGatewayName(paymentGateway) &&
    !gateways.includes(paymentGateway as CheckoutGatewayName)
  ) {
    return [...gateways, paymentGateway];
  }

  return gateways;
}

export function getRequiredCheckoutContractEnvKeys(
  env: NodeJS.ProcessEnv,
  target: CheckoutEnvTarget = 'backend',
): string[] {
  return [
    ...new Set(
      getContractRuntimeGateways(env).flatMap(
        (gateway) => CHECKOUT_GATEWAY_ENV_KEYS[gateway][target],
      ),
    ),
  ];
}

export function getCheckoutCspSources(
  env: NodeJS.ProcessEnv,
): Partial<Record<CheckoutCspDirective, string[]>> {
  const sourcesByDirective: Partial<Record<CheckoutCspDirective, string[]>> = {};

  for (const gateway of getContractRuntimeGateways(env)) {
    const gatewaySources = CHECKOUT_GATEWAY_CSP_SOURCES[gateway] as Partial<
      Record<CheckoutCspDirective, readonly string[]>
    >;

    for (const directive of Object.keys(gatewaySources) as CheckoutCspDirective[]) {
      const existing = sourcesByDirective[directive] ?? [];
      const next = gatewaySources[directive] ?? [];
      sourcesByDirective[directive] = [...new Set([...existing, ...next])];
    }
  }

  return sourcesByDirective;
}
