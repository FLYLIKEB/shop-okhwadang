import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import type { AuthConfig } from '../../config/auth.config';
import { UserAwareThrottlerGuard } from './user-aware-throttler.guard';

describe('UserAwareThrottlerGuard', () => {
  let guard: UserAwareThrottlerGuard;
  let privateKey: string;
  let publicKey: string;
  let wrongPrivateKey: string;
  const call = (req: unknown) =>
    (guard as unknown as { getTracker: (r: unknown) => Promise<string> }).getTracker(req);

  const buildAuthConfig = (jwtPublicKey: string): AuthConfig => ({
    nodeEnv: 'test',
    cookie: { secure: false },
    frontend: { baseUrl: 'http://localhost:5173', allowedOrigins: [] },
    jwt: {
      secret: 'legacy-secret-not-used-for-access-token-verification',
      refreshSecret: null,
      expiresIn: '1h',
      refreshExpiresIn: '7d',
      privateKey,
      publicKey: jwtPublicKey,
    },
    oauth: {
      kakao: { clientId: '', clientSecret: '', redirectUri: '' },
      google: { clientId: '', clientSecret: '', redirectUri: '' },
    },
  });

  const setAuthConfig = (authConfig: AuthConfig) => {
    (guard as unknown as { authConfig: AuthConfig }).authConfig = authConfig;
  };

  beforeAll(() => {
    const keyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;

    const wrongKeyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    wrongPrivateKey = wrongKeyPair.privateKey;
  });

  beforeEach(() => {
    guard = Object.create(UserAwareThrottlerGuard.prototype) as UserAwareThrottlerGuard;
    setAuthConfig(buildAuthConfig(publicKey));
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
    it('uses sub from an actual RS256 accessToken cookie when request.user is missing', async () => {
      const token = jwt.sign({ sub: 99, role: 'user' }, privateKey, { algorithm: 'RS256' });

      await expect(
        call({ user: undefined, ip: '10.0.0.1', cookies: { accessToken: token } }),
      ).resolves.toBe('user:99');
    });

    it('falls back to ip when a legacy HS256 JWT_SECRET token is supplied', async () => {
      const token = jwt.sign({ sub: 99, role: 'user' }, 'legacy-secret-not-used-for-access-token-verification');

      await expect(
        call({ user: undefined, ip: '203.0.113.4', cookies: { accessToken: token } }),
      ).resolves.toBe('ip:203.0.113.4');
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
      const token = jwt.sign({ foo: 'bar' }, privateKey, { algorithm: 'RS256' });
      await expect(
        call({ user: undefined, ip: '203.0.113.7', cookies: { accessToken: token } }),
      ).resolves.toBe('ip:203.0.113.7');
    });

    it('ignores refresh token (tokenType=refresh) to avoid mixing buckets', async () => {
      const token = jwt.sign({ sub: 5, tokenType: 'refresh' }, privateKey, { algorithm: 'RS256' });
      await expect(
        call({ user: undefined, ip: '203.0.113.8', cookies: { accessToken: token } }),
      ).resolves.toBe('ip:203.0.113.8');
    });

    it('falls back to ip when cookie token signature is invalid', async () => {
      const token = jwt.sign({ sub: 'spoofed-user' }, wrongPrivateKey, { algorithm: 'RS256' });
      await expect(
        call({ user: undefined, ip: '203.0.113.9', cookies: { accessToken: token } }),
      ).resolves.toBe('ip:203.0.113.9');
    });

    it('falls back to ip when AuthConfig public key is missing', async () => {
      setAuthConfig(buildAuthConfig(''));
      const token = jwt.sign({ sub: 77 }, privateKey, { algorithm: 'RS256' });

      await expect(
        call({ user: undefined, ip: '203.0.113.10', cookies: { accessToken: token } }),
      ).resolves.toBe('ip:203.0.113.10');
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
