import { createPaymentConfig } from '../../../config/payment.config';

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
});
