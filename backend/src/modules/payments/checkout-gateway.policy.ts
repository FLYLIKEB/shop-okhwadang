import {
  CheckoutGatewayName,
  getCheckoutGatewayOptions,
  getEnabledCheckoutGateways as getEnabledGatewaysFromContract,
  isCheckoutGatewayName,
} from '../../config/checkout-gateway-contract';

export type { CheckoutGatewayName };

/**
 * 국가/로케일 기반 결제 게이트웨이 노출 정책 (#1066)
 *
 * 로케일별로 적합한 결제수단만 노출한다.
 * - ko/KR: 토스페이먼츠 결제위젯
 * - 글로벌: PayPal 기본, Eximbay 카드 (네이버페이 숨김)
 */
export function getEnabledCheckoutGateways(env: NodeJS.ProcessEnv = process.env): CheckoutGatewayName[] {
  return getEnabledGatewaysFromContract(env.CHECKOUT_ENABLED_GATEWAYS);
}

export function getAvailableGatewaysByLocale(
  locale: string,
  env: NodeJS.ProcessEnv = process.env,
): CheckoutGatewayName[] {
  return getCheckoutGatewayOptions(locale, env.CHECKOUT_ENABLED_GATEWAYS);
}

export function resolveGatewayByLocale(
  locale: string,
  env: NodeJS.ProcessEnv = process.env,
): CheckoutGatewayName {
  return getAvailableGatewaysByLocale(locale, env)[0];
}

export { isCheckoutGatewayName };
