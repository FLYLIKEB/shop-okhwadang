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

export function registerAdminDashboardSuite(getApp: () => INestApplication) {
  describe('Admin Dashboard (e2e)', () => {
    const adminEmail = `admin-dash-e2e-${Date.now()}@test.com`;
    const userEmail = `user-dash-e2e-${Date.now()}@test.com`;
    const password = 'Test1234!';
    const name = '대시보드관리자';

    let adminCookies: AuthCookies;
    let userCookies: AuthCookies;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      await registerAndGetCookies(app, { email: adminEmail, password, name });

      await dataSource.query(
        `UPDATE users SET role = 'admin' WHERE email = ?`,
        [adminEmail],
      );

      adminCookies = await loginAndGetCookies(app, { email: adminEmail, password });

      const userReg = await registerAndGetCookies(app, {
        email: userEmail,
        password,
        name: '일반사용자',
      });
      userCookies = userReg.cookies;
    });

    afterAll(async () => {
      await dataSource.query('DELETE FROM users WHERE email IN (?, ?)', [
        adminEmail,
        userEmail,
      ]);
    });

    describe('GET /api/admin/dashboard', () => {
      it('토큰 없음 → 401', () => {
        return request(app.getHttpServer())
          .get('/api/admin/dashboard')
          .expect(401);
      });

      it('role=user → 403', () => {
        return request(app.getHttpServer())
          .get('/api/admin/dashboard')
          .set('Cookie', cookieHeader(userCookies))
          .expect(403);
      });

      it('role=admin → 200 with dashboard data', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/dashboard')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as Record<string, unknown>;
        expect(body).toHaveProperty('kpi');
        expect(body).toHaveProperty('revenue_chart');
        expect(body).toHaveProperty('order_status_summary');
        expect(body).toHaveProperty('recent_orders');

        const kpi = body.kpi as Record<string, unknown>;
        expect(kpi).toHaveProperty('today_revenue');
        expect(kpi).toHaveProperty('today_orders');
        expect(kpi).toHaveProperty('new_members_today');
        expect(kpi).toHaveProperty('total_product_views');
      });

      it('기간 필터 적용 (7d)', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/dashboard?period=7d')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as { revenue_chart: Array<{ date: string }> };
        expect(body.revenue_chart.length).toBeGreaterThanOrEqual(7);
      });

      it('커스텀 날짜 범위', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/dashboard?startDate=2026-03-01&endDate=2026-03-10')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as { revenue_chart: Array<{ date: string }> };
        expect(body.revenue_chart.length).toBe(10);
      });

      it('365일 초과 범위 → 400', () => {
        return request(app.getHttpServer())
          .get('/api/admin/dashboard?startDate=2024-01-01&endDate=2026-03-01')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(400);
      });

      it('order_status_summary 구조 검증', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/dashboard')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as { order_status_summary: Record<string, number> };
        const summary = body.order_status_summary;
        expect(summary).toHaveProperty('pending');
        expect(summary).toHaveProperty('paid');
        expect(summary).toHaveProperty('preparing');
        expect(summary).toHaveProperty('shipped');
        expect(summary).toHaveProperty('delivered');
        expect(summary).toHaveProperty('cancelled');
        expect(summary).toHaveProperty('refunded');
      });
    });
  });
}
