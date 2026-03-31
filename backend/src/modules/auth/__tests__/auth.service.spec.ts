import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { User, UserRole } from '../../users/entities/user.entity';

const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ sub: 1, email: 'test@example.com', role: 'user' }),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
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
      mockUserRepository.findOne.mockResolvedValue(makeUser({ password: hashed }));
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

  describe('logout', () => {
    it('logout: refresh_token NULL 저장', async () => {
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.logout(1);

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
});
