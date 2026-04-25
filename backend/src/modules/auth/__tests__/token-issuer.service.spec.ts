import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { User, UserRole } from '../../users/entities/user.entity';
import { TokenIssuerService } from '../services/token-issuer.service';
import { AUTH_CONFIG, createAuthConfig } from '../../../config/auth.config';

const mockUserRepository = {
  update: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
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

describe('TokenIssuerService (mocked JwtService)', () => {
  let service: TokenIssuerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJwtService.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenIssuerService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: AUTH_CONFIG,
          useValue: createAuthConfig({
            NODE_ENV: 'development',
            JWT_SECRET: 'jwt-secret',
            JWT_PRIVATE_KEY: 'private-key',
            JWT_PUBLIC_KEY: 'public-key',
            FRONTEND_URL: 'https://frontend.test',
            JWT_REFRESH_SECRET: 'refresh-secret',
            JWT_REFRESH_EXPIRES_IN: '7d',
          }),
        },
      ],
    }).compile();

    service = module.get<TokenIssuerService>(TokenIssuerService);
  });

  it('access/refresh token payload에 tokenType을 각각 부여한다', () => {
    const user = makeUser();

    service.issueTokens(user);

    expect(mockJwtService.sign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenType: 'access',
        jti: expect.any(String),
      }),
    );
    expect(mockJwtService.sign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenType: 'refresh',
      }),
      expect.objectContaining({
        algorithm: 'HS256',
      }),
    );
  });

  it('access token에는 jti가 포함되고 refresh token 호출에는 별도 jti가 없다', () => {
    const user = makeUser();

    service.issueTokens(user);

    const accessPayload = mockJwtService.sign.mock.calls[0][0];
    expect(accessPayload).toHaveProperty('jti');
    expect(typeof accessPayload.jti).toBe('string');
    expect(accessPayload.jti.length).toBeGreaterThan(0);

    const refreshPayload = mockJwtService.sign.mock.calls[1][0];
    expect(refreshPayload).not.toHaveProperty('jti');
  });

  it('refresh token 발급 시 refreshSecret/refreshExpiresIn을 옵션으로 전달한다', () => {
    const user = makeUser();

    service.issueTokens(user);

    expect(mockJwtService.sign).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      expect.objectContaining({
        secret: 'refresh-secret',
        expiresIn: '7d',
        algorithm: 'HS256',
      }),
    );
  });

  it('refresh token은 해시해서 DB에 저장한다', async () => {
    const user = makeUser();

    const result = await service.issueAndPersistRefresh(user);

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(mockUserRepository.update).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        refreshToken: expect.any(String),
      }),
    );

    const updatedPayload = mockUserRepository.update.mock.calls[0][1] as { refreshToken: string };
    expect(await bcrypt.compare('refresh-token', updatedPayload.refreshToken)).toBe(true);
    // 평문 저장 금지 회귀 테스트
    expect(updatedPayload.refreshToken).not.toBe('refresh-token');
  });
});

