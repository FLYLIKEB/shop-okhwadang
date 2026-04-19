import * as jwt from 'jsonwebtoken';
import { UserAwareThrottlerGuard } from './user-aware-throttler.guard';

describe('UserAwareThrottlerGuard', () => {
  let guard: UserAwareThrottlerGuard;
  const call = (req: unknown) =>
    (guard as unknown as { getTracker: (r: unknown) => Promise<string> }).getTracker(req);

  beforeEach(() => {
    guard = Object.create(UserAwareThrottlerGuard.prototype) as UserAwareThrottlerGuard;
  });

  describe('getTracker — post-JwtAuthGuard request.user', () => {
    it('returns user:{id} when request.user.id is present', async () => {
      await expect(call({ user: { id: 42 }, ip: '10.0.0.1' })).resolves.toBe('user:42');
    });

    it('returns user:{id} when id is a string (BIGINT serialized)', async () => {
      await expect(call({ user: { id: '7' }, ip: '10.0.0.1' })).resolves.toBe('user:7');
    });
  });

  describe('getTracker — cookie accessToken fallback (runs before JwtAuthGuard)', () => {
    it('decodes sub from accessToken cookie when request.user is missing', async () => {
      const token = jwt.sign({ sub: 99, role: 'user' }, 'dev-secret');
      await expect(
        call({ user: undefined, ip: '10.0.0.1', cookies: { accessToken: token } }),
      ).resolves.toBe('user:99');
    });

    it('falls back to ip when cookie token is malformed', async () => {
      await expect(
        call({ user: undefined, ip: '203.0.113.5', cookies: { accessToken: 'not-a-jwt' } }),
      ).resolves.toBe('ip:203.0.113.5');
    });

    it('falls back to ip when no cookies header', async () => {
      await expect(
        call({ user: undefined, ip: '203.0.113.6' }),
      ).resolves.toBe('ip:203.0.113.6');
    });

    it('falls back to ip when cookie token lacks sub', async () => {
      const token = jwt.sign({ foo: 'bar' }, 'dev-secret');
      await expect(
        call({ user: undefined, ip: '203.0.113.7', cookies: { accessToken: token } }),
      ).resolves.toBe('ip:203.0.113.7');
    });

    it('ignores refresh token (tokenType=refresh) to avoid mixing buckets', async () => {
      const token = jwt.sign({ sub: 5, tokenType: 'refresh' }, 'dev-secret');
      await expect(
        call({ user: undefined, ip: '203.0.113.8', cookies: { accessToken: token } }),
      ).resolves.toBe('ip:203.0.113.8');
    });
  });

  describe('getTracker — edge cases', () => {
    it('returns ip:unknown when neither user, cookies, nor ip exist', async () => {
      await expect(call({})).resolves.toBe('ip:unknown');
    });

    it('produces different keys for different users on the same IP', async () => {
      const [a, b] = await Promise.all([
        call({ user: { id: 1 }, ip: '10.0.0.1' }),
        call({ user: { id: 2 }, ip: '10.0.0.1' }),
      ]);
      expect(a).not.toBe(b);
    });
  });
});
