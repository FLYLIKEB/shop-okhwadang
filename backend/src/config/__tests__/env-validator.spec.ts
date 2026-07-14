import {
  validateEnv,
  assertEnv,
  REQUIRED_PROD_ENV_KEYS,
  getRequiredCheckoutEnvKeys,
} from '../env-validator';

const makeFullEnv = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'mysql://user:pass@host:3306/db',
  JWT_SECRET: 'secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_PRIVATE_KEY_PATH: '/app/keys/jwt-private.pem',
  JWT_PUBLIC_KEY_PATH: '/app/keys/jwt-public.pem',
  FRONTEND_URL: 'https://ockhwadang.com',
  NOTIFICATION_PROVIDER: 'resend',
  RESEND_API_KEY: 're_abc123',
  PAYMENT_GATEWAY: 'toss',
  CHECKOUT_ENABLED_GATEWAYS: 'naverpay,paypal,eximbay',
  STORAGE_PROVIDER: 's3',
  AWS_S3_BUCKET_NAME: 'okhwadang-assets',
  AWS_REGION: 'ap-northeast-2',
  KAKAO_CLIENT_ID: 'kakao-client',
  KAKAO_CLIENT_SECRET: 'kakao-secret',
  KAKAO_REDIRECT_URI: 'https://ockhwadang.com/auth/kakao/callback',
  TOSS_SECRET_KEY: 'toss-secret',
  TOSS_CLIENT_KEY: 'toss-client',
  NAVERPAY_PARTNER_ID: 'naver-partner',
  NAVERPAY_CLIENT_ID: 'naver-client',
  NAVERPAY_CLIENT_SECRET: 'naver-secret',
  NAVERPAY_CHAIN_ID: 'naver-chain',
  PAYPAL_CLIENT_ID: 'paypal-client',
  PAYPAL_CLIENT_SECRET: 'paypal-secret',
  EXIMBAY_MERCHANT_ID: 'eximbay-mid',
  EXIMBAY_API_KEY: 'eximbay-api-key',
  EXIMBAY_SECRET_KEY: 'eximbay-secret',
});

