import { redactSensitiveFields } from './redaction.util';

describe('redactSensitiveFields', () => {
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
        email: 'buyer@example.com',
        phone: '[REDACTED]',
        address: '[REDACTED]',
        name: '홍길동',
      },
      items: [
        { productName: '보이차', token: '[REDACTED]' },
      ],
      status: 'paid',
    });
  });
});
