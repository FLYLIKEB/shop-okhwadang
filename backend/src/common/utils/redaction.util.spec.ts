import { redactSensitiveFields } from './redaction.util';

describe('redactSensitiveFields', () => {
  it.each(['paymentKey', 'payment_key', 'PAYMENT_KEY', 'payment-key'])('masks %s recursively without removing tracing ids', (field) => {
    const input = {
      [field]: 'FAKE-PAYMENT-KEY-AUDIT-ONLY',
      nested: [{ [field]: 'FAKE-NESTED-KEY' }],
      orderId: 'ORD-1',
      transactionId: 'TX-1',
    };

    expect(redactSensitiveFields(input)).toEqual({
      [field]: '[REDACTED]',
      nested: [{ [field]: '[REDACTED]' }],
      orderId: 'ORD-1',
      transactionId: 'TX-1',
    });
    expect(input[field]).toBe('FAKE-PAYMENT-KEY-AUDIT-ONLY');
  });

  it('masks credentials, tokens, API keys, payment raw values, and excessive PII before storage', () => {
    const result = redactSensitiveFields({
      password: 'plain-password',
      refreshToken: 'refresh-token',
      apiKey: 'sk_live_secret',
      payment: {
        rawResponse: { cardNumber: '4111111111111111', cvv: '123' },
        approvalNumber: 'A-123',
      },
      customer: {
        email: 'buyer@example.com',
        phone: '010-1234-5678',
        address: '서울시 중구',
        name: '홍길동',
      },
      items: [
        { productName: '보이차', token: 'nested-token' },
      ],
      status: 'paid',
    });

    expect(result).toEqual({
      password: '[REDACTED]',
      refreshToken: '[REDACTED]',
      apiKey: '[REDACTED]',
      payment: {
        rawResponse: '[REDACTED]',
        approvalNumber: 'A-123',
      },
      customer: {
        email: '[REDACTED]',
        phone: '[REDACTED]',
        address: '[REDACTED]',
        name: '[REDACTED]',
      },
      items: [
        { productName: '보이차', token: '[REDACTED]' },
      ],
      status: 'paid',
    });
  });
});