describe('validateEnv', () => {
  it('프로덕션이 아니면 항상 빈 배열 반환', () => {
    expect(validateEnv({ NODE_ENV: 'development' })).toEqual([]);
    expect(validateEnv({ NODE_ENV: 'test' })).toEqual([]);
    expect(validateEnv({})).toEqual([]);
  });

  it('필수 키가 모두 있으면 빈 배열 반환', () => {
    expect(validateEnv(makeFullEnv())).toEqual([]);
  });

  it('활성화된 프로덕션 체크아웃 provider 키 누락만 배포 전 검출', () => {
    const env = makeFullEnv();
    env.CHECKOUT_ENABLED_GATEWAYS = 'naverpay';
    delete env.PAYPAL_CLIENT_SECRET;
    delete env.NAVERPAY_CHAIN_ID;

    const errorKeys = validateEnv(env).map((e) => e.key);
    expect(errorKeys).not.toContain('PAYPAL_CLIENT_SECRET');
    expect(errorKeys).toContain('NAVERPAY_CHAIN_ID');
  });

  it('CHECKOUT_ENABLED_GATEWAYS가 없으면 기본 checkout 계약 키를 검증한다', () => {
    const env = makeFullEnv();
    delete env.CHECKOUT_ENABLED_GATEWAYS;
    delete env.NAVERPAY_CHAIN_ID;

    expect(getRequiredCheckoutEnvKeys(env)).toEqual([
      'NAVERPAY_PARTNER_ID',
      'NAVERPAY_CLIENT_ID',
      'NAVERPAY_CLIENT_SECRET',
      'NAVERPAY_CHAIN_ID',
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'EXIMBAY_MERCHANT_ID',
      'EXIMBAY_API_KEY',
      'EXIMBAY_SECRET_KEY',
      'TOSS_SECRET_KEY',
      'TOSS_CLIENT_KEY',
    ]);
    expect(validateEnv(env).map((e) => e.key)).toContain('NAVERPAY_CHAIN_ID');
  });

  it('hidden PAYMENT_GATEWAY=stripe flow adds only stripe backend keys on top of the checkout contract', () => {
    const env = makeFullEnv();
    env.PAYMENT_GATEWAY = 'stripe';
    delete env.STRIPE_SECRET_KEY;
    delete env.STRIPE_WEBHOOK_SECRET;

    expect(getRequiredCheckoutEnvKeys(env)).toContain('STRIPE_SECRET_KEY');
    expect(getRequiredCheckoutEnvKeys(env)).toContain('STRIPE_WEBHOOK_SECRET');
    expect(validateEnv(env).map((e) => e.key)).toContain('STRIPE_SECRET_KEY');
    expect(validateEnv(env).map((e) => e.key)).toContain('STRIPE_WEBHOOK_SECRET');
  });

  it('누락된 키가 있으면 해당 키 에러 반환', () => {
    const env = makeFullEnv();
    delete env.NOTIFICATION_PROVIDER;
    delete env.RESEND_API_KEY;

    const errors = validateEnv(env);
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.key)).toContain('NOTIFICATION_PROVIDER');
    expect(errors.map((e) => e.key)).toContain('RESEND_API_KEY');
  });

  it('거래 메시지 provider 미설정은 배포 사전 검증에서 차단하지 않는다', () => {
    const env = makeFullEnv();
    delete env.MESSAGE_PROVIDER;

    expect(validateEnv(env).map((e) => e.key)).not.toContain('MESSAGE_PROVIDER');
  });

  it('STORAGE_PROVIDER=s3 이면 버킷 이름이 필요하다', () => {
    const env = makeFullEnv();
    delete env.AWS_S3_BUCKET_NAME;
    delete env.AWS_S3_BUCKET;

    expect(validateEnv(env).map((e) => e.key)).toContain('AWS_S3_BUCKET_NAME');
  });

  it('STORAGE_PROVIDER=s3 에서 AWS_ACCESS_KEY_ID 없이도 IAM Role 사용을 허용한다', () => {
    const env = makeFullEnv();
    delete env.AWS_ACCESS_KEY_ID;
    delete env.AWS_SECRET_ACCESS_KEY;

    expect(validateEnv(env)).toEqual([]);
  });

  it('값이 빈 문자열이면 에러 반환', () => {
    const env = makeFullEnv();
    env.RESEND_API_KEY = '';
    env.JWT_SECRET = '   ';

    const errors = validateEnv(env);
    const errorKeys = errors.map((e) => e.key);
    expect(errorKeys).toContain('RESEND_API_KEY');
    expect(errorKeys).toContain('JWT_SECRET');
  });

  it('REQUIRED_PROD_ENV_KEYS와 활성 checkout 계약 키를 모두 검증한다', () => {
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: 'production',
      CHECKOUT_ENABLED_GATEWAYS: 'naverpay,paypal,eximbay',
    };
    const errors = validateEnv(env);
    const missing = [...REQUIRED_PROD_ENV_KEYS, ...getRequiredCheckoutEnvKeys(env)].filter(
      (k) => k !== 'NODE_ENV',
    );
    const errorKeys = errors.map((e) => e.key);

    for (const key of missing) {
      expect(errorKeys).toContain(key);
    }
  });
});

describe('assertEnv', () => {
  let exitSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((_code?: number | string | null) => {
      throw new Error(`process.exit(${_code})`);
    });
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('프로덕션이 아니면 exit 호출 안 함', () => {
    expect(() => assertEnv({ NODE_ENV: 'development' })).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('모든 키가 있으면 exit 호출 안 함', () => {
    expect(() => assertEnv(makeFullEnv())).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('누락 키가 있으면 exit(1) 호출', () => {
    const env = makeFullEnv();
    delete env.RESEND_API_KEY;

    expect(() => assertEnv(env)).toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('에러 메시지에 누락 키 이름이 포함됨', () => {
    const env = makeFullEnv();
    delete env.RESEND_API_KEY;
    delete env.NOTIFICATION_PROVIDER;

    try {
      assertEnv(env);
    } catch {
      // process.exit mock
    }

    const allOutput = stderrSpy.mock.calls.flat().join('\n');
    expect(allOutput).toContain('RESEND_API_KEY');
    expect(allOutput).toContain('NOTIFICATION_PROVIDER');
  });
});
