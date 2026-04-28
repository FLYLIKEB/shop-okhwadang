import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { OAuthService } from '../oauth.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { UserAuthentication, OAuthProvider } from '../../users/entities/user-authentication.entity';
import { TokenIssuerService } from '../services/token-issuer.service';
import { AUTH_CONFIG, createAuthConfig } from '../../../config/auth.config';

const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
};

const mockUserAuthRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  delete: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

const mockHttpService = {
  post: jest.fn(),
  get: jest.fn(),
};

const mockTokenIssuerService = {
  issueAndPersistRefresh: jest.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }),
};

function makeAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as InternalAxiosRequestConfig,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'test@example.com',
    password: null,
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

function makeUserAuth(overrides: Partial<UserAuthentication> = {}): UserAuthentication {
  return {
    id: 1,
    user: makeUser(),
    userId: 1,
    provider: OAuthProvider.KAKAO,
    providerId: '12345',
    accessToken: 'old-token',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('OAuthService', () => {
  let service: OAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // transaction mock: execute the callback with a manager that delegates getRepository to existing mocks
    mockDataSource.transaction.mockImplementation(async (cb: (manager: { getRepository: (entity: unknown) => unknown }) => Promise<void>) => {
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === User) return mockUserRepository;
          if (entity === UserAuthentication) return mockUserAuthRepository;
          return {};
        },
      };
      return cb(manager);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(UserAuthentication), useValue: mockUserAuthRepository },
        { provide: TokenIssuerService, useValue: mockTokenIssuerService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: AUTH_CONFIG,
          useValue: createAuthConfig({
            NODE_ENV: 'development',
            JWT_SECRET: 'jwt-secret',
            JWT_PRIVATE_KEY: 'private-key',
            JWT_PUBLIC_KEY: 'public-key',
            FRONTEND_URL: 'https://frontend.test',
            KAKAO_CLIENT_ID: 'kakao-client-id',
            KAKAO_CLIENT_SECRET: 'kakao-secret',
            KAKAO_REDIRECT_URI: 'https://frontend.test/auth/kakao/callback',
            GOOGLE_CLIENT_ID: 'google-client-id',
            GOOGLE_CLIENT_SECRET: 'google-secret',
            GOOGLE_REDIRECT_URI: 'https://frontend.test/auth/google/callback',
          }),
        },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
  });

  describe('handleKakao', () => {
    it('카카오 신규 가입 시 isNewUser: true', async () => {
      mockHttpService.post.mockReturnValue(
        of(makeAxiosResponse({ access_token: 'kakao-access-token' })),
      );
      mockHttpService.get.mockReturnValue(
        of(makeAxiosResponse({
          id: 12345,
          kakao_account: { email: 'new@kakao.com', profile: { nickname: '카카오유저' } },
        })),
      );
      mockUserAuthRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(null);
      const newUser = makeUser({ id: 2, email: 'new@kakao.com', name: '카카오유저' });
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockUserAuthRepository.create.mockReturnValue(makeUserAuth({ user: newUser, userId: 2 }));
      mockUserAuthRepository.save.mockResolvedValue({});

      const result = await service.handleKakao('auth-code');

      expect(result.isNewUser).toBe(true);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.email).toBe('new@kakao.com');
    });

    it('카카오 기존 사용자 시 isNewUser: false', async () => {
      mockHttpService.post.mockReturnValue(
        of(makeAxiosResponse({ access_token: 'kakao-access-token' })),
      );
      mockHttpService.get.mockReturnValue(
        of(makeAxiosResponse({
          id: 12345,
          kakao_account: { email: 'existing@kakao.com', profile: { nickname: '기존유저' } },
        })),
      );
      const existingUser = makeUser({ id: 1, email: 'existing@kakao.com', name: '기존유저' });
      mockUserAuthRepository.findOne.mockResolvedValue(
        makeUserAuth({ user: existingUser, userId: 1 }),
      );
      mockUserAuthRepository.save.mockResolvedValue({});

      const result = await service.handleKakao('auth-code');

      expect(result.isNewUser).toBe(false);
      expect(result.user.email).toBe('existing@kakao.com');
    });

    it('카카오 provider API 오류 시 BadGatewayException', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('network error')));

      await expect(service.handleKakao('bad-code')).rejects.toThrow(BadGatewayException);
    });
  });

  describe('handleGoogle', () => {
    it('구글 신규 가입 시 isNewUser: true', async () => {
      mockHttpService.post.mockReturnValue(
        of(makeAxiosResponse({ access_token: 'google-access-token' })),
      );
      mockHttpService.get.mockReturnValue(
        of(makeAxiosResponse({
          sub: 'google-sub-id',
          email: 'new@google.com',
          name: '구글유저',
        })),
      );
      mockUserAuthRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(null);
      const newUser = makeUser({ id: 3, email: 'new@google.com', name: '구글유저' });
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockUserAuthRepository.create.mockReturnValue(makeUserAuth({
        user: newUser,
        userId: 3,
        provider: OAuthProvider.GOOGLE,
        providerId: 'google-sub-id',
      }));
      mockUserAuthRepository.save.mockResolvedValue({});

      const result = await service.handleGoogle('google-code');

      expect(result.isNewUser).toBe(true);
      expect(result.user.email).toBe('new@google.com');
    });

    it('동일 이메일 다른 provider 시 기존 계정에 연동', async () => {
      mockHttpService.post.mockReturnValue(
        of(makeAxiosResponse({ access_token: 'google-access-token' })),
      );
      mockHttpService.get.mockReturnValue(
        of(makeAxiosResponse({
          sub: 'google-sub-id',
          email: 'same@email.com',
          name: '동일유저',
        })),
      );
      // No existing google auth record
      mockUserAuthRepository.findOne.mockResolvedValue(null);
      // But user exists with same email (e.g. registered via kakao before)
      const existingUser = makeUser({ id: 5, email: 'same@email.com', name: '동일유저' });
      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserAuthRepository.create.mockReturnValue(makeUserAuth({
        user: existingUser,
        userId: 5,
        provider: OAuthProvider.GOOGLE,
        providerId: 'google-sub-id',
      }));
      mockUserAuthRepository.save.mockResolvedValue({});

      const result = await service.handleGoogle('google-code');

      // Not a new user — linked to existing account
      expect(result.isNewUser).toBe(false);
      expect(result.user.email).toBe('same@email.com');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('로컬 비밀번호 있음 + OAuth 2개 → 1개 해제 성공', async () => {
      const user = makeUser({ id: 1, password: 'hashed-pw' });
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserAuthRepository.findOne.mockResolvedValue(makeUserAuth({ userId: 1, provider: OAuthProvider.KAKAO }));
      mockUserAuthRepository.count.mockResolvedValue(2);
      mockUserAuthRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.disconnect(1, OAuthProvider.KAKAO)).resolves.toBeUndefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(mockUserAuthRepository.delete).toHaveBeenCalledWith({ userId: 1, provider: OAuthProvider.KAKAO });
    });

    it('로컬 비밀번호 없음 + OAuth 2개 → 1개 해제 성공 (남은 1개)', async () => {
      const user = makeUser({ id: 1, password: null });
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserAuthRepository.findOne.mockResolvedValue(makeUserAuth({ userId: 1, provider: OAuthProvider.KAKAO }));
      mockUserAuthRepository.count.mockResolvedValue(2);
      mockUserAuthRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.disconnect(1, OAuthProvider.KAKAO)).resolves.toBeUndefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockUserAuthRepository.delete).toHaveBeenCalledWith({ userId: 1, provider: OAuthProvider.KAKAO });
    });

    it('로컬 비밀번호 없음 + OAuth 1개 → 해제 거부 (400)', async () => {
      const user = makeUser({ id: 1, password: null });
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserAuthRepository.findOne.mockResolvedValue(makeUserAuth({ userId: 1, provider: OAuthProvider.KAKAO }));
      mockUserAuthRepository.count.mockResolvedValue(1);

      await expect(service.disconnect(1, OAuthProvider.KAKAO)).rejects.toThrow(BadRequestException);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockUserAuthRepository.delete).not.toHaveBeenCalled();
    });

    it('로컬 비밀번호 있음 + OAuth 1개 → 해제 성공 (로컬 로그인 가능)', async () => {
      const user = makeUser({ id: 1, password: 'hashed-pw' });
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserAuthRepository.findOne.mockResolvedValue(makeUserAuth({ userId: 1, provider: OAuthProvider.KAKAO }));
      mockUserAuthRepository.count.mockResolvedValue(1);
      mockUserAuthRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.disconnect(1, OAuthProvider.KAKAO)).resolves.toBeUndefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockUserAuthRepository.delete).toHaveBeenCalledWith({ userId: 1, provider: OAuthProvider.KAKAO });
    });

    it('존재하지 않는 provider → 404 NotFoundException', async () => {
      const user = makeUser({ id: 1, password: 'hashed-pw' });
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserAuthRepository.findOne.mockResolvedValue(null);

      await expect(service.disconnect(1, OAuthProvider.GOOGLE)).rejects.toThrow(NotFoundException);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockUserAuthRepository.delete).not.toHaveBeenCalled();
    });

    it('사용자가 존재하지 않으면 404 NotFoundException', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.disconnect(99, OAuthProvider.KAKAO)).rejects.toThrow(NotFoundException);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockUserAuthRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('token issuing integration', () => {
    it('OAuth 로그인 시 TokenIssuerService를 통해 토큰 발급', async () => {
      mockHttpService.post.mockReturnValue(
        of(makeAxiosResponse({ access_token: 'kakao-access-token' })),
      );
      mockHttpService.get.mockReturnValue(
        of(makeAxiosResponse({
          id: 12345,
          kakao_account: { email: 'existing@kakao.com', profile: { nickname: '기존유저' } },
        })),
      );
      const existingUser = makeUser({ id: 1, email: 'existing@kakao.com', name: '기존유저' });
      mockUserAuthRepository.findOne.mockResolvedValue(
        makeUserAuth({ user: existingUser, userId: 1 }),
      );

      await service.handleKakao('auth-code');

      expect(mockTokenIssuerService.issueAndPersistRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          email: 'existing@kakao.com',
        }),
      );
    });
  });
});
