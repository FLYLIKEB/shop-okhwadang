import { createPaymentConfig } from '../payment.config';

describe('createPaymentConfig', () => {
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
