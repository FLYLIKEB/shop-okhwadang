import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../../users/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<Pick<Repository<User>, 'findOne'>>;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    userRepository = {
      findOne: jest.fn(),
    };
    strategy = new JwtStrategy(userRepository as unknown as Repository<User>);
  });

  describe('validate()', () => {
    it('should return user object for valid access token payload without tokenType', async () => {
      userRepository.findOne.mockResolvedValue({ id: 1, isActive: true } as User);
      const payload = { sub: 1, email: 'test@test.com', role: 'user' };
      const result = await strategy.validate(payload);
      expect(result).toEqual({ id: 1, email: 'test@test.com', role: 'user' });
    });

    it('should return user object for payload with tokenType: access', async () => {
      userRepository.findOne.mockResolvedValue({ id: 1, isActive: true } as User);
      const payload = { sub: 1, email: 'test@test.com', role: 'user', tokenType: 'access' };
      const result = await strategy.validate(payload);
      expect(result).toEqual({ id: 1, email: 'test@test.com', role: 'user' });
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
      userRepository.findOne.mockResolvedValue(null);
      const payload = { sub: 99, email: 'ghost@test.com', role: 'user' };
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user isActive is false', async () => {
      userRepository.findOne.mockResolvedValue({ id: 1, isActive: false } as User);
      const payload = { sub: 1, email: 'test@test.com', role: 'user' };
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with correct message for inactive user', async () => {
      userRepository.findOne.mockResolvedValue({ id: 1, isActive: false } as User);
      const payload = { sub: 1, email: 'test@test.com', role: 'user' };
      await expect(strategy.validate(payload)).rejects.toThrow('비활성화된 계정입니다.');
    });
  });
});
