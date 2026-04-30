import { BadGatewayException } from '@nestjs/common';
import { KGInicisPaymentAdapter } from '../adapters/inicis.adapter';
import { createPaymentConfig } from '../../../config/payment.config';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('KGInicisPaymentAdapter', () => {
  let adapter: KGInicisPaymentAdapter;

  beforeEach(() => {
    adapter = new KGInicisPaymentAdapter(
      createPaymentConfig({
        NODE_ENV: 'development',
        PAYMENT_GATEWAY: 'inicis',
        INICIS_MID: 'INIpayTest',
        INICIS_SIGN_KEY: 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS',
        INICIS_API_KEY: 'inicis_api_key',
        INICIS_CLIENT_KEY: 'inicis_client_key',
      }),
    );
    jest.clearAllMocks();
  });

  describe('prepare', () => {
    it('clientKey와 orderId를 반환한다', async () => {
      const result = await adapter.prepare('ORDER-INICIS-123', 50000);

      expect(result.clientKey).toBe('inicis_client_key');
      expect(result.orderId).toBe('ORDER-INICIS-123');
    });
  });

  describe('confirm', () => {
    it('이니시스 API 200 → ConfirmResult 반환', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resultCode: '0000',
          tid: 'StdpayCARD20260101000000',
          payMethod: 'Card',
          totPrice: 10000,
        }),
      });

      const result = await adapter.confirm('StdpayCARD20260101000000', 10000, 'ORD-INICIS-001');

      expect(result.paymentKey).toBe('StdpayCARD20260101000000');
      expect(result.method).toBe('card');
      expect(result.amount).toBe(10000);
      expect(result.status).toBe('confirmed');
    });

    it('이니시스 API resultCode != 0000 → BadGatewayException', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resultCode: '9999', resultMsg: '거래실패' }),
      });

      await expect(
        adapter.confirm('StdpayCARD20260101000000', 10000, 'ORD-INICIS-001'),
      ).rejects.toThrow(BadGatewayException);
    });

    it('이니시스 API 5xx → BadGatewayException', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal error' }),
      });

      await expect(
        adapter.confirm('StdpayCARD20260101000000', 10000, 'ORD-INICIS-001'),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('cancel', () => {
    it('전액 취소 → CancelResult 반환', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resultCode: '00',
          cancelDate: '20260101',
          cancelTime: '120000',
        }),
      });

      const result = await adapter.cancel('StdpayCARD20260101000000', '단순 변심');

      expect(result.cancelledAt).toBeInstanceOf(Date);
    });

    it('이니시스 취소 실패 → BadGatewayException', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resultCode: '99', resultMsg: '취소 불가' }),
      });

      await expect(
        adapter.cancel('StdpayCARD20260101000000', '취소'),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('partialCancel', () => {
    it('부분 취소 응답의 tid를 refundId로 반환', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resultCode: '00',
          cancelTid: 'CancelStdpay20260101120000',
          cancelDate: '20260101',
          cancelTime: '120000',
        }),
      });

      const result = await adapter.partialCancel({
        paymentKey: 'StdpayCARD20260101000000',
        cancelAmount: 5000,
        cancelReason: '부분 환불',
      });

      expect(result.refundId).toBe('CancelStdpay20260101120000');
      expect(result.cancelledAt).toBeInstanceOf(Date);
    });

    it('cancelTid 없으면 inicis- 폴백 ID 사용', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resultCode: '00',
          cancelDate: '20260101',
          cancelTime: '120000',
        }),
      });

      const result = await adapter.partialCancel({
        paymentKey: 'StdpayCARD20260101000000',
        cancelAmount: 5000,
        cancelReason: '부분 환불',
      });

      expect(result.refundId).toMatch(/^inicis-StdpayCARD20260101000000-\d+$/);
    });

    it('이니시스 부분 취소 실패 → BadGatewayException', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ resultCode: '99' }),
      });

      await expect(
        adapter.partialCancel({
          paymentKey: 'StdpayCARD20260101000000',
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
      const payload = { tid: 'StdpayCARD20260101000000', resultCode: '0000' };
      const sig = crypto
        .createHmac('sha256', 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS')
        .update(JSON.stringify(payload))
        .digest('hex');

      expect(adapter.verifyWebhook(payload, sig)).toBe(true);
    });

    it('잘못된 서명 → false', () => {
      expect(adapter.verifyWebhook({ tid: 'test' }, 'wrong_signature')).toBe(false);
    });
  });
});
