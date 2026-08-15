import { BadGatewayException } from '@nestjs/common';
import { createPaymentConfig } from '../../../config/payment.config';

// Shared mock refs — assigned after mock module loads
const mocks = {
  paymentIntentsCreate: jest.fn(),
  paymentIntentsRetrieve: jest.fn(),
  refundsCreate: jest.fn(),
};

jest.mock('stripe', () => {
  const MockStripe = jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: mocks.paymentIntentsCreate,
      retrieve: mocks.paymentIntentsRetrieve,
    },
    refunds: {
      create: mocks.refundsCreate,
    },
  }));
  return { __esModule: true, default: MockStripe };
});

import { StripePaymentAdapter } from '../adapters/stripe.adapter';
import { createStripePaymentQuote } from '../stripe-money.policy';

describe('StripePaymentAdapter', () => {
  let adapter: StripePaymentAdapter;
  let rateUpdatedAt: string;
  let quote: object;

  beforeEach(() => {
    mocks.paymentIntentsCreate.mockReset();
    mocks.paymentIntentsRetrieve.mockReset();
    mocks.refundsCreate.mockReset();
    rateUpdatedAt = new Date().toISOString();
    quote = {
      stripeQuote: createStripePaymentQuote(
        10_000,
        { krwPerUsd: '1350', krwPerUsdUpdatedAt: rateUpdatedAt },
        'ORDER-123',
        'pi_test',
      ),
    };

    adapter = new StripePaymentAdapter(
      createPaymentConfig({
        NODE_ENV: 'development',
        PAYMENT_GATEWAY: 'stripe',
        STRIPE_SECRET_KEY: 'sk_test_secret',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_publishable',
        STRIPE_WEBHOOK_SECRET: 'test_webhook_secret',
        STRIPE_KRW_PER_USD: '1350',
        STRIPE_KRW_PER_USD_UPDATED_AT: rateUpdatedAt,
      }),
    );
  });

  describe('prepare', () => {
    it('PaymentIntent 생성 후 PrepareResult 반환', async () => {
      mocks.paymentIntentsCreate.mockResolvedValueOnce({
        client_secret: 'pi_test_secret_xyz',
        id: 'pi_test',
        amount: 741,
        currency: 'usd',
        metadata: {
          orderId: 'ORDER-123',
          localAmount: '10000',
          localCurrency: 'krw',
          providerAmount: '741',
          providerCurrency: 'usd',
          krwPerUsd: '1350',
          krwPerUsdUpdatedAt: rateUpdatedAt,
        },
      });

      const result = await adapter.prepare('1', 10_000, { orderNumber: 'ORDER-123' });

      expect(result.clientKey).toBe('pi_test_secret_xyz');
      expect(result.orderId).toBe('1');
      expect(mocks.paymentIntentsCreate).toHaveBeenCalledWith({
        amount: 741,
        currency: 'usd',
        metadata: {
          orderId: 'ORDER-123',
          localAmount: '10000',
          localCurrency: 'krw',
          providerAmount: '741',
          providerCurrency: 'usd',
          krwPerUsd: '1350',
          krwPerUsdUpdatedAt: rateUpdatedAt,
        },
      });
    });

    it('Stripe API 오류 → BadGatewayException', async () => {
      mocks.paymentIntentsCreate.mockRejectedValueOnce(new Error('Stripe network error'));

      await expect(adapter.prepare('ORDER-123', 10000)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('저장된 견적은 환율 변경 후에도 같은 PaymentIntent를 재사용한다', async () => {
      mocks.paymentIntentsRetrieve.mockResolvedValueOnce({
        id: 'pi_test',
        client_secret: 'pi_test_secret_xyz',
        amount: 741,
        currency: 'usd',
        metadata: {
          orderId: 'ORDER-123',
          localAmount: '10000',
          localCurrency: 'krw',
          providerAmount: '741',
          providerCurrency: 'usd',
          krwPerUsd: '1350',
          krwPerUsdUpdatedAt: rateUpdatedAt,
        },
      });

      const result = await adapter.prepare('1', 10_000, {
        orderNumber: 'ORDER-123',
        rawResponse: quote,
      });

      expect(result.clientKey).toBe('pi_test_secret_xyz');
      expect(mocks.paymentIntentsCreate).not.toHaveBeenCalled();
    });

    it('서버 결제 시도 키를 Stripe create idempotency key로 전달한다', async () => {
      mocks.paymentIntentsCreate.mockResolvedValueOnce({
        id: 'pi_test',
        client_secret: 'pi_test_secret_xyz',
        amount: 741,
        currency: 'usd',
        metadata: {
          orderId: 'ORDER-123',
          localAmount: '10000',
          localCurrency: 'krw',
          providerAmount: '741',
          providerCurrency: 'usd',
          krwPerUsd: '1350',
          krwPerUsdUpdatedAt: rateUpdatedAt,
        },
      });

      await adapter.prepare('1', 10_000, {
        orderNumber: 'ORDER-123',
        idempotencyKey: 'stripe-payment-42',
      });

      expect(mocks.paymentIntentsCreate).toHaveBeenCalledWith(
        expect.any(Object),
        { idempotencyKey: 'stripe-payment-42' },
      );
    });

    it('유효하지 않거나 오래된 환율이면 Stripe를 호출하지 않고 차단한다', async () => {
      const invalidRateAdapter = new StripePaymentAdapter(
        createPaymentConfig({
          NODE_ENV: 'development',
          PAYMENT_GATEWAY: 'stripe',
          STRIPE_SECRET_KEY: 'sk_test_secret',
          STRIPE_KRW_PER_USD: '1350',
          STRIPE_KRW_PER_USD_UPDATED_AT: '2020-01-01T00:00:00.000Z',
        }),
      );

      await expect(invalidRateAdapter.prepare('ORDER-123', 10_000)).rejects.toThrow(
        BadGatewayException,
      );
      expect(mocks.paymentIntentsCreate).not.toHaveBeenCalled();
    });

    it('Stripe 공개 키가 없으면 Stripe를 호출하지 않고 차단한다', async () => {
      const unavailableAdapter = new StripePaymentAdapter(
        createPaymentConfig({
          NODE_ENV: 'development',
          PAYMENT_GATEWAY: 'stripe',
          STRIPE_SECRET_KEY: 'sk_test_secret',
          STRIPE_KRW_PER_USD: '1350',
          STRIPE_KRW_PER_USD_UPDATED_AT: rateUpdatedAt,
        }),
      );

      await expect(unavailableAdapter.prepare('ORDER-123', 10_000)).rejects.toThrow(
        BadGatewayException,
      );
      expect(mocks.paymentIntentsCreate).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('결제 성공 상태 → ConfirmResult 반환', async () => {
      mocks.paymentIntentsRetrieve.mockResolvedValueOnce({
        id: 'pi_test',
        status: 'succeeded',
        payment_method: 'pm_card_test',
        amount: 741,
        amount_received: 741,
        currency: 'usd',
        metadata: {
          orderId: 'ORDER-123',
          localAmount: '10000',
          localCurrency: 'krw',
          providerAmount: '741',
          providerCurrency: 'usd',
          krwPerUsd: '1350',
          krwPerUsdUpdatedAt: rateUpdatedAt,
        },
      });

      const result = await adapter.confirm('pi_test', 10000, 'ORDER-123', { rawResponse: quote });

      expect(result.paymentKey).toBe('pi_test');
      expect(result.status).toBe('confirmed');
      expect(result.amount).toBe(10000);
    });

    it('결제 미완료 상태 → BadGatewayException', async () => {
      mocks.paymentIntentsRetrieve.mockResolvedValueOnce({
        id: 'pi_test',
        status: 'requires_payment_method',
        amount: 741,
        amount_received: 741,
        currency: 'usd',
        metadata: {
          orderId: 'ORDER-123',
          localAmount: '10000',
          localCurrency: 'krw',
          providerAmount: '741',
          providerCurrency: 'usd',
          krwPerUsd: '1350',
          krwPerUsdUpdatedAt: rateUpdatedAt,
        },
      });

      await expect(adapter.confirm('pi_test', 10000, 'ORDER-123')).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('Stripe API 오류 → BadGatewayException', async () => {
      mocks.paymentIntentsRetrieve.mockRejectedValueOnce(new Error('Stripe network error'));

      await expect(adapter.confirm('pi_test', 10000, 'ORDER-123')).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('PaymentIntent amount 또는 currency가 정책 컨텍스트와 다르면 차단한다', async () => {
      mocks.paymentIntentsRetrieve.mockResolvedValueOnce({
        id: 'pi_test',
        status: 'succeeded',
        payment_method: 'pm_card_test',
        amount: 741,
        amount_received: 741,
        currency: 'krw',
        metadata: {
          orderId: 'ORDER-123',
          localAmount: '10000',
          localCurrency: 'krw',
          providerAmount: '741',
          providerCurrency: 'usd',
          krwPerUsd: '1350',
          krwPerUsdUpdatedAt: rateUpdatedAt,
        },
      });

      await expect(adapter.confirm('pi_test', 10_000, 'ORDER-123', { rawResponse: quote })).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('PaymentIntent 수령 금액이 견적 cents보다 작으면 차단한다', async () => {
      mocks.paymentIntentsRetrieve.mockResolvedValueOnce({
        id: 'pi_test',
        status: 'succeeded',
        payment_method: 'pm_card_test',
        amount: 741,
        amount_received: 740,
        currency: 'usd',
        metadata: {
          orderId: 'ORDER-123',
          localAmount: '10000',
          localCurrency: 'krw',
          providerAmount: '741',
          providerCurrency: 'usd',
          krwPerUsd: '1350',
          krwPerUsdUpdatedAt: rateUpdatedAt,
        },
      });

      await expect(adapter.confirm('pi_test', 10_000, 'ORDER-123', { rawResponse: quote })).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('cancel', () => {
    it('환불 생성 → CancelResult 반환', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      mocks.refundsCreate.mockResolvedValueOnce({
        id: 're_test',
        created: nowSeconds,
        status: 'succeeded',
      });

      const result = await adapter.cancel('pi_test', '단순 변심', { rawResponse: quote });

      expect(result.cancelledAt).toBeInstanceOf(Date);
      expect(mocks.refundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_test',
        amount: 741,
        reason: 'requested_by_customer',
        metadata: { reason: '단순 변심' },
      });
    });

    it('Stripe 환불 실패 → BadGatewayException', async () => {
      mocks.refundsCreate.mockRejectedValueOnce(new Error('Stripe refund error'));

      await expect(adapter.cancel('pi_test', '취소')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('partialCancel', () => {
    it('누적 KRW 환불을 원래 Stripe 견적 cents로 배분한다', async () => {
      mocks.refundsCreate.mockResolvedValue({ id: 're_test', created: 1 });

      await adapter.partialCancel({
        paymentKey: 'pi_test',
        cancelAmount: 3_000,
        priorRefundedAmount: 3_000,
        cancelReason: '부분 취소',
        rawResponse: quote,
      });

      expect(mocks.refundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_test',
        amount: 222,
        reason: 'requested_by_customer',
        metadata: { reason: '부분 취소' },
      });
    });

    it('최종 KRW 환불은 남은 Stripe cents를 정확히 소비한다', async () => {
      mocks.refundsCreate.mockResolvedValue({ id: 're_final', created: 1 });

      await adapter.partialCancel({
        paymentKey: 'pi_test',
        cancelAmount: 4_000,
        priorRefundedAmount: 6_000,
        cancelReason: '최종 취소',
        rawResponse: quote,
      });

      expect(mocks.refundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_test',
        amount: 297,
        reason: 'requested_by_customer',
        metadata: { reason: '최종 취소' },
      });
    });
  });

  describe('verifyWebhook', () => {
    it('올바른 서명 → true', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('crypto');
      const payload = { type: 'payment_intent.succeeded' };
      const body = JSON.stringify(payload);
      const sig = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update(body)
        .digest('hex');

      expect(adapter.verifyWebhook(payload, sig)).toBe(true);
    });

    it('잘못된 서명 → false', () => {
      expect(adapter.verifyWebhook({ type: 'test' }, 'wrong_signature')).toBe(false);
    });

    it('웹훅 secret 미설정 → 항상 false', () => {
      const adapterWithoutWebhookSecret = new StripePaymentAdapter(
        createPaymentConfig({
          NODE_ENV: 'development',
          PAYMENT_GATEWAY: 'stripe',
          STRIPE_SECRET_KEY: 'sk_test_secret',
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_publishable',
          STRIPE_KRW_PER_USD: '1350',
          STRIPE_KRW_PER_USD_UPDATED_AT: rateUpdatedAt,
        }),
      );

      expect(adapterWithoutWebhookSecret.verifyWebhook({ type: 'test' }, '00')).toBe(false);
    });
  });
});
