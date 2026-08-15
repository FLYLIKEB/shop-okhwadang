import {
  convertKrwToStripeUsd,
  createStripePaymentQuote,
  allocateStripeRefundCents,
  STRIPE_MONEY_POLICY,
  StripeMoneyPolicyError,
} from '../stripe-money.policy';

const now = new Date('2026-08-15T12:00:00.000Z');
const freshRate = {
  krwPerUsd: '1350',
  krwPerUsdUpdatedAt: '2026-08-15T11:00:00.000Z',
};

describe('Stripe KRW to USD money policy', () => {
  it('converts integer KRW to USD cents using half-up rounding', () => {
    expect(convertKrwToStripeUsd(1_000, freshRate, now)).toMatchObject({
      localAmount: 1_000,
      localCurrency: 'krw',
      providerAmount: 74,
      providerCurrency: 'usd',
    });
    expect(
      convertKrwToStripeUsd(101, { ...freshRate, krwPerUsd: '200' }, now).providerAmount,
    ).toBe(51);
  });

  it('accepts the supported lower and upper USD-cent boundaries', () => {
    expect(convertKrwToStripeUsd(675, freshRate, now).providerAmount).toBe(
      STRIPE_MONEY_POLICY.minUsdCents,
    );
    expect(
      convertKrwToStripeUsd(
        999_999_990,
        { ...freshRate, krwPerUsd: '1000' },
        now,
      ).providerAmount,
    ).toBe(STRIPE_MONEY_POLICY.maxUsdCents);
  });

  it('rejects fractional local amounts, out-of-range conversions, invalid rates, and stale rates', () => {
    expect(() => convertKrwToStripeUsd(1.5, freshRate, now)).toThrow(StripeMoneyPolicyError);
    expect(() => convertKrwToStripeUsd(600, freshRate, now)).toThrow(StripeMoneyPolicyError);
    expect(() => convertKrwToStripeUsd(1_000, { ...freshRate, krwPerUsd: '0' }, now)).toThrow(
      StripeMoneyPolicyError,
    );
    expect(() =>
      convertKrwToStripeUsd(
        1_000,
        { ...freshRate, krwPerUsdUpdatedAt: '2026-08-14T11:59:59.999Z' },
        now,
      ),
    ).toThrow(StripeMoneyPolicyError);
  });

  it('allocates partial refunds cumulatively and consumes the exact quoted cents on the final refund', () => {
    const quote = createStripePaymentQuote(10_000, freshRate, 'ORDER-100', 'pi_100', now);
    const first = allocateStripeRefundCents(quote, 0, 3_000);
    const second = allocateStripeRefundCents(quote, 3_000, 3_000);
    const final = allocateStripeRefundCents(quote, 6_000, 4_000);

    expect([first, second, final]).toEqual([222, 222, 297]);
    expect(first + second + final).toBe(quote.providerAmount);
  });

  it('keeps the final rounding-sensitive remainder in provider cents', () => {
    const quote = {
      localAmount: 40,
      localCurrency: 'krw' as const,
      providerAmount: 3,
      providerCurrency: 'usd' as const,
      krwPerUsd: '1350',
      krwPerUsdUpdatedAt: now.toISOString(),
      orderNumber: 'ORDER-40',
      paymentIntentId: 'pi_40',
      quotedAt: now.toISOString(),
    };
    const first = allocateStripeRefundCents(quote, 0, 20);
    const final = quote.providerAmount - first;

    expect(quote.providerAmount).toBe(3);
    expect(first).toBe(1);
    expect(final).toBe(2);
  });
});
