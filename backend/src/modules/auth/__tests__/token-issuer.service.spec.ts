import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '../../users/entities/user.entity';
import { TokenIssuerService } from '../services/token-issuer.service';

const mockUserRepository = {
  update: jest.fn(),
};

const mockJwtService = {
  sign: jest
    .fn()
    .mockReturnValueOnce('access-token')
    .mockReturnValueOnce('refresh-token'),
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

describe('TokenIssuerService', () => {
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
  });
});

