import * as crypto from 'crypto';
import { EximbayPaymentAdapter } from '../adapters/eximbay.adapter';
import { createPaymentConfig } from '../../../config/payment.config';

const makeAdapter = () => new EximbayPaymentAdapter(createPaymentConfig({
  NODE_ENV: 'development',
  PAYMENT_GATEWAY: 'eximbay',
  FRONTEND_URL: 'http://localhost:5173',
  BACKEND_URL: 'http://localhost:3000/api',
  EXIMBAY_MERCHANT_ID: 'mid-123',
  EXIMBAY_API_KEY: 'api-key',
  EXIMBAY_SECRET_KEY: 'secret-key',
  EXIMBAY_WEBHOOK_SECRET: 'webhook-secret',
  EXIMBAY_CURRENCY: 'KRW',
}));

describe('EximbayPaymentAdapter', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('prepare()는 Payment Preparation API 결과를 Eximbay SDK payload로 변환한다', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ rescode: '0000', resmsg: 'Success.', fgkey: 'FGKEY-1' }),
    } as Response);

    const result = await makeAdapter().prepare('1', 40000, { locale: 'ko', orderNumber: 'ORD-001' });

    expect(result).toMatchObject({
      clientKey: 'mid-123',
      orderId: 'ORD-001',
      providerOrderReference: 'ORD-001',
      providerAmount: 40000,
      providerCurrency: 'KRW',
      gatewayPayload: expect.objectContaining({
        fgkey: 'FGKEY-1',
        jsSdkUrl: 'https://api-test.eximbay.com/v1/javascriptSDK.js',
      }),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api-test.eximbay.com/v1/payments/ready',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('confirm()은 callback data를 verify/retrieve로 서버 검증하고 transaction_id를 paymentKey로 반환한다', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ rescode: '0000', resmsg: 'Success.' }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rescode: '0000',
          resmsg: 'Success.',
          payment: {
            order_id: 'ORD-001',
            currency: 'KRW',
            amount: '40000',
            transaction_id: 'EXIMBAY-TX-1',
            status: 'SALE',
            balance: '40000',
          },
          card_info: { card_number1: '4111', card_number4: '1111' },
        }),
      } as Response);

    const result = await makeAdapter().confirm(
      'rescode=0000&order_id=ORD-001&transaction_id=EXIMBAY-TX-1',
      40000,
      'ORD-001',
    );

    expect(result).toMatchObject({
      paymentKey: 'EXIMBAY-TX-1',
      method: 'card',
      amount: 40000,
      status: 'confirmed',
    });
  });

  it('verifyWebhook()은 Eximbay HMAC-SHA256 base64 서명을 검증한다', () => {
    const payload = { rescode: '0000', transaction_id: 'EXIMBAY-TX-1' };
    const signature = crypto
      .createHmac('sha256', 'webhook-secret')
      .update(JSON.stringify(payload))
      .digest('base64');

    expect(makeAdapter().verifyWebhook(payload, signature)).toBe(true);
    expect(makeAdapter().verifyWebhook(payload, 'bad-signature')).toBe(false);
  });

  it('confirm fails closed when retrieved provider payment has no transaction ID', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ rescode: '0000' }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rescode: '0000',
          payment: {
            order_id: 'ORD-001',
            currency: 'KRW',
            amount: '40000',
            status: 'SALE',
          },
        }),
      } as Response);

    await expect(makeAdapter().confirm(
      'rescode=0000&order_id=ORD-001&transaction_id=client-value',
      40000,
      'ORD-001',
    )).rejects.toThrow();
  });

  it('partialCancel()은 저장된 confirm rawResponse의 거래 금액/잔액으로 환불 요청을 만든다', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        rescode: '0000',
        refund: { refund_transaction_id: 'EXIMBAY-REFUND-1', refund_date: '20260706120000' },
        payment: { transaction_id: 'EXIMBAY-TX-1', balance: '30000' },
      }),
    } as Response);

    const result = await makeAdapter().partialCancel({
      paymentKey: 'EXIMBAY-TX-1',
      cancelAmount: 10000,
      cancelReason: '고객 요청',
      idempotencyKey: 'refund-operation-1',
      rawResponse: {
        retrieve: {
          rescode: '0000',
          payment: {
            order_id: 'ORD-001',
            currency: 'KRW',
            amount: '40000',
            transaction_id: 'EXIMBAY-TX-1',
            balance: '40000',
          },
        },
      },
    });

    expect(result.refundId).toBe('EXIMBAY-REFUND-1');
    const request = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as Record<string, {
      refund_amount?: string;
      refund_id?: string;
    }>;
    expect(request.refund.refund_amount).toBe('10000');
    expect(request.refund.refund_id).toBe(
      `okhwadang-${crypto.createHash('sha256').update('refund-operation-1').digest('hex').slice(0, 54)}`,
    );
    expect(request.refund.refund_id).toHaveLength(64);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
