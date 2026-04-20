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

export function registerRefundsSuite(getApp: () => INestApplication) {
  describe('Refunds (e2e)', () => {
    let adminCookies: AuthCookies;
    let userCookies: AuthCookies;
    let productId: number;
    let orderId: number;
    let orderAmount: number;

    const adminEmail = `refunds-admin-${Date.now()}@test.com`;
    const userEmail = `refunds-user-${Date.now()}@test.com`;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Register & promote admin
      await registerAndGetCookies(app, {
        email: adminEmail,
        password: 'Test1234!',
        name: '환불관리자',
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
        name: '결제유저',
      });
      userCookies = await loginAndGetCookies(app, {
        email: userEmail,
        password: 'Test1234!',
      });

      // Seed product
      const prodResult = await dataSource.query(`
        INSERT INTO products (name, slug, price, sale_price, stock, status)
        VALUES ('환불테스트상품', 'refunds-test-product-e2e', 30000, 30000, 10, 'active')
      `);
      productId = (prodResult as { insertId: number }).insertId;

      // Create order
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Cookie', cookieHeader(userCookies))
        .send({
          items: [{ productId, quantity: 1 }],
          recipientName: '홍길동',
          recipientPhone: '010-1234-5678',
          zipcode: '12345',
          address: '서울시 강남구',
        })
        .expect(201);
      orderId = Number((orderRes.body as { id: number }).id);
      orderAmount = Number((orderRes.body as { totalAmount: number | string }).totalAmount);

      // Prepare payment
      await request(app.getHttpServer())
        .post('/api/payments/prepare')
        .set('Cookie', cookieHeader(userCookies))
        .send({ orderId });

      // Confirm payment (mock)
      await request(app.getHttpServer())
        .post('/api/payments/confirm')
        .set('Cookie', cookieHeader(userCookies))
        .send({ orderId, paymentKey: 'pay_mock_refund_test', amount: orderAmount })
        .expect((r) => {
          if (r.status !== 200 && r.status !== 201)
            throw new Error(`Confirm failed: ${r.status} ${JSON.stringify(r.body)}`);
        });
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(`DELETE FROM refunds WHERE payment_id IN (SELECT id FROM payments WHERE order_id = ?)`, [orderId]);
      await dataSource.query(`DELETE FROM shipping WHERE order_id = ?`, [orderId]);
      await dataSource.query(`DELETE FROM payments WHERE order_id = ?`, [orderId]);
      await dataSource.query(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);
      await dataSource.query(`DELETE FROM orders WHERE id = ?`, [orderId]);
      await dataSource.query(`DELETE FROM products WHERE id = ?`, [productId]);
      await dataSource.query(`DELETE FROM users WHERE email IN (?, ?)`, [adminEmail, userEmail]);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('POST /api/admin/orders/:id/refunds', () => {
      it('일반 사용자 → 403', async () => {
        return request(app.getHttpServer())
          .post(`/api/admin/orders/${orderId}/refunds`)
          .set('Cookie', cookieHeader(userCookies))
          .send({ amount: 10000, reason: '테스트 환불' })
          .expect(403);
      });

      it('인증 없음 → 401', async () => {
        return request(app.getHttpServer())
          .post(`/api/admin/orders/${orderId}/refunds`)
          .send({ amount: 10000, reason: '테스트 환불' })
          .expect(401);
      });

      it('관리자 → 부분 환불 → 201, Refund 반환', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/admin/orders/${orderId}/refunds`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ amount: 10000, reason: '부분 환불 테스트' })
          .expect((r) => {
            if (r.status !== 200 && r.status !== 201)
              throw new Error(`Expected 201 got ${r.status}: ${JSON.stringify(r.body)}`);
          });

        const body = res.body as {
          id: number;
          amount: number;
          status: string;
          reason: string;
        };
        expect(body.id).toBeDefined();
        expect(Number(body.amount)).toBe(10000);
        expect(body.status).toBe('completed');
        expect(body.reason).toBe('부분 환불 테스트');
      });

      it('환불 금액 초과 → 400', async () => {
        return request(app.getHttpServer())
          .post(`/api/admin/orders/${orderId}/refunds`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ amount: 99999, reason: '초과 환불' })
          .expect(400);
      });

      it('존재하지 않는 주문 → 400', async () => {
        return request(app.getHttpServer())
          .post(`/api/admin/orders/999999999/refunds`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ amount: 1000, reason: '없는 주문' })
          .expect(400);
      });
    });
  });
}
