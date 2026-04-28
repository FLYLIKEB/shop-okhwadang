import { resolveTrustProxy } from '../config/trust-proxy';

describe('resolveTrustProxy', () => {
  it('returns 1 in production by default', () => {
    expect(resolveTrustProxy(undefined, 'production')).toBe(1);
  });

  it('returns false outside production by default (blocks XFF spoof)', () => {
    expect(resolveTrustProxy(undefined, 'development')).toBe(false);
    expect(resolveTrustProxy(undefined, 'test')).toBe(false);
    expect(resolveTrustProxy(undefined, undefined)).toBe(false);
  });

  it('parses numeric hop count from TRUST_PROXY', () => {
    expect(resolveTrustProxy('0', 'production')).toBe(0);
    expect(resolveTrustProxy('2', 'production')).toBe(2);
    expect(resolveTrustProxy(' 3 ', 'production')).toBe(3);
  });

  it('parses boolean strings', () => {
    expect(resolveTrustProxy('true', 'production')).toBe(true);
    expect(resolveTrustProxy('TRUE', 'production')).toBe(true);
    expect(resolveTrustProxy('false', 'development')).toBe(false);
  });

  it('falls back to default on invalid input', () => {
    expect(resolveTrustProxy('abc', 'production')).toBe(1);
    expect(resolveTrustProxy('-1', 'production')).toBe(1);
    expect(resolveTrustProxy('abc', 'development')).toBe(false);
  });
});
