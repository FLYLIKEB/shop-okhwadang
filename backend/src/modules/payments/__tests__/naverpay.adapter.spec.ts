import { BadGatewayException } from '@nestjs/common';
import { NaverPayPaymentAdapter } from '../adapters/naverpay.adapter';
import { createPaymentConfig } from '../../../config/payment.config';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NaverPayPaymentAdapter', () => {
  let adapter: NaverPayPaymentAdapter;

  beforeEach(() => {
    adapter = new NaverPayPaymentAdapter(
      createPaymentConfig({
        NODE_ENV: 'development',
        PAYMENT_GATEWAY: 'naverpay',
        NAVERPAY_PARTNER_ID: 'naverpay-test-partner',
        NAVERPAY_CLIENT_ID: 'naverpay-test-client',
        NAVERPAY_CLIENT_SECRET: 'naverpay-test-secret',
        NAVERPAY_CHAIN_ID: 'naverpay-chain-id',
      }),
    );
    jest.clearAllMocks();
  });

  describe('prepare', () => {
    it('clientKey와 orderId를 반환한다', async () => {
      const result = await adapter.prepare('ORDER-NAVERPAY-1', 30000);

      expect(result.clientKey).toBe('naverpay-test-client');
      expect(result.orderId).toBe('ORDER-NAVERPAY-1');
      expect(result.gatewayPayload).toEqual({
        chainId: 'naverpay-chain-id',
        mode: 'development',
      });
    });
  });

  describe('confirm', () => {
    it('네이버페이 API code=Success → ConfirmResult 반환', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Success',
          message: '결제가 정상 처리되었습니다.',
          body: {
            paymentId: '20260101NP0000001',
            primaryPayMeans: 'CARD',
            totalPayAmount: 10000,
            admissionState: 'SUCCESS',
          },
        }),
      });

      const result = await adapter.confirm('20260101NP0000001', 10000, 'ORD-NAVERPAY-1');

      expect(result.paymentKey).toBe('20260101NP0000001');
      expect(result.method).toBe('card');
      expect(result.amount).toBe(10000);
      expect(result.status).toBe('confirmed');
    });

    it('네이버페이 API code=Fail → BadGatewayException', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 'Fail', message: '결제 실패' }),
      });

      await expect(
        adapter.confirm('20260101NP0000001', 10000, 'ORD-NAVERPAY-1'),
      ).rejects.toThrow(BadGatewayException);
    });

    it('네이버페이 API 5xx → BadGatewayException', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal error' }),
      });

      await expect(
        adapter.confirm('20260101NP0000001', 10000, 'ORD-NAVERPAY-1'),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('cancel', () => {
    it('전액 취소 → CancelResult 반환', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Success',
          body: {
            cancelDetail: { cancelDateTime: '2026-01-01T12:00:00+0900' },
          },
        }),
      });

      const result = await adapter.cancel('20260101NP0000001', '단순 변심');

      expect(result.cancelledAt).toBeInstanceOf(Date);
    });

    it('네이버페이 취소 실패 → BadGatewayException', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 'Fail', message: '취소 불가' }),
      });

      await expect(
        adapter.cancel('20260101NP0000001', '취소'),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('partialCancel', () => {
    it('부분 취소 응답의 cancelId를 refundId로 반환', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Success',
          body: {
            cancelDetail: {
              cancelId: 'NP-CANCEL-20260101-0001',
              cancelDateTime: '2026-01-01T12:00:00+0900',
            },
          },
        }),
      });

      const result = await adapter.partialCancel({
        paymentKey: '20260101NP0000001',
        cancelAmount: 5000,
        cancelReason: '부분 환불',
      });

      expect(result.refundId).toBe('NP-CANCEL-20260101-0001');
      expect(result.cancelledAt).toBeInstanceOf(Date);
    });

    it('cancelId 없으면 naverpay- 폴백 ID 사용', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Success',
          body: { cancelDetail: { cancelDateTime: '2026-01-01T12:00:00+0900' } },
        }),
      });

      const result = await adapter.partialCancel({
        paymentKey: '20260101NP0000001',
        cancelAmount: 5000,
        cancelReason: '부분 환불',
      });

      expect(result.refundId).toMatch(/^naverpay-20260101NP0000001-\d+$/);
    });

    it('네이버페이 부분 취소 실패 → BadGatewayException', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ code: 'Fail' }),
      });

      await expect(
        adapter.partialCancel({
          paymentKey: '20260101NP0000001',
          cancelAmount: 5000,
          cancelReason: '환불',
        }),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('verifyWebhook', () => {
    it('올바른 서명 → true', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('crypto');
      const payload = { paymentId: '20260101NP0000001', code: 'Success' };
      const sig = crypto
        .createHmac('sha256', 'naverpay-test-secret')
        .update(JSON.stringify(payload))
        .digest('hex');

      expect(adapter.verifyWebhook(payload, sig)).toBe(true);
    });

    it('잘못된 서명 → false', () => {
      expect(adapter.verifyWebhook({ paymentId: 'test' }, 'wrong_signature')).toBe(false);
    });
  });
});
