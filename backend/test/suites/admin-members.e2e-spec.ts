import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  AuthCookies,
  cookieHeader,
  loginAndGetCookies,
  registerAndGetCookies,
} from '../helpers/auth-cookie.helper';

let app: INestApplication;
let dataSource: DataSource;

export function registerAdminMembersSuite(getApp: () => INestApplication) {
  describe('Admin Members (e2e)', () => {
    let superAdminCookies: AuthCookies;
    let adminCookies: AuthCookies;
    let userCookies: AuthCookies;
    let userId: number;
    let superAdminId: number;

    const superAdminEmail = `members-super-${Date.now()}@test.com`;
    const adminEmail = `members-admin-${Date.now()}@test.com`;
    const userEmail = `members-user-${Date.now()}@test.com`;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Register super_admin
      await registerAndGetCookies(app, {
        email: superAdminEmail,
        password: 'Test1234!',
        name: '슈퍼관리자',
      });
      await dataSource.query(`UPDATE users SET role = 'super_admin' WHERE email = ?`, [superAdminEmail]);
      superAdminCookies = await loginAndGetCookies(app, {
        email: superAdminEmail,
        password: 'Test1234!',
      });
      const superProfile = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Cookie', cookieHeader(superAdminCookies));
      superAdminId = (superProfile.body as { id: number }).id;

      // Register admin
      await registerAndGetCookies(app, {
        email: adminEmail,
        password: 'Test1234!',
        name: '회원관리자',
      });
      await dataSource.query(`UPDATE users SET role = 'admin' WHERE email = ?`, [adminEmail]);
      adminCookies = await loginAndGetCookies(app, {
        email: adminEmail,
        password: 'Test1234!',
      });

      // Register user
      await registerAndGetCookies(app, {
        email: userEmail,
        password: 'Test1234!',
        name: '일반회원',
      });
      userCookies = await loginAndGetCookies(app, {
        email: userEmail,
        password: 'Test1234!',
      });
      const userProfile = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Cookie', cookieHeader(userCookies));
      userId = (userProfile.body as { id: number }).id;
    });

    describe('GET /api/admin/members', () => {
      it('admin → 200 회원 목록 조회', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/members')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as { items: Record<string, unknown>[]; total: number; page: number; limit: number };
        expect(body.items).toBeDefined();
        expect(body.total).toBeGreaterThanOrEqual(1);
        expect(body.page).toBe(1);

        // password, refreshToken 제외 확인
        for (const item of body.items) {
          expect(item).not.toHaveProperty('password');
          expect(item).not.toHaveProperty('refreshToken');
        }
      });

      it('일반 user → 403 거부', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/members')
          .set('Cookie', cookieHeader(userCookies))
          .expect(403);
      });

      it('비인증 → 401', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/members')
          .expect(401);
      });

      it('q 검색 필터 → 200', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/admin/members?q=${encodeURIComponent('일반회원')}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as { items: { name: string }[] };
        expect(body.items.length).toBeGreaterThanOrEqual(1);
      });

      it('role 필터 → 200', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/members?role=admin')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as { items: { role: string }[] };
        for (const item of body.items) {
          expect(item.role).toBe('admin');
        }
      });
    });

    describe('PATCH /api/admin/members/:id', () => {
      it('admin: user→admin 허용', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/members/${userId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ role: 'admin' })
          .expect(200);

        const body = res.body as { role: string };
        expect(body.role).toBe('admin');
      });

      it('admin: admin→user 허용', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/members/${userId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ role: 'user' })
          .expect(200);

        const body = res.body as { role: string };
        expect(body.role).toBe('user');
      });

      it('admin: super_admin 부여 → 403', async () => {
        await request(app.getHttpServer())
          .patch(`/api/admin/members/${userId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ role: 'super_admin' })
          .expect(403);
      });

      it('admin: super_admin 강등 → 403', async () => {
        await request(app.getHttpServer())
          .patch(`/api/admin/members/${superAdminId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ role: 'user' })
          .expect(403);
      });

      it('자기 자신 역할 변경 → 400', async () => {
        await request(app.getHttpServer())
          .patch(`/api/admin/members/${superAdminId}`)
          .set('Cookie', cookieHeader(superAdminCookies))
          .send({ role: 'user' })
          .expect(400);
      });

      it('super_admin: user→super_admin 허용', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/members/${userId}`)
          .set('Cookie', cookieHeader(superAdminCookies))
          .send({ role: 'super_admin' })
          .expect(200);

        const body = res.body as { role: string };
        expect(body.role).toBe('super_admin');
      });

      it('super_admin: super_admin→user 허용 (복수)', async () => {
        // userId is now super_admin, superAdminId is also super_admin → count=2
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/members/${userId}`)
          .set('Cookie', cookieHeader(superAdminCookies))
          .send({ role: 'user' })
          .expect(200);

        const body = res.body as { role: string };
        expect(body.role).toBe('user');
      });

      it('비활성 회원 역할 변경 → 400', async () => {
        // Deactivate user
        await dataSource.query(`UPDATE users SET is_active = false WHERE id = ?`, [userId]);

        const res = await request(app.getHttpServer())
          .patch(`/api/admin/members/${userId}`)
          .set('Cookie', cookieHeader(superAdminCookies))
          .send({ role: 'admin' })
          .expect(400);

        const body = res.body as { message: string };
        expect(body.message).toContain('비활성');

        // Restore
        await dataSource.query(`UPDATE users SET is_active = true WHERE id = ?`, [userId]);
      });

      it('일반 user → 403', async () => {
        await request(app.getHttpServer())
          .patch(`/api/admin/members/${userId}`)
          .set('Cookie', cookieHeader(userCookies))
          .send({ role: 'admin' })
          .expect(403);
      });

      it('응답에 password, refreshToken 미포함', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/members/${userId}`)
          .set('Cookie', cookieHeader(superAdminCookies))
          .send({ role: 'admin' })
          .expect(200);

        const body = res.body as Record<string, unknown>;
        expect(body).not.toHaveProperty('password');
        expect(body).not.toHaveProperty('refreshToken');
      });
    });
  });
}
