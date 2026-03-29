import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { BadGatewayException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { OAuthService } from '../oauth.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { UserAuthentication, OAuthProvider } from '../../users/entities/user-authentication.entity';

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
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
};

const mockHttpService = {
  post: jest.fn(),
  get: jest.fn(),
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
    isActive: true,
    refreshToken: null,
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(UserAuthentication), useValue: mockUserAuthRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: HttpService, useValue: mockHttpService },
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
      expect(result.accessToken).toBe('mock-token');
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
});
