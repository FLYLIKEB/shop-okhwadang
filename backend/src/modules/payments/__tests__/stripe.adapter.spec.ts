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

describe('StripePaymentAdapter', () => {
  let adapter: StripePaymentAdapter;

  beforeEach(() => {
    mocks.paymentIntentsCreate.mockReset();
    mocks.paymentIntentsRetrieve.mockReset();
    mocks.refundsCreate.mockReset();

    adapter = new StripePaymentAdapter(
      createPaymentConfig({
        NODE_ENV: 'development',
        PAYMENT_GATEWAY: 'stripe',
        STRIPE_SECRET_KEY: 'sk_test_secret',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_publishable',
        STRIPE_WEBHOOK_SECRET: 'test_webhook_secret',
      }),
    );
  });

  describe('prepare', () => {
    it('PaymentIntent 생성 후 PrepareResult 반환', async () => {
      mocks.paymentIntentsCreate.mockResolvedValueOnce({
        client_secret: 'pi_test_secret_xyz',
        id: 'pi_test',
      });

      const result = await adapter.prepare('ORDER-123', 10000);

      expect(result.clientKey).toBe('pi_test_secret_xyz');
      expect(result.orderId).toBe('ORDER-123');
      expect(mocks.paymentIntentsCreate).toHaveBeenCalledWith({
        amount: 10000,
        currency: 'usd',
        metadata: { orderId: 'ORDER-123' },
      });
    });

    it('Stripe API 오류 → BadGatewayException', async () => {
      mocks.paymentIntentsCreate.mockRejectedValueOnce(new Error('Stripe network error'));

      await expect(adapter.prepare('ORDER-123', 10000)).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('confirm', () => {
    it('결제 성공 상태 → ConfirmResult 반환', async () => {
      mocks.paymentIntentsRetrieve.mockResolvedValueOnce({
        id: 'pi_test',
        status: 'succeeded',
        payment_method: 'pm_card_test',
        amount: 10000,
      });

      const result = await adapter.confirm('pi_test', 10000, 'ORDER-123');

      expect(result.paymentKey).toBe('pi_test');
      expect(result.status).toBe('confirmed');
      expect(result.amount).toBe(10000);
    });

    it('결제 미완료 상태 → BadGatewayException', async () => {
      mocks.paymentIntentsRetrieve.mockResolvedValueOnce({
        id: 'pi_test',
        status: 'requires_payment_method',
        amount: 10000,
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
  });

  describe('cancel', () => {
    it('환불 생성 → CancelResult 반환', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      mocks.refundsCreate.mockResolvedValueOnce({
        id: 're_test',
        created: nowSeconds,
        status: 'succeeded',
      });

      const result = await adapter.cancel('pi_test', '단순 변심');

      expect(result.cancelledAt).toBeInstanceOf(Date);
      expect(mocks.refundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_test',
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
  });
});
