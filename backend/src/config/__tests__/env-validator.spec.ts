import { validateEnv, assertEnv, REQUIRED_PROD_ENV_KEYS } from '../env-validator';

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
  STORAGE_PROVIDER: 's3',
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

  it('누락된 키가 있으면 해당 키 에러 반환', () => {
    const env = makeFullEnv();
    delete env.NOTIFICATION_PROVIDER;
    delete env.RESEND_API_KEY;

    const errors = validateEnv(env);
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.key)).toContain('NOTIFICATION_PROVIDER');
    expect(errors.map((e) => e.key)).toContain('RESEND_API_KEY');
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

  it('REQUIRED_PROD_ENV_KEYS에 있는 모든 키를 검증', () => {
    const env: NodeJS.ProcessEnv = { NODE_ENV: 'production' };
    const errors = validateEnv(env);
    // NODE_ENV는 있으므로 나머지 키들이 모두 에러로 나와야 함
    const missing = REQUIRED_PROD_ENV_KEYS.filter((k) => k !== 'NODE_ENV');
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
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((_code?: number | string | null) => {
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
