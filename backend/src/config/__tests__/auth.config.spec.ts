import { createAuthConfig } from '../auth.config';

describe('createAuthConfig', () => {
  const makeEnv = (overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv => ({
    NODE_ENV: 'development',
    JWT_SECRET: 'jwt-secret',
    JWT_PRIVATE_KEY: 'private-key',
    JWT_PUBLIC_KEY: 'public-key',
    FRONTEND_URL: 'https://frontend.test',
    ...overrides,
  });

  it('production에서 JWT_REFRESH_SECRET 누락 시 에러를 던진다', () => {
    expect(() =>
      createAuthConfig(
        makeEnv({
          NODE_ENV: 'production',
          JWT_REFRESH_SECRET: '',
        }),
      ),
    ).toThrow('JWT_REFRESH_SECRET must be set in production');
  });

  it('FRONTEND_URL 누락 시 에러를 던진다', () => {
    expect(() =>
      createAuthConfig(
        makeEnv({
          FRONTEND_URL: '',
        }),
      ),
    ).toThrow('FRONTEND_URL environment variable is required');
  });

  it('oauth/jwt 설정을 typed object로 반환한다', () => {
    const config = createAuthConfig(
      makeEnv({
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_EXPIRES_IN: '2h',
        JWT_REFRESH_EXPIRES_IN: '14d',
        KAKAO_CLIENT_ID: 'kakao-client',
        KAKAO_CLIENT_SECRET: 'kakao-secret',
        KAKAO_REDIRECT_URI: 'https://frontend.test/auth/kakao/callback',
        GOOGLE_CLIENT_ID: 'google-client',
        GOOGLE_CLIENT_SECRET: 'google-secret',
        GOOGLE_REDIRECT_URI: 'https://frontend.test/auth/google/callback',
        FRONTEND_URLS: 'https://front-a.test, https://front-b.test',
      }),
    );

    expect(config.jwt).toMatchObject({
      secret: 'jwt-secret',
      refreshSecret: 'refresh-secret',
      expiresIn: '2h',
      refreshExpiresIn: '14d',
      privateKey: 'private-key',
      publicKey: 'public-key',
    });
    expect(config.oauth.kakao).toMatchObject({
      clientId: 'kakao-client',
      clientSecret: 'kakao-secret',
    });
    expect(config.frontend.allowedOrigins).toEqual([
      'https://front-a.test',
      'https://front-b.test',
    ]);
  });
});
