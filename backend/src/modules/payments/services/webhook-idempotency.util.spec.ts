import { PaymentGatewayType } from '../entities/payment.entity';
import {
  extractWebhookIdempotencyKey,
  isDuplicateKeyError,
} from './webhook-idempotency.util';

describe('extractWebhookIdempotencyKey', () => {
  describe('Toss', () => {
    it('eventId 가 있으면 그대로 사용', () => {
      const key = extractWebhookIdempotencyKey(
        PaymentGatewayType.TOSS,
        { eventId: 'evt-toss-1', eventType: 'PAYMENT_STATUS_CHANGED', paymentKey: 'pk-1' },
      );
      expect(key).toEqual({
        gateway: PaymentGatewayType.TOSS,
        eventId: 'evt-toss-1',
        eventType: 'PAYMENT_STATUS_CHANGED',
      });
    });

    it('stable provider eventId 없이는 거부한다', () => {
      expect(extractWebhookIdempotencyKey(
        PaymentGatewayType.TOSS,
        { paymentKey: 'pk-1', eventType: 'DONE' },
      )).toBeNull();
    });

    it('paymentKey 도 없으면 null', () => {
      expect(
        extractWebhookIdempotencyKey(PaymentGatewayType.TOSS, { eventType: 'DONE' }),
      ).toBeNull();
    });
  });

  describe('Stripe', () => {
    it('event.id 사용', () => {
      const key = extractWebhookIdempotencyKey(
        PaymentGatewayType.STRIPE,
        { id: 'evt_abc', type: 'payment_intent.succeeded' },
      );
      expect(key).toEqual({
        gateway: PaymentGatewayType.STRIPE,
        eventId: 'evt_abc',
        eventType: 'payment_intent.succeeded',
      });
    });

    it('id 가 없으면 null', () => {
      expect(
        extractWebhookIdempotencyKey(PaymentGatewayType.STRIPE, { type: 'foo' }),
      ).toBeNull();
    });
  });

  describe('PayPal', () => {
    it('webhook id + event_type 사용', () => {
      const key = extractWebhookIdempotencyKey(
        PaymentGatewayType.PAYPAL,
        { id: 'WH-123', event_type: 'CHECKOUT.ORDER.APPROVED' },
      );
      expect(key).toEqual({
        gateway: PaymentGatewayType.PAYPAL,
        eventId: 'WH-123',
        eventType: 'CHECKOUT.ORDER.APPROVED',
      });
    });

    it('id 가 없으면 null', () => {
      expect(
        extractWebhookIdempotencyKey(PaymentGatewayType.PAYPAL, { event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
      ).toBeNull();
    });
  });

  describe('KGInicis', () => {
    it('stable provider eventId 사용', () => {
      const key = extractWebhookIdempotencyKey(
        PaymentGatewayType.INICIS,
        { eventId: 'evt-inicis-1', tid: 'tid-123', status: 'CANCELLED' },
      );
      expect(key).toEqual({
        gateway: PaymentGatewayType.INICIS,
        eventId: 'evt-inicis-1',
        eventType: 'CANCELLED',
      });
    });
  });

  describe('Mock', () => {
    it('stable provider eventId 사용', () => {
      const key = extractWebhookIdempotencyKey(
        PaymentGatewayType.MOCK,
        { eventId: 'evt-mock-1', orderId: 7, status: 'DONE' },
      );
      expect(key).toEqual({
        gateway: PaymentGatewayType.MOCK,
        eventId: 'evt-mock-1',
        eventType: 'DONE',
      });
    });

    it('payload 가 객체가 아니면 null', () => {
      expect(extractWebhookIdempotencyKey(PaymentGatewayType.MOCK, null)).toBeNull();
      expect(extractWebhookIdempotencyKey(PaymentGatewayType.MOCK, 'string')).toBeNull();
    });

    it('eventId 누락 시 null', () => {
      expect(
        extractWebhookIdempotencyKey(PaymentGatewayType.MOCK, { status: 'DONE' }),
      ).toBeNull();
    });
  });
});

describe('isDuplicateKeyError', () => {
  it('top-level code === ER_DUP_ENTRY → true', () => {
    expect(isDuplicateKeyError({ code: 'ER_DUP_ENTRY' })).toBe(true);
  });

  it('TypeORM driverError.code === ER_DUP_ENTRY → true', () => {
    expect(
      isDuplicateKeyError({ driverError: { code: 'ER_DUP_ENTRY' } }),
    ).toBe(true);
  });

  it('관계없는 에러 → false', () => {
    expect(isDuplicateKeyError(new Error('boom'))).toBe(false);
    expect(isDuplicateKeyError({ code: 'ER_OTHER' })).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
    expect(isDuplicateKeyError(undefined)).toBe(false);
  });
});
