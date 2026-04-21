import { Provider } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type ms from 'ms';

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

export interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface AuthConfig {
  nodeEnv: string;
  cookie: {
    secure: boolean;
  };
  frontend: {
    baseUrl: string;
    allowedOrigins: string[];
  };
  jwt: {
    secret: string;
    refreshSecret: string | null;
    expiresIn: ms.StringValue;
    refreshExpiresIn: ms.StringValue;
    privateKey: string;
    publicKey: string;
  };
  oauth: {
    kakao: OAuthClientConfig;
    google: OAuthClientConfig;
  };
}

function normalizeEnvValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readKeyFromPath(filePath: string | null): string | null {
  if (!filePath) {
    return null;
  }

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const contents = fs.readFileSync(filePath, 'utf-8').trim();
  return contents.length > 0 ? contents : null;
}

function resolveJwtPrivateKey(env: NodeJS.ProcessEnv): string {
  const inlinePrivateKey = normalizeEnvValue(env.JWT_PRIVATE_KEY);
  if (inlinePrivateKey) {
    return inlinePrivateKey;
  }

  const envPrivateKeyPath =
    normalizeEnvValue(env.JWT_PRIVATE_KEY_PATH) ?? normalizeEnvValue(env.JWT_PRIVATE_KEY_FILE);
  const fromConfiguredPath = readKeyFromPath(envPrivateKeyPath);
  if (fromConfiguredPath) {
    return fromConfiguredPath;
  }

  const possiblePaths = [
    path.resolve(process.cwd(), 'keys', 'jwt-private.pem'),
    path.resolve(process.cwd(), '..', 'keys', 'jwt-private.pem'),
    path.resolve(__dirname, '..', '..', 'keys', 'jwt-private.pem'),
    path.resolve(__dirname, '..', '..', '..', 'keys', 'jwt-private.pem'),
  ];

  for (const keyPath of possiblePaths) {
    const key = readKeyFromPath(keyPath);
    if (key) {
      return key;
    }
  }

  throw new Error('JWT_PRIVATE_KEY environment variable or keys/jwt-private.pem file is required');
}

function resolveJwtPublicKey(env: NodeJS.ProcessEnv): string {
  const inlinePublicKey = normalizeEnvValue(env.JWT_PUBLIC_KEY);
  if (inlinePublicKey) {
    return inlinePublicKey;
  }

  const envPublicKeyPath =
    normalizeEnvValue(env.JWT_PUBLIC_KEY_PATH) ?? normalizeEnvValue(env.JWT_PUBLIC_KEY_FILE);
  const fromConfiguredPath = readKeyFromPath(envPublicKeyPath);
  if (fromConfiguredPath) {
    return fromConfiguredPath;
  }

  const possiblePaths = [
    path.resolve(process.cwd(), 'keys', 'jwt-public.pem'),
    path.resolve(process.cwd(), '..', 'keys', 'jwt-public.pem'),
    path.resolve(__dirname, '..', '..', 'keys', 'jwt-public.pem'),
    path.resolve(__dirname, '..', '..', '..', 'keys', 'jwt-public.pem'),
  ];

  for (const keyPath of possiblePaths) {
    const key = readKeyFromPath(keyPath);
    if (key) {
      return key;
    }
  }

  throw new Error('JWT_PUBLIC_KEY environment variable or keys/jwt-public.pem file is required');
}

function parseAllowedOrigins(frontendUrls: string | undefined): string[] {
  if (!frontendUrls) {
    return [];
  }

  return frontendUrls
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function createAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const refreshSecret = normalizeEnvValue(env.JWT_REFRESH_SECRET);

  if (nodeEnv === 'production' && !refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET must be set in production');
  }

  const frontendBaseUrl = normalizeEnvValue(env.FRONTEND_URL);
  if (!frontendBaseUrl) {
    throw new Error('FRONTEND_URL environment variable is required');
  }

  return {
    nodeEnv,
    cookie: {
      secure: nodeEnv === 'production',
    },
    frontend: {
      baseUrl: frontendBaseUrl,
      allowedOrigins: parseAllowedOrigins(env.FRONTEND_URLS),
    },
    jwt: {
      secret: env.JWT_SECRET ?? '',
      refreshSecret,
      expiresIn: (env.JWT_EXPIRES_IN ?? '1h') as ms.StringValue,
      refreshExpiresIn: (env.JWT_REFRESH_EXPIRES_IN ?? '7d') as ms.StringValue,
      privateKey: resolveJwtPrivateKey(env),
      publicKey: resolveJwtPublicKey(env),
    },
    oauth: {
      kakao: {
        clientId: env.KAKAO_CLIENT_ID ?? '',
        clientSecret: env.KAKAO_CLIENT_SECRET ?? '',
        redirectUri: env.KAKAO_REDIRECT_URI ?? '',
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
        redirectUri: env.GOOGLE_REDIRECT_URI ?? '',
      },
    },
  };
}

export const authConfigProvider: Provider = {
  provide: AUTH_CONFIG,
  useFactory: () => createAuthConfig(),
};
