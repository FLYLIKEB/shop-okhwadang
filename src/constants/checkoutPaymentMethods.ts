import type { Locale } from '@/i18n/routing';
import type { CheckoutGatewayName } from '@/lib/api';
import {
  CHECKOUT_GATEWAY_ORDER_BY_LOCALE,
  getDefaultCheckoutGateway as getDefaultCheckoutGatewayFromContract,
  getEnabledCheckoutGateways as getEnabledCheckoutGatewaysFromContract,
  getCheckoutGatewayOptions as getCheckoutGatewayOptionsFromContract,
} from '@/lib/checkout-gateway-contract';

export type CheckoutPaymentCountry = 'KR' | 'GLOBAL';

export const CHECKOUT_PAYMENT_COUNTRY_BY_LOCALE = {
  ko: 'KR',
  en: 'GLOBAL',
} as const satisfies Record<Locale, CheckoutPaymentCountry>;

export const CHECKOUT_PAYMENT_METHODS_BY_COUNTRY = {
  KR: CHECKOUT_GATEWAY_ORDER_BY_LOCALE.ko,
  GLOBAL: CHECKOUT_GATEWAY_ORDER_BY_LOCALE.en,
} as const satisfies Record<CheckoutPaymentCountry, readonly CheckoutGatewayName[]>;

export function getEnabledCheckoutGateways(): CheckoutGatewayName[] {
  return getEnabledCheckoutGatewaysFromContract(process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS) as CheckoutGatewayName[];
}

export function getCheckoutPaymentCountry(locale: Locale): CheckoutPaymentCountry {
  return CHECKOUT_PAYMENT_COUNTRY_BY_LOCALE[locale] ?? 'GLOBAL';
}

export function getGatewayOptionsByLocale(locale: Locale): CheckoutGatewayName[] {
  return getCheckoutGatewayOptionsFromContract(locale, process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS) as CheckoutGatewayName[];
}

export function getDefaultCheckoutGateway(locale: Locale): CheckoutGatewayName {
  return getDefaultCheckoutGatewayFromContract(locale, process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS) as CheckoutGatewayName;
}
