import { Test, TestingModule } from '@nestjs/testing';
import { User, UserRole } from '../../users/entities/user.entity';
import { AuthAuditService } from '../services/auth-audit.service';
import { AuditLogService } from '../../audit-logs/audit-log.service';
import { AuditAction } from '../../audit-logs/entities/audit-log.entity';

const mockAuditLogService = {
  log: jest.fn(),
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'test@example.com',
    password: 'hashed-password',
    name: '홍길동',
    phone: null,
    role: UserRole.USER,
    tier: 'Bronze',
    tierAccumulatedAmount: 0,
    tierEvaluatedAt: null,
    isActive: true,
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
    refreshToken: null,
    failedLoginAttempts: 0,
    lastFailedLoginAt: null,
    lockedUntil: null,
    deletionRequestedAt: null,
    deletionScheduledAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthAuditService', () => {
  let service: AuthAuditService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthAuditService,
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<AuthAuditService>(AuthAuditService);
  });

  describe('logUserNotFound', () => {
    it('user_not_found 사유로 LOGIN_FAILURE 감사 로그를 기록한다', async () => {
      await service.logUserNotFound('missing@example.com', '203.0.113.5', 'Mozilla/5.0');

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        actorId: 0,
        actorRole: 'anonymous',
        action: AuditAction.LOGIN_FAILURE,
        resourceType: 'auth',
        beforeJson: { email: 'missing@example.com' },
        afterJson: { reason: 'user_not_found' },
        ip: '203.0.113.5',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('ip/userAgent가 undefined여도 null로 정규화하여 기록한다', async () => {
      await service.logUserNotFound('missing@example.com');

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: null,
          userAgent: null,
        }),
      );
    });
  });

  describe('logLoginFailure', () => {
    it('실패 사유와 시도 횟수를 afterJson에 포함하여 기록한다', async () => {
      const user = makeUser({ id: 42, role: UserRole.USER });

      await service.logLoginFailure(user, {
        email: 'test@example.com',
        reason: 'invalid_password',
        attempts: 3,
        ip: '198.51.100.1',
        userAgent: 'curl/8.0',
      });

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        actorId: 42,
        actorRole: UserRole.USER,
        action: AuditAction.LOGIN_FAILURE,
        resourceType: 'auth',
        beforeJson: { email: 'test@example.com' },
        afterJson: { reason: 'invalid_password', attempts: 3 },
        ip: '198.51.100.1',
        userAgent: 'curl/8.0',
      });
    });

    it('lockedUntil이 주어지면 ISO 문자열로 직렬화하여 기록한다 (브루트포스 임계값)', async () => {
      const user = makeUser();
      const lockedUntil = new Date('2030-01-01T00:00:00.000Z');

      await service.logLoginFailure(user, {
        email: user.email,
        reason: 'account_locked_15m',
        attempts: 5,
        lockedUntil,
        ip: null,
        userAgent: null,
      });

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          afterJson: {
            reason: 'account_locked_15m',
            attempts: 5,
            lockedUntil: lockedUntil.toISOString(),
          },
        }),
      );
    });

    it('attempts와 lockedUntil이 없으면 afterJson에서 누락한다', async () => {
      const user = makeUser();

      await service.logLoginFailure(user, {
        email: user.email,
        reason: 'invalid_password',
      });

      const callArg = mockAuditLogService.log.mock.calls[0][0];
      expect(callArg.afterJson).toEqual({ reason: 'invalid_password' });
      expect(callArg.afterJson).not.toHaveProperty('attempts');
      expect(callArg.afterJson).not.toHaveProperty('lockedUntil');
    });

    it('관리자 계정의 실패도 actorRole=admin으로 기록한다', async () => {
      const adminUser = makeUser({ id: 99, role: UserRole.ADMIN });

      await service.logLoginFailure(adminUser, {
        email: adminUser.email,
        reason: 'invalid_password',
        attempts: 1,
      });

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 99,
          actorRole: UserRole.ADMIN,
        }),
      );
    });
  });

  describe('logLoginSuccess', () => {
    it('성공 시 LOGIN_SUCCESS 액션과 userId를 afterJson에 기록한다', async () => {
      const user = makeUser({ id: 7, role: UserRole.USER });

      await service.logLoginSuccess(user, 'test@example.com', '192.0.2.10', 'Chrome/120');

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        actorId: 7,
        actorRole: UserRole.USER,
        action: AuditAction.LOGIN_SUCCESS,
        resourceType: 'auth',
        beforeJson: { email: 'test@example.com' },
        afterJson: { userId: 7 },
        ip: '192.0.2.10',
        userAgent: 'Chrome/120',
      });
    });

    it('ip/userAgent 미제공 시 null로 정규화하여 기록한다', async () => {
      const user = makeUser({ id: 7 });

      await service.logLoginSuccess(user, user.email);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.LOGIN_SUCCESS,
          ip: null,
          userAgent: null,
        }),
      );
    });
  });
});
