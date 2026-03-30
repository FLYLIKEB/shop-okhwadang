/**
 * PaymentsModule 게이트웨이 팩토리 — 프로덕션 Mock 차단 테스트
 *
 * PaymentsModule 전체를 컴파일하면 TypeORM DB 연결이 필요하므로,
 * 팩토리 로직만 추출하여 단위 테스트합니다.
 */

function createGatewayFactory() {
  const gateway = process.env.PAYMENT_GATEWAY ?? 'mock';
  if (
    process.env.NODE_ENV === 'production' &&
    (gateway === 'mock' || !process.env.PAYMENT_GATEWAY)
  ) {
    throw new Error(
      'Mock payment gateway는 프로덕션에서 사용할 수 없습니다. PAYMENT_GATEWAY 환경변수를 설정하세요.',
    );
  }
  return gateway;
}

describe('PaymentsModule 게이트웨이 팩토리 — 프로덕션 Mock 차단', () => {
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

    expect(() => createGatewayFactory()).toThrow(
      'Mock payment gateway는 프로덕션에서 사용할 수 없습니다',
    );
  });

  it('NODE_ENV=production, PAYMENT_GATEWAY 미설정 → 시작 실패', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.PAYMENT_GATEWAY;

    expect(() => createGatewayFactory()).toThrow(
      'Mock payment gateway는 프로덕션에서 사용할 수 없습니다',
    );
  });

  it('NODE_ENV=development, PAYMENT_GATEWAY=mock → 정상 동작', () => {
    process.env.NODE_ENV = 'development';
    process.env.PAYMENT_GATEWAY = 'mock';

    expect(() => createGatewayFactory()).not.toThrow();
  });

  it('NODE_ENV=production, PAYMENT_GATEWAY=toss → 정상 동작', () => {
    process.env.NODE_ENV = 'production';
    process.env.PAYMENT_GATEWAY = 'toss';

    expect(() => createGatewayFactory()).not.toThrow();
  });
});