describe('TokenIssuerService (real JwtService — sign/verify, TTL, signature)', () => {
  let service: TokenIssuerService;
  let accessJwtService: JwtService;
  let refreshJwtService: JwtService;

  const ACCESS_SECRET = 'access-secret-for-tests';
  const REFRESH_SECRET = 'refresh-secret-for-tests';
  const ACCESS_TTL = '1h';
  const REFRESH_TTL = '7d';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: ACCESS_SECRET,
          signOptions: { expiresIn: ACCESS_TTL, algorithm: 'HS256' },
        }),
      ],
      providers: [
        TokenIssuerService,
        { provide: getRepositoryToken(User), useValue: { update: jest.fn() } },
        {
          provide: AUTH_CONFIG,
          useValue: createAuthConfig({
            NODE_ENV: 'development',
            JWT_SECRET: ACCESS_SECRET,
            JWT_PRIVATE_KEY: 'private-key',
            JWT_PUBLIC_KEY: 'public-key',
            FRONTEND_URL: 'https://frontend.test',
            JWT_REFRESH_SECRET: REFRESH_SECRET,
            JWT_REFRESH_EXPIRES_IN: REFRESH_TTL,
          }),
        },
      ],
    }).compile();

    service = module.get<TokenIssuerService>(TokenIssuerService);
    accessJwtService = module.get<JwtService>(JwtService);
    // refresh verification 도구 (다른 secret 사용)
    refreshJwtService = new JwtService({});
  });

  it('access token은 JWT_SECRET으로 서명되고 sub/email/role/tokenType/jti를 포함한다', () => {
    const user = makeUser({ id: 42, email: 'real@example.com', role: UserRole.USER });

    const { accessToken } = service.issueTokens(user);

    const decoded = accessJwtService.verify<Record<string, unknown>>(accessToken, {
      secret: ACCESS_SECRET,
    });
    expect(decoded.sub).toBe(42);
    expect(decoded.email).toBe('real@example.com');
    expect(decoded.role).toBe(UserRole.USER);
    expect(decoded.tokenType).toBe('access');
    expect(typeof decoded.jti).toBe('string');
  });

  it('access token은 약 1시간(JWT_EXPIRES_IN 기본값) 후 만료되도록 exp가 설정된다', () => {
    const user = makeUser();
    const beforeIssue = Math.floor(Date.now() / 1000);

    const { accessToken } = service.issueTokens(user);

    const decoded = accessJwtService.verify<{ iat: number; exp: number }>(accessToken, {
      secret: ACCESS_SECRET,
    });
    // 1h = 3600s, 약간의 클럭 슬라이드 허용 (±5초)
    expect(decoded.exp - decoded.iat).toBe(3600);
    expect(decoded.iat).toBeGreaterThanOrEqual(beforeIssue);
    expect(decoded.exp).toBeGreaterThan(beforeIssue);
  });

  it('refresh token은 JWT_REFRESH_SECRET으로 서명되며 access secret으로는 검증 실패한다', () => {
    const user = makeUser();

    const { refreshToken } = service.issueTokens(user);

    // refresh secret으로 검증 → 성공
    const decoded = refreshJwtService.verify<Record<string, unknown>>(refreshToken, {
      secret: REFRESH_SECRET,
    });
    expect(decoded.tokenType).toBe('refresh');
    expect(decoded.sub).toBe(user.id);

    // 잘못된 secret(access secret)으로 검증 → 거부
    expect(() =>
      refreshJwtService.verify(refreshToken, { secret: ACCESS_SECRET }),
    ).toThrow();
  });

  it('refresh token은 7일 TTL을 가진다', () => {
    const user = makeUser();

    const { refreshToken } = service.issueTokens(user);

    const decoded = refreshJwtService.verify<{ iat: number; exp: number }>(refreshToken, {
      secret: REFRESH_SECRET,
    });
    // 7d = 7 * 24 * 60 * 60 = 604800s
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
  });

  it('변조된(잘못된 서명) access token은 검증을 거부한다', () => {
    const user = makeUser();

    const { accessToken } = service.issueTokens(user);

    // payload는 그대로 두고 마지막 서명 부분만 변조
    const parts = accessToken.split('.');
    expect(parts).toHaveLength(3);
    const tamperedToken = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -2)}xx`;

    expect(() =>
      accessJwtService.verify(tamperedToken, { secret: ACCESS_SECRET }),
    ).toThrow();
  });

  it('동일 사용자에게 발급된 access token들은 서로 다른 jti를 가진다 (회전/추적용)', () => {
    const user = makeUser();

    const first = service.issueTokens(user);
    const second = service.issueTokens(user);

    const firstDecoded = accessJwtService.verify<{ jti: string }>(first.accessToken, {
      secret: ACCESS_SECRET,
    });
    const secondDecoded = accessJwtService.verify<{ jti: string }>(second.accessToken, {
      secret: ACCESS_SECRET,
    });

    expect(firstDecoded.jti).not.toBe(secondDecoded.jti);
  });
});
