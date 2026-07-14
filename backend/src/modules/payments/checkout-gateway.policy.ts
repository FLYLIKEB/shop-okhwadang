export type CheckoutGatewayName = 'naverpay' | 'bank_transfer' | 'eximbay' | 'paypal';

const DEFAULT_CHECKOUT_GATEWAYS: CheckoutGatewayName[] = ['naverpay', 'bank_transfer', 'eximbay', 'paypal'];

/**
 * 국가/로케일 기반 결제 게이트웨이 노출 정책 (#1066)
 *
 * 로케일별로 적합한 결제수단만 노출한다.
 * - ko/KR: 네이버페이 기본, 무통장입금, PayPal, Eximbay 카드
 * - 글로벌: PayPal 기본, Eximbay 카드 (네이버페이 숨김)
 */
export function getEnabledCheckoutGateways(env: NodeJS.ProcessEnv = process.env): CheckoutGatewayName[] {
  const configured = env.CHECKOUT_ENABLED_GATEWAYS;
  if (!configured || configured.trim() === '') return DEFAULT_CHECKOUT_GATEWAYS;

  const gateways = configured
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(isCheckoutGatewayName);

  return [...new Set([...gateways, 'bank_transfer' as const])];
}

export function getAvailableGatewaysByLocale(
  locale: string,
  env: NodeJS.ProcessEnv = process.env,
): CheckoutGatewayName[] {
  const localeOrder: CheckoutGatewayName[] = locale === 'ko'
    ? ['naverpay', 'bank_transfer', 'paypal', 'eximbay']
    : ['paypal', 'eximbay'];
  const enabled = getEnabledCheckoutGateways(env);
  return localeOrder.filter((gateway) => enabled.includes(gateway));
}

export function resolveGatewayByLocale(
  locale: string,
  env: NodeJS.ProcessEnv = process.env,
): CheckoutGatewayName {
  return getAvailableGatewaysByLocale(locale, env)[0];
}

export function isCheckoutGatewayName(value: string): value is CheckoutGatewayName {
  return value === 'naverpay' || value === 'bank_transfer' || value === 'eximbay' || value === 'paypal';
}
