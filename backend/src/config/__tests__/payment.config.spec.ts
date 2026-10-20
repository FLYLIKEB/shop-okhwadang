import { createPaymentConfig } from '../payment.config';

describe('createPaymentConfig', () => {
  it('서버 Stripe 공개 키를 레거시 별칭보다 우선한다', () => {
    expect(createPaymentConfig({
      STRIPE_PUBLISHABLE_KEY: 'pk_test_server',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_browser',
    }).stripe.publishableKey).toBe('pk_test_server');
  });

  it.each([undefined, '', '   '])('새 서버 키가 %p이면 기존 서버 공개 키 별칭을 사용한다', (serverKey) => {
    expect(createPaymentConfig({
      STRIPE_PUBLISHABLE_KEY: serverKey,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_legacy',
    }).stripe.publishableKey).toBe('pk_test_legacy');
  });

  it('두 공개 키 설정이 모두 비어 있으면 빈 값을 반환한다', () => {
    expect(createPaymentConfig({
      STRIPE_PUBLISHABLE_KEY: ' ',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ' ',
    }).stripe.publishableKey).toBe('');
  });

  it('production에서 mock 게이트웨이를 차단한다', () => {
    expect(() =>
      createPaymentConfig({
        NODE_ENV: 'production',
        PAYMENT_GATEWAY: 'mock',
      }),
    ).toThrow('Mock payment gateway는 프로덕션에서 사용할 수 없습니다');
  });

  it('production에서 PAYMENT_GATEWAY 누락 시 차단한다', () => {
    expect(() =>
      createPaymentConfig({
        NODE_ENV: 'production',
      }),
    ).toThrow('Mock payment gateway는 프로덕션에서 사용할 수 없습니다');
  });

  it('development에서는 기본 mock 게이트웨이를 허용한다', () => {
    const config = createPaymentConfig({
      NODE_ENV: 'development',
      JWT_SECRET: 'secret',
    });

    expect(config.gateway).toBe('mock');
  });

  it('알 수 없는 결제 게이트웨이는 에러를 던진다', () => {
    expect(() =>
      createPaymentConfig({
        NODE_ENV: 'development',
        PAYMENT_GATEWAY: 'legacy',
      }),
    ).toThrow('Unknown PAYMENT_GATEWAY: legacy');
  });
});

it('PayPal KRW→USD 환율은 env 값 또는 기본값을 사용한다', () => {
  expect(createPaymentConfig({ NODE_ENV: 'development' }).paypal.krwPerUsd).toBe(1350);
  expect(createPaymentConfig({ NODE_ENV: 'development', PAYPAL_KRW_PER_USD: '1400' }).paypal.krwPerUsd).toBe(1400);
  expect(createPaymentConfig({ NODE_ENV: 'development', PAYPAL_KRW_PER_USD: '0' }).paypal.krwPerUsd).toBe(1350);
});
