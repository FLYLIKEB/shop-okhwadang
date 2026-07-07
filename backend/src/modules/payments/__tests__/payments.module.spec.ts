import { createPaymentConfig } from '../../../config/payment.config';
import { getAvailableGatewaysByLocale, resolveGatewayByLocale } from '../payments.module';

describe('createPaymentConfig — 프로덕션 Mock 차단', () => {
  it('NODE_ENV=production, PAYMENT_GATEWAY=mock → 시작 실패', () => {
    expect(() =>
      createPaymentConfig({
        NODE_ENV: 'production',
        PAYMENT_GATEWAY: 'mock',
      }),
    ).toThrow(
      'Mock payment gateway는 프로덕션에서 사용할 수 없습니다',
    );
  });

  it('NODE_ENV=production, PAYMENT_GATEWAY 미설정 → 시작 실패', () => {
    expect(() =>
      createPaymentConfig({
        NODE_ENV: 'production',
      }),
    ).toThrow(
      'Mock payment gateway는 프로덕션에서 사용할 수 없습니다',
    );
  });

  it('NODE_ENV=development, PAYMENT_GATEWAY=mock → 정상 동작', () => {
    const config = createPaymentConfig({
      NODE_ENV: 'development',
      PAYMENT_GATEWAY: 'mock',
    });
    expect(config.gateway).toBe('mock');
  });

  it('NODE_ENV=production, PAYMENT_GATEWAY=toss → 정상 동작', () => {
    const config = createPaymentConfig({
      NODE_ENV: 'production',
      PAYMENT_GATEWAY: 'toss',
    });
    expect(config.gateway).toBe('toss');
  });

  it('PAYMENT_GATEWAY=paypal → PayPal 설정을 읽는다', () => {
    const config = createPaymentConfig({
      NODE_ENV: 'development',
      PAYMENT_GATEWAY: 'paypal',
      PAYPAL_CLIENT_ID: 'paypal-client',
      PAYPAL_CLIENT_SECRET: 'paypal-secret',
      PAYPAL_WEBHOOK_ID: 'paypal-webhook',
    });

    expect(config.gateway).toBe('paypal');
    expect(config.paypal).toMatchObject({
      clientId: 'paypal-client',
      clientSecret: 'paypal-secret',
      webhookId: 'paypal-webhook',
      apiBaseUrl: 'https://api-m.sandbox.paypal.com',
    });
  });

  it('PAYMENT_GATEWAY=eximbay → Eximbay 설정을 읽는다', () => {
    const config = createPaymentConfig({
      NODE_ENV: 'development',
      PAYMENT_GATEWAY: 'eximbay',
      EXIMBAY_MERCHANT_ID: 'eximbay-mid',
      EXIMBAY_API_KEY: 'eximbay-api-key',
      EXIMBAY_SECRET_KEY: 'eximbay-secret',
    });

    expect(config.gateway).toBe('eximbay');
    expect(config.eximbay).toMatchObject({
      merchantId: 'eximbay-mid',
      apiKey: 'eximbay-api-key',
      secretKey: 'eximbay-secret',
      apiBaseUrl: 'https://api-test.eximbay.com',
      jsSdkUrl: 'https://api-test.eximbay.com/v1/javascriptSDK.js',
    });
  });
});

describe('locale gateway policy — express payments first and country-specific visibility', () => {
  it('ko → naverpay default, bank transfer, paypal, eximbay card fallback', () => {
    expect(resolveGatewayByLocale('ko')).toBe('naverpay');
    expect(getAvailableGatewaysByLocale('ko')).toEqual(['naverpay', 'bank_transfer', 'paypal', 'eximbay']);
  });


  it('ko keeps bank transfer even when external gateways are configured by env', () => {
    const previous = process.env.CHECKOUT_ENABLED_GATEWAYS;
    process.env.CHECKOUT_ENABLED_GATEWAYS = 'naverpay,paypal,eximbay';

    try {
      expect(getAvailableGatewaysByLocale('ko')).toEqual(['naverpay', 'bank_transfer', 'paypal', 'eximbay']);
      expect(getAvailableGatewaysByLocale('en')).toEqual(['paypal', 'eximbay']);
    } finally {
      if (previous === undefined) {
        delete process.env.CHECKOUT_ENABLED_GATEWAYS;
      } else {
        process.env.CHECKOUT_ENABLED_GATEWAYS = previous;
      }
    }
  });

  it('en and other locales → paypal default, eximbay card, no naverpay', () => {
    expect(resolveGatewayByLocale('en')).toBe('paypal');
    expect(resolveGatewayByLocale('ja')).toBe('paypal');
    expect(getAvailableGatewaysByLocale('en')).toEqual(['paypal', 'eximbay']);
  });
});
