import { BadGatewayException } from '@nestjs/common';
import { PayPalPaymentAdapter } from '../adapters/paypal.adapter';
import { createPaymentConfig } from '../../../config/payment.config';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PayPalPaymentAdapter', () => {
  let adapter: PayPalPaymentAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PayPalPaymentAdapter(
      createPaymentConfig({
        NODE_ENV: 'development',
        PAYMENT_GATEWAY: 'paypal',
        PAYPAL_CLIENT_ID: 'paypal-client',
        PAYPAL_CLIENT_SECRET: 'paypal-secret',
        PAYPAL_WEBHOOK_ID: 'paypal-webhook',
        FRONTEND_URL: 'https://shop.example.com',
        PAYPAL_KRW_PER_USD: '1350',
      }),
    );
  });

  function mockAccessToken(): void {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'access-token' }),
    });
  }

  describe('prepare', () => {
    it('prepare → Orders v2 create 호출 후 approve redirectUrl 반환', async () => {
      mockAccessToken();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'PAYPAL-ORDER-1',
          links: [
            {
              rel: 'self',
              href: 'https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL-ORDER-1',
            },
            { rel: 'approve', href: 'https://www.paypal.com/checkoutnow?token=PAYPAL-ORDER-1' },
          ],
        }),
      });

      const result = await adapter.prepare('ORDER-123', 10000, { locale: 'en' });

      expect(result).toEqual({
        clientKey: 'paypal-client',
        orderId: 'PAYPAL-ORDER-1',
        redirectUrl: 'https://www.paypal.com/checkoutnow?token=PAYPAL-ORDER-1',
      });
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api-m.sandbox.paypal.com/v2/checkout/orders',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('https://shop.example.com/en/checkout/success'),
        }),
      );
      const createOrderBody = JSON.parse(mockFetch.mock.calls.at(-1)?.[1]?.body as string);
      expect(createOrderBody.purchase_units[0].amount).toEqual({
        currency_code: 'USD',
        value: '7.41',
      });
    });
  });

  describe('confirm', () => {
    it('confirm → Orders v2 capture COMPLETED 응답을 confirmed로 변환', async () => {
      mockAccessToken();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'PAYPAL-ORDER-1',
          status: 'COMPLETED',
          purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-1' }] } }],
        }),
      });

      const result = await adapter.confirm('PAYPAL-ORDER-1', 10000, 'ORDER-123');

      expect(result.status).toBe('confirmed');
      expect(result.method).toBe('paypal');
      expect(result.paymentKey).toBe('PAYPAL-ORDER-1');
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL-ORDER-1/capture',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('confirm → COMPLETED 외 상태는 BadGatewayException', async () => {
      mockAccessToken();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'PAYPAL-ORDER-1', status: 'PAYER_ACTION_REQUIRED' }),
      });

      await expect(adapter.confirm('PAYPAL-ORDER-1', 10000, 'ORDER-123')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('partialCancel', () => {
    it('partialCancel → capture id 조회 후 refund endpoint 호출', async () => {
      mockAccessToken();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-1' }] } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'REFUND-1', create_time: '2026-01-01T00:00:00Z' }),
        });

      const result = await adapter.partialCancel({
        paymentKey: 'PAYPAL-ORDER-1',
        cancelAmount: 5000,
        cancelReason: '부분 환불',
      });

      expect(result.refundId).toBe('REFUND-1');
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE-1/refund',
        expect.objectContaining({ method: 'POST' }),
      );
      const refundBody = JSON.parse(mockFetch.mock.calls.at(-1)?.[1]?.body as string);
      expect(refundBody.amount).toEqual({ currency_code: 'USD', value: '3.70' });
    });
  });

  describe('verifyWebhook', () => {
    const signature = JSON.stringify({
      auth_algo: 'SHA256withRSA',
      cert_url: 'https://api-m.sandbox.paypal.com/certs/test.pem',
      transmission_id: 'transmission-1',
      transmission_sig: 'signature-1',
      transmission_time: '2026-01-01T00:00:00Z',
    });

    it('verify-webhook-signature SUCCESS → true', async () => {
      mockAccessToken();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verification_status: 'SUCCESS' }),
      });

      await expect(
        adapter.verifyWebhook({ id: 'WH-1', event_type: 'PAYMENT.CAPTURE.COMPLETED' }, signature),
      ).resolves.toBe(true);
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('paypal-webhook'),
        }),
      );
    });

    it('verify-webhook-signature FAILURE → false', async () => {
      mockAccessToken();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verification_status: 'FAILURE' }),
      });

      await expect(adapter.verifyWebhook({ id: 'WH-1' }, signature)).resolves.toBe(false);
    });

    it('잘못된 signature JSON → false', async () => {
      await expect(adapter.verifyWebhook({ id: 'WH-1' }, 'not-json')).resolves.toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
