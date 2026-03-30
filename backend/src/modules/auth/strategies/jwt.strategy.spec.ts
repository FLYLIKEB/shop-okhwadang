import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    strategy = new JwtStrategy();
  });

  describe('validate()', () => {
    it('should return user object for valid access token payload without tokenType', () => {
      const payload = { sub: 1, email: 'test@test.com', role: 'user' };
      const result = strategy.validate(payload);
      expect(result).toEqual({ id: 1, email: 'test@test.com', role: 'user' });
    });

    it('should return user object for payload with tokenType: access', () => {
      const payload = { sub: 1, email: 'test@test.com', role: 'user', tokenType: 'access' };
      const result = strategy.validate(payload);
      expect(result).toEqual({ id: 1, email: 'test@test.com', role: 'user' });
    });

    it('should throw UnauthorizedException when tokenType is refresh', () => {
      const payload = { sub: 1, email: 'test@test.com', role: 'user', tokenType: 'refresh' };
      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with correct message for refresh token', () => {
      const payload = { sub: 1, email: 'test@test.com', role: 'user', tokenType: 'refresh' };
      expect(() => strategy.validate(payload)).toThrow(
        'Refresh tokens cannot be used for API access',
      );
    });
  });
});
