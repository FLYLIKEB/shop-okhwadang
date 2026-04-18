import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  AuthCookies,
  cookieHeader,
  loginAndGetCookies,
} from '../helpers/auth-cookie.helper';

let app: INestApplication;
let dataSource: DataSource;

export function registerShippingSuite(getApp: () => INestApplication) {
  describe('Shipping (e2e)', () => {
    let userCookies: AuthCookies;
    let otherCookies: AuthCookies;
    let adminCookies: AuthCookies;
    let orderId: number;
    let productId: number;

    const userEmail = `shipping-user-${Date.now()}@test.com`;
    const otherEmail = `shipping-other-${Date.now()}@test.com`;
    const adminEmail = `shipping-admin-${Date.now()}@test.com`;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Create users
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: userEmail, password: 'Test1234!', name: '배송유저' });

      userCookies = await loginAndGetCookies(app, {
        email: userEmail,
        password: 'Test1234!',
      });

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: otherEmail, password: 'Test1234!', name: '다른유저' });
      otherCookies = await loginAndGetCookies(app, {
        email: otherEmail,
        password: 'Test1234!',
      });

      // Create admin user
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: adminEmail, password: 'Test1234!', name: '관리자' });
      await dataSource.query(
        `UPDATE users SET role = 'admin' WHERE email = ?`,
        [adminEmail],
      );
      adminCookies = await loginAndGetCookies(app, {
        email: adminEmail,
        password: 'Test1234!',
      });

      // Seed product
      const prodResult = await dataSource.query(`
        INSERT INTO products (name, slug, price, sale_price, stock, status)
        VALUES ('배송테스트상품', 'shipping-test-product-e2e-${Date.now()}', 10000, 10000, 10, 'active')
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
        });
      if (orderRes.status !== 201) throw new Error(`Create order failed: ${orderRes.status} ${JSON.stringify(orderRes.body)}`);
      orderId = Number((orderRes.body as { id: number }).id);

      // Confirm payment to auto-create shipping record
      await request(app.getHttpServer())
        .post('/api/payments/prepare')
        .set('Cookie', cookieHeader(userCookies))
        .send({ orderId });

      await request(app.getHttpServer())
        .post('/api/payments/confirm')
        .set('Cookie', cookieHeader(userCookies))
        .send({ orderId, paymentKey: 'mock_key_123', amount: 10000 });
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(`DELETE FROM shipping WHERE order_id = ?`, [orderId]);
      await dataSource.query(`DELETE FROM payments WHERE order_id = ?`, [orderId]);
      await dataSource.query(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);
      await dataSource.query(`DELETE FROM orders WHERE id = ?`, [orderId]);
      await dataSource.query(`DELETE FROM products WHERE id = ?`, [productId]);
      await dataSource.query(
        `DELETE FROM users WHERE email IN (?, ?, ?)`,
        [userEmail, otherEmail, adminEmail],
      );
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('GET /api/shipping/:orderId', () => {
      it('no JWT → 401', () => {
        return request(app.getHttpServer())
          .get(`/api/shipping/${orderId}`)
          .expect(401);
      });

      it('타인의 orderId → 403 FORBIDDEN', () => {
        return request(app.getHttpServer())
          .get(`/api/shipping/${orderId}`)
          .set('Cookie', cookieHeader(otherCookies))
          .expect(403);
      });

      it('존재하지 않는 orderId → 404', () => {
        return request(app.getHttpServer())
          .get('/api/shipping/99999999')
          .set('Cookie', cookieHeader(userCookies))
          .expect(404);
      });

      it('valid JWT + 본인 orderId → 200, shipping 정보 반환', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/shipping/${orderId}`)
          .set('Cookie', cookieHeader(userCookies))
          .expect(200);

        const body = res.body as {
          order_id: number;
          status: string;
          carrier: string;
          tracking_number: null;
        };
        expect(body.order_id).toBe(orderId);
        expect(body.status).toBe('payment_confirmed');
        expect(body.carrier).toBe('mock');
        expect(body.tracking_number).toBeNull();
      });
    });

    describe('POST /api/shipping/track', () => {
      it('no JWT → 401', () => {
        return request(app.getHttpServer())
          .post('/api/shipping/track')
          .send({ carrier: 'mock', trackingNumber: '123' })
          .expect(401);
      });

      it('유효한 carrier + trackingNumber → 200, steps 배열', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/shipping/track')
          .set('Cookie', cookieHeader(userCookies))
          .send({ carrier: 'mock', trackingNumber: '1234567890123' })
          .expect(201);

        const body = res.body as { carrier: string; steps: unknown[] };
        expect(body.carrier).toBe('mock');
        expect(Array.isArray(body.steps)).toBe(true);
        expect(body.steps.length).toBeGreaterThan(0);
      });

      it('지원하지 않는 carrier → 400', () => {
        return request(app.getHttpServer())
          .post('/api/shipping/track')
          .set('Cookie', cookieHeader(userCookies))
          .send({ carrier: 'unknown_carrier', trackingNumber: '123' })
          .expect(400);
      });
    });

    describe('POST /api/admin/shipping/:orderId', () => {
      it('일반 사용자 → 403', () => {
        return request(app.getHttpServer())
          .post(`/api/admin/shipping/${orderId}`)
          .set('Cookie', cookieHeader(userCookies))
          .send({ carrier: 'mock', trackingNumber: 'TRACK001' })
          .expect(403);
      });

      it('admin → 200, tracking_number 업데이트', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/admin/shipping/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ carrier: 'mock', trackingNumber: 'TRACK001' })
          .expect(201);

        const body = res.body as { tracking_number?: string; trackingNumber?: string; status: string };
        const trackingNumber = body.tracking_number ?? body.trackingNumber;
        expect(trackingNumber).toBe('TRACK001');
        expect(body.status).toBe('preparing');
      });
    });
  });
}
