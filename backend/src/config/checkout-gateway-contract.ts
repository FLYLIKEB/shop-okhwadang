export type CheckoutGatewayName = 'toss' | 'bank_transfer' | 'eximbay' | 'paypal';
export type CheckoutLocale = 'ko' | 'en';
export type CheckoutGatewayCspDirective =
  | 'style-src'
  | 'script-src'
  | 'img-src'
  | 'connect-src'
  | 'child-src'
  | 'frame-src';

interface CheckoutGatewayContract {
  requiredEnvKeys: readonly string[];
  csp: Partial<Record<CheckoutGatewayCspDirective, readonly string[]>>;
}

export const DEFAULT_CHECKOUT_GATEWAYS = ['toss', 'paypal', 'eximbay'] as const satisfies readonly CheckoutGatewayName[];

export const CHECKOUT_GATEWAY_ORDER_BY_LOCALE = {
  ko: ['toss'],
  en: ['paypal', 'eximbay'],
} as const satisfies Record<CheckoutLocale, readonly CheckoutGatewayName[]>;

export const CHECKOUT_GATEWAY_CONTRACT = {
  toss: {
    requiredEnvKeys: ['TOSS_CLIENT_KEY', 'TOSS_SECRET_KEY'],
    csp: {
      'script-src': ['https://js.tosspayments.com'],
      'connect-src': [
        'https://api.tosspayments.com',
        'https://log.tosspayments.com',
        'https://event.tosspayments.com',
        'https://apigw.tosspayments.com',
        'https://apigw-sandbox.tosspayments.com',
      ],
      'child-src': ['https://*.tosspayments.com'],
      'frame-src': ['https://*.tosspayments.com', 'https://toss.im'],
    },
  },
  bank_transfer: {
    requiredEnvKeys: [],
    csp: {},
  },
  paypal: {
    requiredEnvKeys: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
    csp: {
      'style-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
      'script-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
      'img-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
      'connect-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
      'child-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
      'frame-src': ['https://*.paypal.com', 'https://*.paypalobjects.com', 'https://*.venmo.com'],
    },
  },
  eximbay: {
    requiredEnvKeys: ['EXIMBAY_MERCHANT_ID', 'EXIMBAY_API_KEY', 'EXIMBAY_SECRET_KEY'],
    csp: {
      'script-src': ['https://api-test.eximbay.com', 'https://api.eximbay.com'],
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
  },
} as const satisfies Record<CheckoutGatewayName, CheckoutGatewayContract>;

export const CHECKOUT_GATEWAY_CHANGE_FILES = [
  'backend/src/config/checkout-gateway-contract.ts',
  'src/constants/checkoutPaymentMethods.ts',
  'backend/src/modules/payments/payments.module.ts',
  'backend/src/config/env-validator.ts',
  'next.config.ts',
  '.env.example',
  'backend/.env.example',
  'docs/infrastructure/ENVIRONMENT_VARIABLES.md',
  'docs/infrastructure/DEPLOYMENT.md',
  'docs/qa/checkout-payment-e2e.md',
] as const;

export function isCheckoutGatewayName(value: string): value is CheckoutGatewayName {
  return value === 'toss' || value === 'bank_transfer' || value === 'eximbay' || value === 'paypal';
}

export function parseConfiguredCheckoutGateways(configured: string | undefined | null): CheckoutGatewayName[] {
  const gateways = (configured ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(isCheckoutGatewayName);

  if (gateways.length === 0) {
    return [];
  }

  return [...new Set(gateways)];
}

export function getInvalidConfiguredCheckoutGateways(
  configured: string | undefined | null,
): string[] {
  return [
    ...new Set(
      (configured ?? '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0 && !isCheckoutGatewayName(value)),
    ),
  ];
}

export function getEnabledCheckoutGateways(
  configured: string | undefined | null,
  fallback: readonly CheckoutGatewayName[] = DEFAULT_CHECKOUT_GATEWAYS,
): CheckoutGatewayName[] {
  const invalidGateways = getInvalidConfiguredCheckoutGateways(configured);
  if (invalidGateways.length > 0) {
    throw new Error(`Unsupported checkout gateways: ${invalidGateways.join(', ')}`);
  }
  const parsed = parseConfiguredCheckoutGateways(configured);
  return parsed.length > 0 ? parsed : [...fallback];
}

function resolveCheckoutLocale(locale: string): CheckoutLocale {
  return locale === 'ko' ? 'ko' : 'en';
}

export function getCheckoutGatewayOptions(
  locale: string,
  configured: string | undefined | null,
  fallback: readonly CheckoutGatewayName[] = DEFAULT_CHECKOUT_GATEWAYS,
): CheckoutGatewayName[] {
  const enabled = getEnabledCheckoutGateways(configured, fallback);
  const localeOrder = CHECKOUT_GATEWAY_ORDER_BY_LOCALE[resolveCheckoutLocale(locale)];
  return localeOrder.filter((gateway) => enabled.includes(gateway));
}

export function getDefaultCheckoutGateway(
  locale: string,
  configured: string | undefined | null,
  fallback: readonly CheckoutGatewayName[] = DEFAULT_CHECKOUT_GATEWAYS,
): CheckoutGatewayName {
  return getCheckoutGatewayOptions(locale, configured, fallback)[0] ?? 'paypal';
}

export function getRequiredCheckoutEnvKeys(configured: string | undefined | null): string[] {
  return getEnabledCheckoutGateways(configured, []).flatMap((gateway) => CHECKOUT_GATEWAY_CONTRACT[gateway].requiredEnvKeys);
}

export function getCheckoutGatewayCspSources(enabledGateways: readonly CheckoutGatewayName[]): Record<CheckoutGatewayCspDirective, string[]> {
  const sources: Record<CheckoutGatewayCspDirective, string[]> = {
    'style-src': [],
    'script-src': [],
    'img-src': [],
    'connect-src': [],
    'child-src': [],
    'frame-src': [],
  };

  for (const gateway of enabledGateways) {
    for (const [directive, values] of Object.entries(CHECKOUT_GATEWAY_CONTRACT[gateway].csp) as [CheckoutGatewayCspDirective, readonly string[]][]) {
      for (const value of values) {
        if (!sources[directive].includes(value)) {
          sources[directive].push(value);
        }
      }
    }
  }

  return sources;
}

export function getConfiguredCheckoutGatewayCspSources(
  configured: string | undefined | null,
  fallback: readonly CheckoutGatewayName[] = DEFAULT_CHECKOUT_GATEWAYS,
): Record<CheckoutGatewayCspDirective, string[]> {
  return getCheckoutGatewayCspSources(getEnabledCheckoutGateways(configured, fallback));
}
