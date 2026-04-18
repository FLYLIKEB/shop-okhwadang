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

export function registerAdminSuite(getApp: () => INestApplication) {
  describe('Admin (e2e)', () => {
    const adminEmail = `admin-e2e-${Date.now()}@test.com`;
    const userEmail = `user-e2e-${Date.now()}@test.com`;
    const password = 'Test1234!';
    const name = '테스트관리자';

    let adminCookies: AuthCookies;
    let userCookies: AuthCookies;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Create admin user directly in DB
      await dataSource.query(
        `INSERT INTO users (email, password, name, role, created_at, updated_at) VALUES (?, '$2b$10$mockhash', ?, 'admin', NOW(), NOW())`,
        [adminEmail, name],
      );

      // Create regular user
      await dataSource.query(
        `INSERT INTO users (email, password, name, role, created_at, updated_at) VALUES (?, '$2b$10$mockhash', ?, 'user', NOW(), NOW())`,
        [userEmail, name],
      );

      // Register a new admin user via API and promote to admin
      const adminReg = await registerAndGetCookies(app, {
        email: `new-${adminEmail}`,
        password,
        name,
      });
      adminCookies = adminReg.cookies;
      await dataSource.query(
        `UPDATE users SET role = 'admin' WHERE email = ?`,
        [`new-${adminEmail}`],
      );

      // Register regular user via API
      const userReg = await registerAndGetCookies(app, {
        email: `new-${userEmail}`,
        password,
        name,
      });
      userCookies = userReg.cookies;
    });

    afterAll(async () => {
      await dataSource.query('DELETE FROM users WHERE email IN (?, ?, ?, ?)', [
        adminEmail,
        userEmail,
        `new-${adminEmail}`,
        `new-${userEmail}`,
      ]);
    });

    describe('GET /api/admin/dashboard', () => {
      it('토큰 없음 → 401', () => {
        return request(app.getHttpServer()).get('/api/admin/dashboard').expect(401);
      });

      it('role=user → 403', () => {
        return request(app.getHttpServer())
          .get('/api/admin/dashboard')
          .set('Cookie', cookieHeader(userCookies))
          .expect(403);
      });

      it('role=admin → 200', async () => {
        // Re-login to get fresh cookies with admin role in JWT
        adminCookies = await loginAndGetCookies(app, {
          email: `new-${adminEmail}`,
          password,
        });

        return request(app.getHttpServer())
          .get('/api/admin/dashboard')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);
      });
    });
  });
}
