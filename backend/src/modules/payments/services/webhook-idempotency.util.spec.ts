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

    it('eventId 가 없으면 paymentKey + eventType 으로 폴백', () => {
      const key = extractWebhookIdempotencyKey(
        PaymentGatewayType.TOSS,
        { paymentKey: 'pk-1', eventType: 'DONE' },
      );
      expect(key).toEqual({
        gateway: PaymentGatewayType.TOSS,
        eventId: 'pk-1:DONE',
        eventType: 'DONE',
      });
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

  describe('NaverPay', () => {
    it('paymentId + eventType 결합', () => {
      const key = extractWebhookIdempotencyKey(
        PaymentGatewayType.NAVERPAY,
        { paymentId: 'np-1', eventType: 'CANCEL' },
      );
      expect(key).toEqual({
        gateway: PaymentGatewayType.NAVERPAY,
        eventId: 'np-1:CANCEL',
        eventType: 'CANCEL',
      });
    });

    it('동일 paymentId 라도 confirm/cancel 이 분리됨', () => {
      const confirm = extractWebhookIdempotencyKey(
        PaymentGatewayType.NAVERPAY,
        { paymentId: 'np-1', eventType: 'DONE' },
      );
      const cancel = extractWebhookIdempotencyKey(
        PaymentGatewayType.NAVERPAY,
        { paymentId: 'np-1', eventType: 'CANCEL' },
      );
      expect(confirm?.eventId).not.toEqual(cancel?.eventId);
    });
  });

  describe('KGInicis', () => {
    it('tid + eventType 결합', () => {
      const key = extractWebhookIdempotencyKey(
        PaymentGatewayType.INICIS,
        { tid: 'tid-123', status: 'CANCELLED' },
      );
      expect(key).toEqual({
        gateway: PaymentGatewayType.INICIS,
        eventId: 'tid-123:CANCELLED',
        eventType: 'CANCELLED',
      });
    });
  });

  describe('Mock', () => {
    it('orderId + eventType 결합', () => {
      const key = extractWebhookIdempotencyKey(
        PaymentGatewayType.MOCK,
        { orderId: 7, status: 'DONE' },
      );
      expect(key).toEqual({
        gateway: PaymentGatewayType.MOCK,
        eventId: '7:DONE',
        eventType: 'DONE',
      });
    });

    it('payload 가 객체가 아니면 null', () => {
      expect(extractWebhookIdempotencyKey(PaymentGatewayType.MOCK, null)).toBeNull();
      expect(extractWebhookIdempotencyKey(PaymentGatewayType.MOCK, 'string')).toBeNull();
    });

    it('orderId 누락 시 null', () => {
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
