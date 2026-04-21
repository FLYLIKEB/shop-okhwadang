import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { User, UserRole } from '../../users/entities/user.entity';
import { AuthLoginPolicyService } from '../services/auth-login-policy.service';
import { AuthAuditService } from '../services/auth-audit.service';

const mockUserRepository = {
  update: jest.fn(),
};

const mockAuthAuditService = {
  logLoginFailure: jest.fn(),
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

describe('AuthLoginPolicyService', () => {
  let service: AuthLoginPolicyService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthLoginPolicyService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: AuthAuditService, useValue: mockAuthAuditService },
      ],
    }).compile();

    service = module.get<AuthLoginPolicyService>(AuthLoginPolicyService);
  });

  it('실패 횟수 5회 도달 시 15분 잠금 정책 적용', async () => {
    const user = makeUser({ failedLoginAttempts: 4 });

    await expect(
      service.handlePasswordMismatch(user, user.email),
    ).rejects.toThrow(ForbiddenException);

    expect(mockUserRepository.update).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        failedLoginAttempts: 5,
        lockedUntil: expect.any(Date),
      }),
    );
    expect(mockAuthAuditService.logLoginFailure).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        reason: 'account_locked_15m',
        attempts: 5,
      }),
    );
  });

  it('실패 횟수 10회 도달 시 1시간 잠금 정책 적용', async () => {
    const user = makeUser({ failedLoginAttempts: 9 });

    await expect(
      service.handlePasswordMismatch(user, user.email),
    ).rejects.toThrow(ForbiddenException);

    expect(mockUserRepository.update).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        failedLoginAttempts: 10,
        lockedUntil: expect.any(Date),
      }),
    );
    expect(mockAuthAuditService.logLoginFailure).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        reason: 'account_locked_1h',
        attempts: 10,
      }),
    );
  });

  it('실패 횟수 15회 도달 시 관리자 해제 필요 상태로 전환', async () => {
    const user = makeUser({ failedLoginAttempts: 14 });

    await expect(
      service.handlePasswordMismatch(user, user.email),
    ).rejects.toThrow(ForbiddenException);

    expect(mockUserRepository.update).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        failedLoginAttempts: 15,
        lockedUntil: null,
      }),
    );
    expect(mockAuthAuditService.logLoginFailure).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        reason: 'account_locked_manual',
        attempts: 15,
      }),
    );
  });
});

