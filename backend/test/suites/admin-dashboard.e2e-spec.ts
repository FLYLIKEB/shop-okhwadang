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
    const fixtureStamp = Date.now();
    const fixtureUserEmails = [
      `dash-current-${fixtureStamp}@test.com`,
      `dash-previous-${fixtureStamp}@test.com`,
    ];
    const fixtureOrderNumbers = [
      `ORD-DASH-${fixtureStamp}-IN-1`,
      `ORD-DASH-${fixtureStamp}-IN-2`,
      `ORD-DASH-${fixtureStamp}-CANCELLED`,
      `ORD-DASH-${fixtureStamp}-PREVIOUS`,
      `ORD-DASH-${fixtureStamp}-NEXT-DAY`,
    ];

    let adminCookies: AuthCookies;
    let userCookies: AuthCookies;
    let adminUserId: number;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      await registerAndGetCookies(app, { email: adminEmail, password, name });

      await dataSource.query(
        `UPDATE users SET role = 'admin' WHERE email = ?`,
        [adminEmail],
      );
      const adminRows = await dataSource.query(
        `SELECT id FROM users WHERE email = ?`,
        [adminEmail],
      ) as Array<{ id: number }>;
      adminUserId = Number(adminRows[0].id);

      adminCookies = await loginAndGetCookies(app, { email: adminEmail, password });

      const userReg = await registerAndGetCookies(app, {
        email: userEmail,
        password,
        name: '일반사용자',
      });
      userCookies = userReg.cookies;

      await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES
           (?, NULL, '대시보드현재회원', 'user', 1, 0, 1, '2099-01-10 00:00:00', '2099-01-10 00:00:00', '2099-01-10 00:00:00'),
           (?, NULL, '대시보드이전회원', 'user', 1, 0, 1, '2099-01-09 00:00:00', '2099-01-09 00:00:00', '2099-01-09 00:00:00')`,
        fixtureUserEmails,
      );
      await dataSource.query(
        `INSERT INTO orders (user_id, order_number, order_locale, status, total_amount, recipient_name, recipient_phone, zipcode, address, created_at, updated_at)
         VALUES
           (?, ?, 'ko', 'paid', 1000, '대시보드', '010-0000-0000', '12345', '서울시 테스트구', '2099-01-10 00:00:00.000', '2099-01-10 00:00:00.000'),
           (?, ?, 'ko', 'delivered', 2000, '대시보드', '010-0000-0000', '12345', '서울시 테스트구', '2099-01-11 23:59:59.999999', '2099-01-11 23:59:59.999999'),
           (?, ?, 'ko', 'cancelled', 9999, '대시보드', '010-0000-0000', '12345', '서울시 테스트구', '2099-01-11 12:00:00.000', '2099-01-11 12:00:00.000'),
           (?, ?, 'ko', 'paid', 5000, '대시보드', '010-0000-0000', '12345', '서울시 테스트구', '2099-01-09 23:59:59.999999', '2099-01-09 23:59:59.999999'),
           (?, ?, 'ko', 'paid', 7000, '대시보드', '010-0000-0000', '12345', '서울시 테스트구', '2099-01-12 00:00:00.000', '2099-01-12 00:00:00.000')`,
        [
          adminUserId,
          fixtureOrderNumbers[0],
          adminUserId,
          fixtureOrderNumbers[1],
          adminUserId,
          fixtureOrderNumbers[2],
          adminUserId,
          fixtureOrderNumbers[3],
          adminUserId,
          fixtureOrderNumbers[4],
        ],
      );
    });

    afterAll(async () => {
      await dataSource.query(
        `DELETE FROM orders WHERE order_number IN (?, ?, ?, ?, ?)`,
        fixtureOrderNumbers,
      );
      await dataSource.query('DELETE FROM users WHERE email IN (?, ?)', [
        adminEmail,
        userEmail,
      ]);
      await dataSource.query('DELETE FROM users WHERE email IN (?, ?)', fixtureUserEmails);
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

      it('커스텀 날짜 범위를 KPI, 차트, 상태, 최근 주문에 공통 적용', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/dashboard?startDate=2099-01-10&endDate=2099-01-11')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as {
          kpi: {
            today_revenue: number;
            today_revenue_diff_pct: number;
            today_orders: number;
            today_orders_diff_pct: number;
            new_members_today: number;
            new_members_diff_pct: number;
          };
          revenue_chart: Array<{ date: string; revenue: number; order_count: number }>;
          order_status_summary: Record<string, number>;
          recent_orders: Array<{ order_number: string }>;
        };

        expect(body.kpi.today_revenue).toBe(3000);
        expect(body.kpi.today_revenue_diff_pct).toBe(-40);
        expect(body.kpi.today_orders).toBe(2);
        expect(body.kpi.today_orders_diff_pct).toBe(100);
        expect(body.kpi.new_members_today).toBe(1);
        expect(body.kpi.new_members_diff_pct).toBe(0);
        expect(body.revenue_chart).toEqual([
          { date: '2099-01-10', revenue: 1000, order_count: 1 },
          { date: '2099-01-11', revenue: 2000, order_count: 1 },
        ]);
        expect(body.order_status_summary.paid).toBe(1);
        expect(body.order_status_summary.delivered).toBe(1);
        expect(body.order_status_summary.cancelled).toBe(1);
        expect(body.recent_orders.map((order) => order.order_number)).toEqual([
          fixtureOrderNumbers[1],
          fixtureOrderNumbers[2],
          fixtureOrderNumbers[0],
        ]);
      });

      it('날짜 필터는 UTC 일 경계를 포함하고 외부 주문을 제외', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/dashboard?startDate=2099-01-11&endDate=2099-01-11')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as {
          kpi: { today_revenue: number; today_orders: number };
          revenue_chart: Array<{ date: string; revenue: number; order_count: number }>;
          recent_orders: Array<{ order_number: string }>;
        };

        expect(body.kpi.today_revenue).toBe(2000);
        expect(body.kpi.today_orders).toBe(1);
        expect(body.revenue_chart).toEqual([
          { date: '2099-01-11', revenue: 2000, order_count: 1 },
        ]);
        expect(body.recent_orders.map((order) => order.order_number)).toEqual([
          fixtureOrderNumbers[1],
          fixtureOrderNumbers[2],
        ]);
      });

      it('365일 초과 범위 → 400', () => {
        return request(app.getHttpServer())
          .get('/api/admin/dashboard?startDate=2024-01-01&endDate=2026-03-01')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(400);
      });

      it.each([
        '/api/admin/dashboard?startDate=2099-01-10',
        '/api/admin/dashboard?startDate=2099-02-30&endDate=2099-03-01',
        '/api/admin/dashboard?startDate=2099-01-10T00:00:00.000Z&endDate=2099-01-11',
        '/api/admin/dashboard?period=week',
      ])('잘못된 기간 입력 → 400 (%s)', (url) => {
        return request(app.getHttpServer())
          .get(url)
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
