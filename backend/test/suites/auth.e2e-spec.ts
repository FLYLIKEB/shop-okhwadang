import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MockEmailAdapter } from '../../src/modules/notification/adapters/mock.adapter';

let app: INestApplication;
let dataSource: DataSource;
let mockEmailAdapter: MockEmailAdapter;

export function registerAuthSuite(getApp: () => INestApplication) {
  describe('Auth (e2e)', () => {
    const email = `auth-e2e-${Date.now()}@test.com`;
    const forgotPasswordEmail = `auth-forgot-${Date.now()}@test.com`;
    const tokenReuseEmail = `auth-reuse-${Date.now()}@test.com`;
    const password = 'Test1234!';
    const name = '테스트유저';

    let accessToken: string;
    let refreshToken: string;
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
      it('유효한 정보로 가입 → 201, accessToken 포함', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ email, password, name })
          .expect(201);

        const body = res.body as { accessToken: string; refreshToken: string; user: { id: number } };
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();
        expect(body.user.id).toBeDefined();
        userId = body.user.id;
        accessToken = body.accessToken;
        refreshToken = body.refreshToken;
      });

      it('중복 이메일 → 409', () => {
        return request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ email, password, name })
          .expect(409);
      });
    });

    describe('POST /api/auth/login', () => {
      it('올바른 자격증명 → 200, refreshToken 포함', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email, password })
          .expect(200);

        const body = res.body as { accessToken: string; refreshToken: string };
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();
        accessToken = body.accessToken;
        refreshToken = body.refreshToken;
      });

      it('잘못된 비밀번호 → 401', () => {
        return request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email, password: 'wrong-password' })
          .expect(401);
      });
    });

    describe('GET /api/auth/profile', () => {
      it('유효한 JWT → 200, 민감 필드 미노출', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        const body = res.body as { id: number; email: string; password?: string; refreshToken?: string };
        expect(body.id).toBe(userId);
        expect(body.email).toBe(email);
        expect(body.password).toBeUndefined();
        expect(body.refreshToken).toBeUndefined();
      });

      it('JWT 없음 → 401', () => {
        return request(app.getHttpServer()).get('/api/auth/profile').expect(401);
      });

      it('잘못된 JWT → 401', () => {
        return request(app.getHttpServer())
          .get('/api/auth/profile')
          .set('Authorization', 'Bearer invalid.token.here')
          .expect(401);
      });
    });

    describe('POST /api/auth/refresh', () => {
      it('유효한 refreshToken → 200, 새 토큰 쌍 반환', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .set('Cookie', [`refreshToken=${refreshToken}`])
          .expect(200);

        const body = res.body as { accessToken: string; refreshToken: string };
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();
        accessToken = body.accessToken;
        refreshToken = body.refreshToken;
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
      it('유효한 JWT → 204', () => {
        return request(app.getHttpServer())
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(204);
      });
    });
  });
}
