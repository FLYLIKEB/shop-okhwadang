import type { Locale } from '@/i18n/routing';
import type { CheckoutGatewayName } from '@/lib/api';
import {
  getAvailableCheckoutGateways,
  getEnabledCheckoutGateways as getSharedEnabledCheckoutGateways,
} from '../../backend/src/config/checkout-gateway-contract';

export type CheckoutPaymentCountry = 'KR' | 'GLOBAL';

export const CHECKOUT_PAYMENT_COUNTRY_BY_LOCALE = {
  ko: 'KR',
  en: 'GLOBAL',
} as const satisfies Record<Locale, CheckoutPaymentCountry>;

export function getEnabledCheckoutGateways(): CheckoutGatewayName[] {
  return getSharedEnabledCheckoutGateways(process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS);
}

export function getCheckoutPaymentCountry(locale: Locale): CheckoutPaymentCountry {
  return CHECKOUT_PAYMENT_COUNTRY_BY_LOCALE[locale] ?? 'GLOBAL';
}

export function getGatewayOptionsByLocale(locale: Locale): CheckoutGatewayName[] {
  return getAvailableCheckoutGateways(locale, process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS);
}

export function getDefaultCheckoutGateway(locale: Locale): CheckoutGatewayName {
  return getGatewayOptionsByLocale(locale)[0] ?? 'paypal';
}
