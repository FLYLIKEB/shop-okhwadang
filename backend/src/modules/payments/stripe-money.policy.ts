const USD_CENTS_PER_DOLLAR = 100n;
const RATE_SCALE = 1_000_000n;
const MAX_RATE_AGE_MS = 24 * 60 * 60 * 1000;

export const STRIPE_MONEY_POLICY = {
  localCurrency: 'krw',
  providerCurrency: 'usd',
  minKrwAmount: 1,
  maxKrwAmount: 1_000_000_000,
  minUsdCents: 50,
  maxUsdCents: 99_999_999,
  minKrwPerUsd: 100,
  maxKrwPerUsd: 10_000,
  maxRateAgeMs: MAX_RATE_AGE_MS,
} as const;

export interface StripeExchangeRateConfig {
  krwPerUsd: string;
  krwPerUsdUpdatedAt: string;
}

export interface StripeMoneyContext {
  localAmount: number;
  localCurrency: typeof STRIPE_MONEY_POLICY.localCurrency;
  providerAmount: number;
  providerCurrency: typeof STRIPE_MONEY_POLICY.providerCurrency;
  krwPerUsd: string;
  krwPerUsdUpdatedAt: string;
}

export interface StripePaymentQuote extends StripeMoneyContext {
  orderNumber: string;
  paymentIntentId: string;
  quotedAt: string;
}

export class StripeMoneyPolicyError extends Error {}

export function convertKrwToStripeUsd(
  localAmount: number,
  exchangeRate: StripeExchangeRateConfig,
  now = new Date(),
): StripeMoneyContext {
  assertKrwAmount(localAmount);
  const rate = validateStripeExchangeRate(exchangeRate, now);

  const numerator = BigInt(localAmount) * USD_CENTS_PER_DOLLAR * RATE_SCALE;
  const providerAmount = Number((numerator + rate / 2n) / rate);
  if (
    !Number.isSafeInteger(providerAmount) ||
    providerAmount < STRIPE_MONEY_POLICY.minUsdCents ||
    providerAmount > STRIPE_MONEY_POLICY.maxUsdCents
  ) {
    throw new StripeMoneyPolicyError('Converted USD amount is outside Stripe supported bounds');
  }

  return {
    localAmount,
    localCurrency: STRIPE_MONEY_POLICY.localCurrency,
    providerAmount,
    providerCurrency: STRIPE_MONEY_POLICY.providerCurrency,
    krwPerUsd: normalizeStripeExchangeRate(exchangeRate.krwPerUsd),
    krwPerUsdUpdatedAt: exchangeRate.krwPerUsdUpdatedAt,
  };
}

export function normalizeStripeExchangeRate(value: string): string {
  const scaled = parseExchangeRate(value);
  const whole = scaled / RATE_SCALE;
  const fraction = (scaled % RATE_SCALE).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function validateStripeExchangeRate(
  exchangeRate: StripeExchangeRateConfig,
  now = new Date(),
): bigint {
  const rate = parseExchangeRate(exchangeRate.krwPerUsd);
  assertFreshRate(exchangeRate.krwPerUsdUpdatedAt, now);
  return rate;
}

export function createStripePaymentQuote(
  localAmount: number,
  exchangeRate: StripeExchangeRateConfig,
  orderNumber: string,
  paymentIntentId: string,
  now = new Date(),
): StripePaymentQuote {
  if (!orderNumber || !paymentIntentId) {
    throw new StripeMoneyPolicyError('Stripe quote requires an order reference and PaymentIntent reference');
  }
  return {
    ...convertKrwToStripeUsd(localAmount, exchangeRate, now),
    orderNumber,
    paymentIntentId,
    quotedAt: now.toISOString(),
  };
}

export function readStripePaymentQuote(rawResponse: object | null | undefined): StripePaymentQuote {
  const quote = (rawResponse as { stripeQuote?: unknown } | null)?.stripeQuote;
  if (!quote || typeof quote !== 'object') {
    throw new StripeMoneyPolicyError('Missing persisted Stripe payment quote');
  }
  const value = quote as Partial<StripePaymentQuote>;
  if (
    !Number.isSafeInteger(value.localAmount) ||
    !Number.isSafeInteger(value.providerAmount) ||
    value.localCurrency !== STRIPE_MONEY_POLICY.localCurrency ||
    value.providerCurrency !== STRIPE_MONEY_POLICY.providerCurrency ||
    typeof value.orderNumber !== 'string' ||
    typeof value.paymentIntentId !== 'string' ||
    typeof value.krwPerUsd !== 'string' ||
    typeof value.krwPerUsdUpdatedAt !== 'string' ||
    typeof value.quotedAt !== 'string'
  ) {
    throw new StripeMoneyPolicyError('Invalid persisted Stripe payment quote');
  }
  return value as StripePaymentQuote;
}

export function allocateStripeRefundCents(
  quote: StripePaymentQuote,
  priorRefundedAmount: number,
  cancelAmount: number,
): number {
  if (
    !Number.isSafeInteger(priorRefundedAmount) ||
    !Number.isSafeInteger(cancelAmount) ||
    priorRefundedAmount < 0 ||
    cancelAmount <= 0 ||
    priorRefundedAmount + cancelAmount > quote.localAmount
  ) {
    throw new StripeMoneyPolicyError('Invalid local refund allocation');
  }
  if (priorRefundedAmount + cancelAmount === quote.localAmount) {
    return quote.providerAmount - convertQuotedKrwToUsdCents(priorRefundedAmount, quote);
  }
  return (
    convertQuotedKrwToUsdCents(priorRefundedAmount + cancelAmount, quote)
    - convertQuotedKrwToUsdCents(priorRefundedAmount, quote)
  );
}

function convertQuotedKrwToUsdCents(amount: number, quote: StripePaymentQuote): number {
  const rate = parseExchangeRate(quote.krwPerUsd);
  return Number((BigInt(amount) * USD_CENTS_PER_DOLLAR * RATE_SCALE + rate / 2n) / rate);
}

function assertKrwAmount(amount: number): void {
  if (
    !Number.isSafeInteger(amount) ||
    amount < STRIPE_MONEY_POLICY.minKrwAmount ||
    amount > STRIPE_MONEY_POLICY.maxKrwAmount
  ) {
    throw new StripeMoneyPolicyError('KRW amount must be an integer within supported bounds');
  }
}

function parseExchangeRate(value: string): bigint {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) {
    throw new StripeMoneyPolicyError('STRIPE_KRW_PER_USD must be a positive decimal with up to six places');
  }

  const [whole, fraction = ''] = value.split('.');
  const scaled = BigInt(whole) * RATE_SCALE + BigInt(fraction.padEnd(6, '0'));
  if (
    scaled < BigInt(STRIPE_MONEY_POLICY.minKrwPerUsd) * RATE_SCALE ||
    scaled > BigInt(STRIPE_MONEY_POLICY.maxKrwPerUsd) * RATE_SCALE
  ) {
    throw new StripeMoneyPolicyError('STRIPE_KRW_PER_USD is outside supported bounds');
  }
  return scaled;
}

function assertFreshRate(value: string, now: Date): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new StripeMoneyPolicyError('STRIPE_KRW_PER_USD_UPDATED_AT must be an ISO-8601 UTC timestamp');
  }

  const updatedAt = Date.parse(value);
  if (!Number.isFinite(updatedAt) || updatedAt > now.getTime() || now.getTime() - updatedAt > MAX_RATE_AGE_MS) {
    throw new StripeMoneyPolicyError('STRIPE_KRW_PER_USD exchange rate is stale');
  }
}
