import type { INestApplication } from '@nestjs/common';
import type { Response as SupertestResponse } from 'supertest';
import request from 'supertest';

export interface AuthCookies {
  accessToken: string;
  refreshToken: string;
  raw: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginCredentials {
  name: string;
}

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';

function parseCookieValue(cookies: string[], cookieName: string): string {
  const match = cookies.find((c) => c.startsWith(`${cookieName}=`));
  if (!match) {
    throw new Error(`Cookie "${cookieName}" not found in set-cookie header`);
  }
  const value = match.split(';')[0].split('=')[1];
  if (!value) {
    throw new Error(`Cookie "${cookieName}" has empty value`);
  }
  return value;
}

export function extractAuthCookies(res: SupertestResponse): AuthCookies {
  const raw = res.headers['set-cookie'] as unknown;
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    throw new Error('No set-cookie header on response');
  }
  const cookies = raw as string[];
  return {
    accessToken: parseCookieValue(cookies, ACCESS_TOKEN_COOKIE),
    refreshToken: parseCookieValue(cookies, REFRESH_TOKEN_COOKIE),
    raw: cookies,
  };
}

export function cookieHeader(cookies: AuthCookies): string[] {
  return cookies.raw.map((c) => c.split(';')[0]);
}

export async function registerAndGetCookies(
  app: INestApplication,
  payload: RegisterPayload,
): Promise<{ cookies: AuthCookies; body: { user: { id: number } } }> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(payload)
    .expect(201);

  return {
    cookies: extractAuthCookies(res),
    body: res.body as { user: { id: number } },
  };
}

export async function loginAndGetCookies(
  app: INestApplication,
  credentials: LoginCredentials,
): Promise<AuthCookies> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send(credentials)
    .expect(200);

  return extractAuthCookies(res);
}
