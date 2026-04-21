import { BadGatewayException } from '@nestjs/common';
import { TossPaymentAdapter } from '../adapters/toss.adapter';
import { createPaymentConfig } from '../../../config/payment.config';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('TossPaymentAdapter', () => {
  let adapter: TossPaymentAdapter;

  beforeEach(() => {
    adapter = new TossPaymentAdapter(
      createPaymentConfig({
        NODE_ENV: 'development',
        PAYMENT_GATEWAY: 'toss',
        TOSS_SECRET_KEY: 'test_secret',
        TOSS_CLIENT_KEY: 'test_ck_abc',
      }),
    );
    jest.clearAllMocks();
  });

  describe('confirm', () => {
    it('토스 API 200 → ConfirmResult 반환', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          paymentKey: 'pk123',
          method: 'card',
          totalAmount: 10000,
          status: 'DONE',
        }),
      });

      const result = await adapter.confirm('pk123', 10000, 'ORD-TEST-001');

      expect(result.paymentKey).toBe('pk123');
      expect(result.method).toBe('card');
      expect(result.status).toBe('confirmed');
    });

    it('토스 API 5xx → BadGatewayException', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal error' }),
      });

      await expect(adapter.confirm('pk123', 10000, 'ORD-TEST-001')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('cancel', () => {
    it('전액 취소 → CancelResult 반환', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cancels: [
            {
              canceledAt: '2026-01-01T00:00:00.000Z',
              cancelAmount: 10000,
            },
          ],
        }),
      });

      const result = await adapter.cancel('pk123', '단순 변심');

      expect(result.cancelledAt).toBeInstanceOf(Date);
    });

    it('토스 API 실패 → BadGatewayException', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ code: 'ALREADY_CANCELLED' }),
      });

      await expect(adapter.cancel('pk123', '취소')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('verifyWebhook', () => {
    it('올바른 서명 → true', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('crypto');
      const payload = { eventType: 'PAYMENT_STATUS_CHANGED' };
      const sig = crypto
        .createHmac('sha256', 'test_secret')
        .update(JSON.stringify(payload))
        .digest('base64');

      expect(adapter.verifyWebhook(payload, sig)).toBe(true);
    });

    it('잘못된 서명 → false', () => {
      expect(adapter.verifyWebhook({ event: 'test' }, 'wrong_signature')).toBe(
        false,
      );
    });
  });

  describe('prepare', () => {
    it('clientKey 반환', async () => {
      const result = await adapter.prepare('ORDER-123', 50000);
      expect(result.clientKey).toBe('test_ck_abc');
      expect(result.orderId).toBe('ORDER-123');
    });
  });

  describe('partialCancel', () => {
    it('Toss 응답의 transactionKey를 refundId로 반환', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cancels: [
            {
              canceledAt: '2026-01-01T00:00:00.000Z',
              cancelAmount: 5000,
              transactionKey: 'toss-txn-key-abc123',
            },
          ],
        }),
      });

      const result = await adapter.partialCancel({
        paymentKey: 'pk123',
        cancelAmount: 5000,
        cancelReason: '부분 환불',
      });

      expect(result.refundId).toBe('toss-txn-key-abc123');
      expect(result.cancelledAt).toBeInstanceOf(Date);
    });

    it('cancels 배열 마지막 항목의 transactionKey 사용', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cancels: [
            { canceledAt: '2026-01-01T00:00:00.000Z', cancelAmount: 3000, transactionKey: 'first-key' },
            { canceledAt: '2026-01-02T00:00:00.000Z', cancelAmount: 5000, transactionKey: 'last-key' },
          ],
        }),
      });

      const result = await adapter.partialCancel({
        paymentKey: 'pk123',
        cancelAmount: 5000,
        cancelReason: '부분 환불',
      });

      expect(result.refundId).toBe('last-key');
    });

    it('transactionKey 없으면 toss- 폴백 ID 사용', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cancels: [{ canceledAt: '2026-01-01T00:00:00.000Z', cancelAmount: 5000 }],
        }),
      });

      const result = await adapter.partialCancel({
        paymentKey: 'pk123',
        cancelAmount: 5000,
        cancelReason: '부분 환불',
      });

      expect(result.refundId).toMatch(/^toss-pk123-\d+$/);
    });

    it('Toss API 실패 → BadGatewayException', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ code: 'INVALID_REQUEST' }),
      });

      await expect(
        adapter.partialCancel({ paymentKey: 'pk123', cancelAmount: 5000, cancelReason: '환불' }),
      ).rejects.toThrow(BadGatewayException);
    });
  });
});
