import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtStrategy } from './jwt.strategy';
import { User, UserRole } from '../../users/entities/user.entity';
import { TokenBlacklistService } from '../token-blacklist.service';
import { createAuthConfig } from '../../../config/auth.config';

const mockUserRepository = {
  findOne: jest.fn(),
};

const mockTokenBlacklistService = {
  addToBlacklist: jest.fn(),
  isBlacklisted: jest.fn(),
  revokeAllUserTokens: jest.fn(),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const activeUser = {
    id: 1,
    email: 'test@test.com',
    role: UserRole.USER,
    isActive: true,
  } as User;

  beforeEach(() => {
    jest.clearAllMocks();

    strategy = new JwtStrategy(
      mockUserRepository as unknown as Repository<User>,
      mockTokenBlacklistService as unknown as TokenBlacklistService,
      createAuthConfig({
        NODE_ENV: 'development',
        JWT_SECRET: 'test-secret',
        JWT_PRIVATE_KEY: 'test-private-key',
        JWT_PUBLIC_KEY: 'test-public-key',
        FRONTEND_URL: 'https://frontend.test',
      }),
    );
  });

  describe('validate()', () => {
    it('should return user object for valid access token payload without tokenType', async () => {
      mockUserRepository.findOne.mockResolvedValue(activeUser);
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      const payload = { sub: 1, email: 'test@test.com', role: 'user' };
      const result = await strategy.validate(payload);
      expect(result).toEqual({ id: 1, email: 'test@test.com', role: 'user', jti: undefined });
    });

    it('should return user object for payload with tokenType: access', async () => {
      mockUserRepository.findOne.mockResolvedValue(activeUser);
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      const payload = { sub: 1, email: 'test@test.com', role: 'user', tokenType: 'access' };
      const result = await strategy.validate(payload);
      expect(result).toEqual({ id: 1, email: 'test@test.com', role: 'user', jti: undefined });
    });

    it('should throw UnauthorizedException when tokenType is refresh', async () => {
      const payload = { sub: 1, email: 'test@test.com', role: 'user', tokenType: 'refresh' };
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with correct message for refresh token', async () => {
      const payload = { sub: 1, email: 'test@test.com', role: 'user', tokenType: 'refresh' };
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Refresh tokens cannot be used for API access',
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const payload = { sub: 99, email: 'ghost@test.com', role: 'user' };
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user isActive is false', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 1, isActive: false } as User);
      const payload = { sub: 1, email: 'test@test.com', role: 'user' };
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with correct message for inactive user', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 1, isActive: false } as User);
      const payload = { sub: 1, email: 'test@test.com', role: 'user' };
      await expect(strategy.validate(payload)).rejects.toThrow('비활성화된 계정입니다.');
    });

    it('should throw UnauthorizedException when token is blacklisted', async () => {
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(true);
      const payload = { sub: 1, email: 'test@test.com', role: 'user', tokenType: 'access', jti: 'blacklisted-jti' };
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('토큰이 무효화되었습니다.');
    });

    it('should not check blacklist when jti is absent', async () => {
      mockUserRepository.findOne.mockResolvedValue(activeUser);
      const payload = { sub: 1, email: 'test@test.com', role: 'user', tokenType: 'access' };
      await strategy.validate(payload);
      expect(mockTokenBlacklistService.isBlacklisted).not.toHaveBeenCalled();
    });

    it('should check blacklist and return user with jti when token is not blacklisted', async () => {
      mockUserRepository.findOne.mockResolvedValue(activeUser);
      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);
      const payload = { sub: 1, email: 'test@test.com', role: 'user', tokenType: 'access', jti: 'valid-jti' };
      const result = await strategy.validate(payload);
      expect(mockTokenBlacklistService.isBlacklisted).toHaveBeenCalledWith('valid-jti');
      expect(result).toEqual({ id: 1, email: 'test@test.com', role: 'user', jti: 'valid-jti' });
    });
  });
});
