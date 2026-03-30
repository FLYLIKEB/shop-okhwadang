import { resolvePaymentGateway } from '../payments.module';

describe('resolvePaymentGateway — 프로덕션 Mock 차단', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalGateway = process.env.PAYMENT_GATEWAY;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalGateway === undefined) {
      delete process.env.PAYMENT_GATEWAY;
    } else {
      process.env.PAYMENT_GATEWAY = originalGateway;
    }
  });

  it('NODE_ENV=production, PAYMENT_GATEWAY=mock → 시작 실패', () => {
    process.env.NODE_ENV = 'production';
    process.env.PAYMENT_GATEWAY = 'mock';

    expect(() => resolvePaymentGateway()).toThrow(
      'Mock payment gateway는 프로덕션에서 사용할 수 없습니다',
    );
  });

  it('NODE_ENV=production, PAYMENT_GATEWAY 미설정 → 시작 실패', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.PAYMENT_GATEWAY;

    expect(() => resolvePaymentGateway()).toThrow(
      'Mock payment gateway는 프로덕션에서 사용할 수 없습니다',
    );
  });

  it('NODE_ENV=development, PAYMENT_GATEWAY=mock → 정상 동작', () => {
    process.env.NODE_ENV = 'development';
    process.env.PAYMENT_GATEWAY = 'mock';

    expect(resolvePaymentGateway()).toBe('mock');
  });

  it('NODE_ENV=production, PAYMENT_GATEWAY=toss → 정상 동작', () => {
    process.env.NODE_ENV = 'production';
    process.env.PAYMENT_GATEWAY = 'toss';

    expect(resolvePaymentGateway()).toBe('toss');
  });
});
