import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

let app: INestApplication;
let dataSource: DataSource;

export function registerAdminSuite(getApp: () => INestApplication) {
  describe('Admin (e2e)', () => {
    const adminEmail = `admin-e2e-${Date.now()}@test.com`;
    const userEmail = `user-e2e-${Date.now()}@test.com`;
    const password = 'Test1234!';
    const name = '테스트관리자';

    let adminToken: string;
    let userToken: string;

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

      // Login as admin
      const adminRegRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `new-${adminEmail}`, password, name });
      const adminBody = adminRegRes.body as { accessToken?: string };
      if (adminBody.accessToken) {
        // Update role to admin
        await dataSource.query(
          `UPDATE users SET role = 'admin' WHERE email = ?`,
          [`new-${adminEmail}`],
        );
        // Re-login to get fresh token with admin role - using direct token
        adminToken = adminBody.accessToken;
      }

      // Login as regular user
      const userRegRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: `new-${userEmail}`, password, name });
      const userBody = userRegRes.body as { accessToken?: string };
      if (userBody.accessToken) {
        userToken = userBody.accessToken;
      }
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
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });

      it('role=admin → 200', async () => {
        // Update the newly created user to admin role and get a valid token
        await dataSource.query(
          `UPDATE users SET role = 'admin' WHERE email = ?`,
          [`new-${adminEmail}`],
        );

        // Login again to get token with admin role reflected via JWT
        // Note: JWT role is embedded at sign time, so we need a fresh login
        const loginRes = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: `new-${adminEmail}`, password });

        const loginBody = loginRes.body as { accessToken?: string };
        if (loginBody.accessToken) {
          adminToken = loginBody.accessToken;
        }

        return request(app.getHttpServer())
          .get('/api/admin/dashboard')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
    });
  });
}
