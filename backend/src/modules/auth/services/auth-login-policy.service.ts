import {
  Injectable,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AuthAuditService } from './auth-audit.service';

const LOCK_LEVEL_1_ATTEMPTS = 5;
const LOCK_LEVEL_2_ATTEMPTS = 10;
const LOCK_LEVEL_3_ATTEMPTS = 15;
const LOCKOUT_LEVEL_1_MS = 15 * 60 * 1000;
const LOCKOUT_LEVEL_2_MS = 60 * 60 * 1000;

type LockPolicy = {
  minAttempts: number;
  lockoutMs: number | null;
  reason: string;
  warnMessage: (email: string) => string;
  forbiddenMessage: (lockoutMs: number | null) => string;
};

const LOCK_POLICIES: LockPolicy[] = [
  {
    minAttempts: LOCK_LEVEL_3_ATTEMPTS,
    lockoutMs: null,
    reason: 'account_locked_manual',
    warnMessage: (email) => `Account permanently locked until admin unlock: ${email}`,
    forbiddenMessage: () => '연속 로그인 실패로 계정이 잠겼습니다. 관리자에게 잠금 해제를 요청해 주세요.',
  },
  {
    minAttempts: LOCK_LEVEL_2_ATTEMPTS,
    lockoutMs: LOCKOUT_LEVEL_2_MS,
    reason: 'account_locked_1h',
    warnMessage: (email) => `Account locked (1h) due to failed login attempts: ${email}`,
    forbiddenMessage: (lockoutMs) =>
      `연속 로그인 실패로 계정이 잠겼습니다. ${Math.ceil((lockoutMs ?? 0) / 1000)}초 후 다시 시도하세요.`,
  },
  {
    minAttempts: LOCK_LEVEL_1_ATTEMPTS,
    lockoutMs: LOCKOUT_LEVEL_1_MS,
    reason: 'account_locked_15m',
    warnMessage: (email) => `Account locked (15m) due to failed login attempts: ${email}`,
    forbiddenMessage: (lockoutMs) =>
      `연속 로그인 실패로 계정이 잠겼습니다. ${Math.ceil((lockoutMs ?? 0) / 1000)}초 후 다시 시도하세요.`,
  },
];

@Injectable()
export class AuthLoginPolicyService {
  private readonly logger = new Logger(AuthLoginPolicyService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authAuditService: AuthAuditService,
  ) {}

  assertNotLocked(user: User): void {
    if (user.failedLoginAttempts >= LOCK_LEVEL_3_ATTEMPTS) {
      throw new ForbiddenException('보안 정책에 의해 계정이 잠겼습니다. 관리자에게 잠금 해제를 요청해 주세요.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingSec = Math.ceil(remainingMs / 1000);
      throw new ForbiddenException(`계정이 잠겼습니다. ${remainingSec}초 후 다시 시도하세요.`);
    }
  }

  async handlePasswordMismatch(
    user: User,
    email: string,
    ip?: string | null,
    userAgent?: string | null,
  ): Promise<never> {
    const now = new Date();
    const attempts = user.failedLoginAttempts + 1;
    const matchedPolicy = LOCK_POLICIES.find((policy) => attempts >= policy.minAttempts);

    if (matchedPolicy) {
      const lockedUntil = matchedPolicy.lockoutMs ? new Date(Date.now() + matchedPolicy.lockoutMs) : null;
      await this.userRepository.update(user.id, {
        failedLoginAttempts: attempts,
        lastFailedLoginAt: now,
        lockedUntil,
      });
      await this.authAuditService.logLoginFailure(user, {
        email,
        reason: matchedPolicy.reason,
        attempts,
        lockedUntil: lockedUntil ?? undefined,
        ip,
        userAgent,
      });
      this.logger.warn(matchedPolicy.warnMessage(email));
      throw new ForbiddenException(matchedPolicy.forbiddenMessage(matchedPolicy.lockoutMs));
    }

    await this.userRepository.update(user.id, {
      failedLoginAttempts: attempts,
      lastFailedLoginAt: now,
    });
    const delaySec = Math.pow(2, attempts);
    await this.delay(delaySec * 1000);
    await this.authAuditService.logLoginFailure(user, {
      email,
      reason: 'invalid_password',
      attempts,
      ip,
      userAgent,
    });
    throw new UnauthorizedException('비밀번호가 올바르지 않습니다.');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

