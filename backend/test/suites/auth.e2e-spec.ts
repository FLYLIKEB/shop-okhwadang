import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MockEmailAdapter } from '../../src/modules/notification/adapters/mock.adapter';
import {
  AuthCookies,
  cookieHeader,
  extractAuthCookies,
} from '../helpers/auth-cookie.helper';

let app: INestApplication;
let dataSource: DataSource;
let mockEmailAdapter: MockEmailAdapter;

interface UserResponse {
  id: number;
  email: string;
  password?: string;
  refreshToken?: string;
}

interface AuthBody {
  user: { id: number };
}

interface RefreshBody {
  message: string;
}

const ACCESS_COOKIE_REGEX = /^accessToken=/;
const REFRESH_COOKIE_REGEX = /^refreshToken=/;
const CLEARED_ACCESS_COOKIE_REGEX = /^accessToken=;/;
const CLEARED_REFRESH_COOKIE_REGEX = /^refreshToken=;/;

export function registerAuthSuite(getApp: () => INestApplication): void {
  describe('Auth (e2e)', () => {
    const email = `auth-e2e-${Date.now()}@test.com`;
    const forgotPasswordEmail = `auth-forgot-${Date.now()}@test.com`;
    const tokenReuseEmail = `auth-reuse-${Date.now()}@test.com`;
    const password = 'Test1234!';
    const name = '테스트유저';

    let cookies: AuthCookies;
    let userId: number;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);
      mockEmailAdapter = app.get(MockEmailAdapter);

      const hashedPassword = await bcrypt.hash(password, 10);
      await dataSource.query(
        'INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [forgotPasswordEmail, hashedPassword, '비밀번호분실유저', 'user', 1, 0],
      );
      await dataSource.query(
        'INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [tokenReuseEmail, hashedPassword, '토큰재사용유저', 'user', 1, 0],
      );
    });

    afterAll(async () => {
      await dataSource.query('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
      await dataSource.query('DELETE FROM users WHERE email = ?', [email]);
      await dataSource.query('DELETE FROM users WHERE email = ?', [forgotPasswordEmail]);
      await dataSource.query('DELETE FROM users WHERE email = ?', [tokenReuseEmail]);
      await dataSource.query('DELETE FROM users WHERE email = ?', ['missing-auth-e2e@test.com']);
    });

    beforeEach(() => {
      mockEmailAdapter.clear();
    });

    describe('POST /api/auth/register', () => {
      it('유효한 정보로 가입 → 201, 인증 쿠키 설정', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ email, password, name })
          .expect(201);

        expect(res.headers['set-cookie']).toEqual(
          expect.arrayContaining([
            expect.stringMatching(ACCESS_COOKIE_REGEX),
            expect.stringMatching(REFRESH_COOKIE_REGEX),
          ]),
        );

        const body = res.body as AuthBody;
        expect(body.user.id).toBeDefined();
        userId = body.user.id;
        cookies = extractAuthCookies(res);
      });

      it('중복 이메일 → 409', () => {
        return request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ email, password, name })
          .expect(409);
      });
    });

    describe('POST /api/auth/login', () => {
      it('올바른 자격증명 → 200, 인증 쿠키 재발급', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email, password })
          .expect(200);

        expect(res.headers['set-cookie']).toEqual(
          expect.arrayContaining([
            expect.stringMatching(ACCESS_COOKIE_REGEX),
            expect.stringMatching(REFRESH_COOKIE_REGEX),
          ]),
        );

        cookies = extractAuthCookies(res);
      });

      it('잘못된 비밀번호 → 401', () => {
        return request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email, password: 'wrong-password' })
          .expect(401);
      });
    });

    describe('GET /api/auth/profile', () => {
      it('유효한 쿠키 → 200, 민감 필드 미노출', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/auth/profile')
          .set('Cookie', cookieHeader(cookies))
          .expect(200);

        const body = res.body as UserResponse;
        expect(body.id).toBe(userId);
        expect(body.email).toBe(email);
        expect(body.password).toBeUndefined();
        expect(body.refreshToken).toBeUndefined();
      });

      it('쿠키 없음 → 401', () => {
        return request(app.getHttpServer()).get('/api/auth/profile').expect(401);
      });

      it('잘못된 쿠키 → 401', () => {
        return request(app.getHttpServer())
          .get('/api/auth/profile')
          .set('Cookie', ['accessToken=invalid.token.here'])
          .expect(401);
      });
    });

    describe('POST /api/auth/refresh', () => {
      it('유효한 refreshToken 쿠키 → 200, 새 쿠키 쌍 발급', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .set('Cookie', cookieHeader(cookies))
          .expect(200);

        expect(res.headers['set-cookie']).toEqual(
          expect.arrayContaining([
            expect.stringMatching(ACCESS_COOKIE_REGEX),
            expect.stringMatching(REFRESH_COOKIE_REGEX),
          ]),
        );

        const body = res.body as RefreshBody;
        expect(body.message).toBeDefined();

        cookies = extractAuthCookies(res);
      });

      it('refreshToken 쿠키 없음 → 401', () => {
        return request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
      });
    });

    describe('POST /api/auth/forgot-password', () => {
      it('존재하는 이메일과 존재하지 않는 이메일 모두 동일한 200 응답을 반환함', async () => {
        const existingRes = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: forgotPasswordEmail })
          .expect(200);

        const missingRes = await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: 'missing-auth-e2e@test.com' })
          .expect(200);

        expect(existingRes.body).toEqual(missingRes.body);
        expect(existingRes.body).toEqual({
          message: '가입된 계정이 있다면 비밀번호 재설정 링크를 이메일로 발송했습니다.',
        });
      });

      it('같은 재설정 토큰을 두 번 사용할 수 없음', async () => {
        await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: tokenReuseEmail })
          .expect(200);

        const sentEmails = mockEmailAdapter.getSent();
        expect(sentEmails).toHaveLength(1);
        const text = sentEmails[0].text ?? '';
        const match = text.match(/token=([A-Za-z0-9]+)/);
        expect(match).not.toBeNull();
        const token = match?.[1] ?? '';

        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ token, newPassword: 'NewPass123!' })
          .expect(200)
          .expect({ message: '비밀번호가 재설정되었습니다.' });

        await request(app.getHttpServer())
          .post('/api/auth/reset-password')
          .send({ token, newPassword: 'AnotherPass123!' })
          .expect(400);
      });
    });

    describe('POST /api/auth/logout', () => {
      it('유효한 쿠키 → 204, 인증 쿠키 삭제', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/auth/logout')
          .set('Cookie', cookieHeader(cookies))
          .expect(204);

        expect(res.headers['set-cookie']).toEqual(
          expect.arrayContaining([
            expect.stringMatching(CLEARED_ACCESS_COOKIE_REGEX),
            expect.stringMatching(CLEARED_REFRESH_COOKIE_REGEX),
          ]),
        );
      });
    });
  });
}
