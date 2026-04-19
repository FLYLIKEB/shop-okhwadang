import { UserAwareThrottlerGuard } from './user-aware-throttler.guard';

describe('UserAwareThrottlerGuard', () => {
  let guard: UserAwareThrottlerGuard;

  beforeEach(() => {
    guard = Object.create(UserAwareThrottlerGuard.prototype) as UserAwareThrottlerGuard;
  });

  describe('getTracker', () => {
    it('returns user:{id} when request.user.id is present', async () => {
      const req = { user: { id: 42 }, ip: '10.0.0.1' };
      await expect(
        (guard as unknown as { getTracker: (r: unknown) => Promise<string> }).getTracker(req),
      ).resolves.toBe('user:42');
    });

    it('returns user:{id} when id is a string (BIGINT serialized)', async () => {
      const req = { user: { id: '7' }, ip: '10.0.0.1' };
      await expect(
        (guard as unknown as { getTracker: (r: unknown) => Promise<string> }).getTracker(req),
      ).resolves.toBe('user:7');
    });

    it('falls back to ip:{addr} when user is missing', async () => {
      const req = { user: undefined, ip: '203.0.113.5' };
      await expect(
        (guard as unknown as { getTracker: (r: unknown) => Promise<string> }).getTracker(req),
      ).resolves.toBe('ip:203.0.113.5');
    });

    it('falls back to ip:{addr} when user.id is missing', async () => {
      const req = { user: { email: 'x@y.z' }, ip: '203.0.113.6' };
      await expect(
        (guard as unknown as { getTracker: (r: unknown) => Promise<string> }).getTracker(req),
      ).resolves.toBe('ip:203.0.113.6');
    });

    it('returns ip:unknown when neither user.id nor ip exists', async () => {
      const req: { user?: unknown; ip?: string } = {};
      await expect(
        (guard as unknown as { getTracker: (r: unknown) => Promise<string> }).getTracker(req),
      ).resolves.toBe('ip:unknown');
    });

    it('produces different keys for different users on the same IP', async () => {
      const reqA = { user: { id: 1 }, ip: '10.0.0.1' };
      const reqB = { user: { id: 2 }, ip: '10.0.0.1' };
      const get = (r: unknown) =>
        (guard as unknown as { getTracker: (r: unknown) => Promise<string> }).getTracker(r);
      const [keyA, keyB] = await Promise.all([get(reqA), get(reqB)]);
      expect(keyA).not.toBe(keyB);
    });
  });
});
