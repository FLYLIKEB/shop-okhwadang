import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

let app: INestApplication;
let dataSource: DataSource;

export function registerAuthSuite(getApp: () => INestApplication) {
  describe('Auth (e2e)', () => {
    const email = `auth-e2e-${Date.now()}@test.com`;
    const password = 'Test1234!';
    const name = '테스트유저';

    let accessToken: string;
    let refreshToken: string;
    let userId: number;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);
    });

    afterAll(async () => {
      await dataSource.query('DELETE FROM users WHERE email = ?', [email]);
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
          .send({ refreshToken })
          .expect(200);

        const body = res.body as { accessToken: string; refreshToken: string };
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();
        accessToken = body.accessToken;
        refreshToken = body.refreshToken;
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
