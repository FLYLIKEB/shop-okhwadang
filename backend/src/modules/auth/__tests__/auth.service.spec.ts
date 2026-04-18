import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { VerificationToken } from '../entities/verification-token.entity';
import { NotificationService } from '../../notification/notification.service';
import { AuditLogService } from '../../audit-logs/audit-log.service';
import { TokenBlacklistService } from '../token-blacklist.service';

const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockPasswordResetTokenRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockVerificationTokenRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ sub: 1, email: 'test@example.com', role: 'user' }),
};

const mockNotificationService = {
  sendPasswordReset: jest.fn(),
  sendEmailVerification: jest.fn(),
};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockTokenBlacklistService = {
  addToBlacklist: jest.fn(),
  isBlacklisted: jest.fn(),
  revokeAllUserTokens: jest.fn(),
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    name: '홍길동',
    phone: null,
    role: UserRole.USER,
    isActive: true,
    isEmailVerified: false,
    emailVerifiedAt: null,
    refreshToken: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let originalFrontendUrl: string | undefined;

  beforeEach(async () => {
    jest.clearAllMocks();
    originalFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://frontend.test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: mockPasswordResetTokenRepository,
        },
        {
          provide: getRepositoryToken(VerificationToken),
          useValue: mockVerificationTokenRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: TokenBlacklistService, useValue: mockTokenBlacklistService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    if (originalFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL;
      return;
    }

    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  describe('register', () => {
    it('중복 이메일로 가입 시 ConflictException', async () => {
      mockUserRepository.findOne.mockResolvedValue(makeUser());

      await expect(
        service.register({ email: 'test@example.com', password: 'Test1234!', name: '홍길동' }),
      ).rejects.toThrow(ConflictException);
    });

    it('비밀번호가 bcrypt로 해싱되어 저장됨', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const newUser = makeUser({ id: 2 });
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.register({ email: 'new@example.com', password: 'Test1234!', name: '신규' });

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          name: '신규',
          password: expect.stringMatching(/^\$2b\$/),
        }),
      );
    });

    it('가입 성공 시 accessToken, refreshToken, user 반환', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const newUser = makeUser({ id: 2, email: 'new@example.com', name: '신규' });
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockUserRepository.update.mockResolvedValue(undefined);

      const result = await service.register({ email: 'new@example.com', password: 'Test1234!', name: '신규' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('new@example.com');
    });
  });

  describe('login', () => {
    it('비밀번호 불일치 시 UnauthorizedException', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      mockUserRepository.findOne.mockResolvedValue(makeUser({ password: hashed }));

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('비활성 계정 로그인 시 ForbiddenException', async () => {
      const hashed = await bcrypt.hash('Test1234!', 10);
      mockUserRepository.findOne.mockResolvedValue(makeUser({ password: hashed, isActive: false }));

      await expect(
        service.login({ email: 'test@example.com', password: 'Test1234!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('로그인 성공 시 refreshToken을 DB에 해싱 저장', async () => {
      const hashed = await bcrypt.hash('Test1234!', 10);
      mockUserRepository.findOne.mockResolvedValue(makeUser({ password: hashed, isEmailVerified: true }));
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.login({ email: 'test@example.com', password: 'Test1234!' });

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          refreshToken: expect.stringMatching(/^\$2b\$/),
        }),
      );
    });
  });

  describe('refresh', () => {
    it('유효한 refreshToken으로 새 토큰 쌍 발급', async () => {
      const rawRefresh = 'mock-token';
      const hashedRefresh = await bcrypt.hash(rawRefresh, 10);
      mockJwtService.verify.mockReturnValueOnce({ sub: 1, email: 'test@example.com', role: 'user', tokenType: 'refresh' });
      mockUserRepository.findOne.mockResolvedValue(makeUser({ refreshToken: hashedRefresh }));
      mockUserRepository.update.mockResolvedValue(undefined);

      const result = await service.refresh(rawRefresh);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('DB의 refresh_token과 불일치 시 UnauthorizedException', async () => {
      const hashedRefresh = await bcrypt.hash('correct-token', 10);
      mockJwtService.verify.mockReturnValueOnce({ sub: 1, email: 'test@example.com', role: 'user', tokenType: 'refresh' });
      mockUserRepository.findOne.mockResolvedValue(makeUser({ refreshToken: hashedRefresh }));

      await expect(service.refresh('wrong-token')).rejects.toThrow(UnauthorizedException);
    });

    it('유효하지 않은 JWT → UnauthorizedException', async () => {
      mockJwtService.verify.mockImplementationOnce(() => { throw new Error('invalid'); });

      await expect(service.refresh('invalid.token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('존재하지 않는 이메일에도 동일한 성공 응답을 반환하고 메일을 보내지 않음', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.forgotPassword({ email: 'missing@example.com' })).resolves.toEqual({
        message: '가입된 계정이 있다면 비밀번호 재설정 링크를 이메일로 발송했습니다.',
      });

      expect(mockNotificationService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('존재하는 이메일이면 토큰을 저장하고 재설정 메일을 발송함', async () => {
      const user = makeUser({ email: 'test@example.com', name: '홍길동' });
      mockUserRepository.findOne.mockResolvedValue(user);
      mockPasswordResetTokenRepository.create.mockImplementation((value) => value);
      mockPasswordResetTokenRepository.save.mockResolvedValue(undefined);
      mockPasswordResetTokenRepository.update.mockResolvedValue({ affected: 1 });
      mockNotificationService.sendPasswordReset.mockResolvedValue(undefined);

      await service.forgotPassword({ email: 'test@example.com' });

      expect(mockPasswordResetTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          usedAt: null,
        }),
      );
      expect(mockNotificationService.sendPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          recipientName: '홍길동',
          resetUrl: expect.stringContaining('/reset-password?token='),
          expiresInMinutes: 60,
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('이미 사용된 토큰 재사용 시 BadRequestException', async () => {
      mockPasswordResetTokenRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 1,
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.resetPassword({ token: 'used-token', newPassword: 'NewPass123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('유효한 토큰이면 새 비밀번호를 저장하고 토큰을 사용 처리함', async () => {
      mockPasswordResetTokenRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 1,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      mockPasswordResetTokenRepository.update
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 0 });
      mockUserRepository.update.mockResolvedValue(undefined);

      await expect(
        service.resetPassword({ token: 'valid-token', newPassword: 'NewPass123!' }),
      ).resolves.toEqual({ message: '비밀번호가 재설정되었습니다.' });

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          password: expect.stringMatching(/^\$2[aby]\$/),
          refreshToken: null,
        }),
      );
    });
  });

  describe('logout', () => {
    it('logout: blacklists the access token jti then clears refreshToken', async () => {
      const jti = 'test-jti-1234';
      const expiresAt = new Date(Date.now() + 3600_000);
      mockTokenBlacklistService.addToBlacklist.mockResolvedValue(undefined);
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.logout(1, jti, expiresAt);

      expect(mockTokenBlacklistService.addToBlacklist).toHaveBeenCalledWith(
        jti,
        1,
        expiresAt,
        'user_logout',
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, { refreshToken: null });
    });
  });

  describe('logoutAll', () => {
    it('revokes all user tokens and clears refreshToken', async () => {
      mockTokenBlacklistService.revokeAllUserTokens.mockResolvedValue(undefined);
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.logoutAll(1);

      expect(mockTokenBlacklistService.revokeAllUserTokens).toHaveBeenCalledWith(
        1,
        'user_logout_all',
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, { refreshToken: null });
    });
  });

  describe('onModuleInit (JWT_REFRESH_SECRET warning)', () => {
    it('JWT_REFRESH_SECRET 미설정 시 시작 경고 로그 출력', () => {
      const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      const warnSpy = jest.spyOn(service['logger'], 'warn');

      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT_REFRESH_SECRET is not set'),
      );

      process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
    });

    it('JWT_REFRESH_SECRET 설정 시 경고 로그 미출력', () => {
      process.env.JWT_REFRESH_SECRET = 'separate-refresh-secret';

      const warnSpy = jest.spyOn(service['logger'], 'warn');

      service.onModuleInit();

      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('JWT_REFRESH_SECRET is not set'),
      );

      delete process.env.JWT_REFRESH_SECRET;
    });
  });

  describe('register (이메일 인증)', () => {
    it('가입 시 인증 이메일 발송', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const newUser = makeUser({ id: 2, email: 'new@example.com', name: '신규', isEmailVerified: false });
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockUserRepository.update.mockResolvedValue(undefined);
      mockVerificationTokenRepository.create.mockImplementation((value) => value);
      mockVerificationTokenRepository.save.mockResolvedValue(undefined);
      mockNotificationService.sendEmailVerification.mockResolvedValue(undefined);

      await service.register({ email: 'new@example.com', password: 'Test1234!', name: '신규' });

      expect(mockVerificationTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 2,
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          usedAt: null,
        }),
      );
      expect(mockNotificationService.sendEmailVerification).toHaveBeenCalledWith(
        'new@example.com',
        expect.objectContaining({
          recipientName: '신규',
          verificationUrl: expect.stringContaining('/verify-email?token='),
          expiresInMinutes: 15,
        }),
      );
    });

    it('가입 시 isEmailVerified: false로 저장됨', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const newUser = makeUser({ id: 2, email: 'new@example.com', name: '신규', isEmailVerified: false });
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockUserRepository.update.mockResolvedValue(undefined);
      mockVerificationTokenRepository.create.mockImplementation((value) => value);
      mockVerificationTokenRepository.save.mockResolvedValue(undefined);
      mockNotificationService.sendEmailVerification.mockResolvedValue(undefined);

      await service.register({ email: 'new@example.com', password: 'Test1234!', name: '신규' });

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          name: '신규',
          isEmailVerified: false,
        }),
      );
    });
  });

  describe('login (이메일 인증 체크)', () => {
    it('이메일 미인증 계정 로그인 시 ForbiddenException', async () => {
      const hashed = await bcrypt.hash('Test1234!', 10);
      mockUserRepository.findOne.mockResolvedValue(
        makeUser({ password: hashed, isEmailVerified: false }),
      );

      await expect(
        service.login({ email: 'test@example.com', password: 'Test1234!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('이메일 인증된 계정은 정상 로그인 가능', async () => {
      const hashed = await bcrypt.hash('Test1234!', 10);
      mockUserRepository.findOne.mockResolvedValue(
        makeUser({ password: hashed, isEmailVerified: true }),
      );
      mockUserRepository.update.mockResolvedValue(undefined);

      const result = await service.login({ email: 'test@example.com', password: 'Test1234!' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('verifyEmail', () => {
    it('유효한 토큰으로 이메일 인증 성공', async () => {
      mockVerificationTokenRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 1,
        tokenHash: 'validhash',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      mockVerificationTokenRepository.update.mockResolvedValue({ affected: 1 });
      mockUserRepository.update.mockResolvedValue(undefined);

      const result = await service.verifyEmail({ token: 'valid-token' });

      expect(result).toEqual({ message: '이메일이 인증되었습니다.' });
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          isEmailVerified: true,
          emailVerifiedAt: expect.any(Date),
        }),
      );
    });

    it('이미 사용된 토큰 재사용 시 BadRequestException', async () => {
      mockVerificationTokenRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 1,
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.verifyEmail({ token: 'used-token' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('만료된 토큰 사용 시 BadRequestException', async () => {
      mockVerificationTokenRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 1,
        usedAt: null,
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(
        service.verifyEmail({ token: 'expired-token' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('유효하지 않은 토큰 시 BadRequestException', async () => {
      mockVerificationTokenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ token: 'invalid-token' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerification', () => {
    it('존재하지 않는 이메일에도 동일한 성공 응답 반환', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.resendVerification({ email: 'missing@example.com' })).resolves.toEqual({
        message: '인증 이메일이 발송되었습니다. 링크를 확인해 주세요.',
      });

      expect(mockNotificationService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('이미 인증된 이메일 요청 시 이미 인증됨 응답', async () => {
      mockUserRepository.findOne.mockResolvedValue(
        makeUser({ email: 'verified@example.com', isEmailVerified: true }),
      );

      await expect(service.resendVerification({ email: 'verified@example.com' })).resolves.toEqual({
        message: '이미 인증된 이메일입니다.',
      });

      expect(mockNotificationService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('미인증 이메일 요청 시 인증 이메일 재발송', async () => {
      const user = makeUser({ email: 'unverified@example.com', isEmailVerified: false });
      mockUserRepository.findOne.mockResolvedValue(user);
      mockVerificationTokenRepository.update.mockResolvedValue({ affected: 1 });
      mockVerificationTokenRepository.create.mockImplementation((value) => value);
      mockVerificationTokenRepository.save.mockResolvedValue(undefined);
      mockNotificationService.sendEmailVerification.mockResolvedValue(undefined);

      await expect(service.resendVerification({ email: 'unverified@example.com' })).resolves.toEqual({
        message: '인증 이메일이 발송되었습니다. 링크를 확인해 주세요.',
      });

      expect(mockNotificationService.sendEmailVerification).toHaveBeenCalledWith(
        'unverified@example.com',
        expect.objectContaining({
          recipientName: '홍길동',
          verificationUrl: expect.stringContaining('/verify-email?token='),
          expiresInMinutes: 15,
        }),
      );
    });
  });
});
