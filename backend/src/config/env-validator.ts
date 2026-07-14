import {
  CHECKOUT_GATEWAY_ENV_KEYS,
  getRequiredCheckoutContractEnvKeys,
} from './checkout-gateway-contract';

/**
 * 프로덕션 환경에서 NestJS bootstrap 전 필수 env 키 검증.
 *
 * backend/.env.example에 # REQUIRED 주석이 붙은 키 목록과 동기화할 것.
 * 누락 시 명확한 에러 메시지 출력 후 프로세스 종료.
 */

export const REQUIRED_PROD_ENV_KEYS = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_PRIVATE_KEY_PATH',
  'JWT_PUBLIC_KEY_PATH',
  'FRONTEND_URL',
  'NOTIFICATION_PROVIDER',
  'RESEND_API_KEY',
  'PAYMENT_GATEWAY',
  'STORAGE_PROVIDER',
  'KAKAO_CLIENT_ID',
  'KAKAO_CLIENT_SECRET',
  'KAKAO_REDIRECT_URI',
] as const;

export const CHECKOUT_PROD_ENV_KEYS = [
  ...CHECKOUT_GATEWAY_ENV_KEYS.naverpay.backend,
  ...CHECKOUT_GATEWAY_ENV_KEYS.paypal.backend,
  ...CHECKOUT_GATEWAY_ENV_KEYS.eximbay.backend,
  ...CHECKOUT_GATEWAY_ENV_KEYS.toss.backend,
  ...CHECKOUT_GATEWAY_ENV_KEYS.stripe.backend,
] as const;

export type RequiredEnvKey =
  (typeof REQUIRED_PROD_ENV_KEYS)[number] | (typeof CHECKOUT_PROD_ENV_KEYS)[number];

export function getRequiredCheckoutEnvKeys(env: NodeJS.ProcessEnv): RequiredEnvKey[] {
  return getRequiredCheckoutContractEnvKeys(env) as RequiredEnvKey[];
}

export interface EnvValidationError {
  key: string;
  reason: string;
}

/**
 * 주어진 env 객체(기본값: process.env)에서 필수 키를 검증한다.
 * 프로덕션 환경(NODE_ENV=production)에서만 실행.
 *
 * @returns 누락/빈 키 목록 (빈 배열이면 정상)
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): EnvValidationError[] {
  if (env.NODE_ENV !== 'production') {
    return [];
  }

  const errors: EnvValidationError[] = [];

  for (const key of [...REQUIRED_PROD_ENV_KEYS, ...getRequiredCheckoutEnvKeys(env)]) {
    const value = env[key];
    if (value === undefined || value === null || value.trim() === '') {
      errors.push({ key, reason: '값이 없거나 비어 있습니다' });
    }
  }

  if ((env.STORAGE_PROVIDER ?? '').trim().toLowerCase() === 's3') {
    const bucket = env.AWS_S3_BUCKET_NAME ?? env.AWS_S3_BUCKET;
    if (!bucket?.trim()) {
      errors.push({
        key: 'AWS_S3_BUCKET_NAME',
        reason: 'STORAGE_PROVIDER=s3 일 때 AWS_S3_BUCKET_NAME 또는 AWS_S3_BUCKET 이 필요합니다',
      });
    }
  }

  return errors;
}

/**
 * 검증 실패 시 에러 로그를 출력하고 프로세스를 종료한다.
 * main.ts에서 NestFactory.create() 전에 호출한다.
 */
export function assertEnv(env: NodeJS.ProcessEnv = process.env): void {
  const errors = validateEnv(env);
  if (errors.length === 0) {
    return;
  }

  const line = '════════════════════════════════════════════════════════════════\n';
  const write = (msg: string) => process.stderr.write(msg + '\n');

  write('');
  write(line.trimEnd());
  write('  [ENV 검증 실패] 프로덕션 필수 환경변수가 누락되었습니다.');
  write(line.trimEnd());
  for (const { key, reason } of errors) {
    write(`  ✗ ${key}: ${reason}`);
  }
  write('');
  write('  해결 방법:');
  write('    1. EC2에서 backend/.env 확인: cat /app/shop-okhwadang/shop-okhwadang/backend/.env');
  write('    2. 로컬에서 원격 동기화: bash scripts/remote-env-sync.sh push');
  write('    3. 키 목록 검증: bash scripts/remote-env-sync.sh verify');
  write(
    '    4. CHECKOUT_ENABLED_GATEWAYS와 NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS를 같은 계약으로 유지하고, 해당 결제수단 키만 채웁니다.',
  );
  write(line.trimEnd());
  write('');

  process.exit(1);
}
