import type { Locale } from '@/i18n/routing';
import type { CheckoutGatewayName } from '@/lib/api';

export type CheckoutPaymentCountry = 'KR' | 'GLOBAL';

export const CHECKOUT_PAYMENT_COUNTRY_BY_LOCALE = {
  ko: 'KR',
  en: 'GLOBAL',
} as const satisfies Record<Locale, CheckoutPaymentCountry>;

export const CHECKOUT_PAYMENT_METHODS_BY_COUNTRY = {
  KR: ['naverpay', 'paypal', 'eximbay'],
  GLOBAL: ['paypal', 'eximbay'],
} as const satisfies Record<CheckoutPaymentCountry, readonly CheckoutGatewayName[]>;

function isCheckoutGatewayName(value: string): value is CheckoutGatewayName {
  return value === 'naverpay' || value === 'eximbay' || value === 'paypal';
}

export function getEnabledCheckoutGateways(): CheckoutGatewayName[] {
  const configured = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS;
  if (!configured || configured.trim() === '') return ['naverpay', 'eximbay', 'paypal'];

  const gateways = configured
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(isCheckoutGatewayName);

  return [...new Set(gateways)];
}

export function getCheckoutPaymentCountry(locale: Locale): CheckoutPaymentCountry {
  return CHECKOUT_PAYMENT_COUNTRY_BY_LOCALE[locale] ?? 'GLOBAL';
}

export function getGatewayOptionsByLocale(locale: Locale): CheckoutGatewayName[] {
  const enabled = getEnabledCheckoutGateways();
  const country = getCheckoutPaymentCountry(locale);
  return CHECKOUT_PAYMENT_METHODS_BY_COUNTRY[country].filter((gateway) => enabled.includes(gateway));
}

export function getDefaultCheckoutGateway(locale: Locale): CheckoutGatewayName {
  return getGatewayOptionsByLocale(locale)[0] ?? 'paypal';
}
