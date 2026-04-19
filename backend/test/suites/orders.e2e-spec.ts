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

export function registerOrdersSuite(getApp: () => INestApplication) {
  describe('Orders (e2e)', () => {
    let userACookies: AuthCookies;
    let userBCookies: AuthCookies;
    let productId: number;
    let orderId: number;

    const userAEmail = `orders-user-a-${Date.now()}@test.com`;
    const userBEmail = `orders-user-b-${Date.now()}@test.com`;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Create user A
      await registerAndGetCookies(app, {
        email: userAEmail,
        password: 'Test1234!',
        name: '주문유저A',
      });
      userACookies = await loginAndGetCookies(app, {
        email: userAEmail,
        password: 'Test1234!',
      });

      // Create user B
      await registerAndGetCookies(app, {
        email: userBEmail,
        password: 'Test1234!',
        name: '주문유저B',
      });
      userBCookies = await loginAndGetCookies(app, {
        email: userBEmail,
        password: 'Test1234!',
      });

      // Seed product with stock=5
      const prodResult = await dataSource.query(`
        INSERT INTO products (name, slug, price, sale_price, stock, status)
        VALUES ('주문테스트상품', 'orders-test-product-e2e', 30000, 25000, 5, 'active')
      `);
      productId = (prodResult as { insertId: number }).insertId;

      // Seed option with stock=3
      const optResult = await dataSource.query(
        `INSERT INTO product_options (product_id, name, value, price_adjustment, stock, sort_order)
         VALUES (?, '사이즈', 'M', 0, 3, 0)`,
        [productId],
      );
      void (optResult as { insertId: number }).insertId;
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(`DELETE FROM order_items WHERE product_id = ?`, [productId]);
      await dataSource.query(
        `DELETE FROM orders WHERE user_id IN (
          SELECT id FROM users WHERE email IN (?, ?)
        )`,
        [userAEmail, userBEmail],
      );
      await dataSource.query(`DELETE FROM product_options WHERE product_id = ?`, [productId]);
      await dataSource.query(`DELETE FROM products WHERE slug = 'orders-test-product-e2e'`);
      await dataSource.query(`DELETE FROM users WHERE email IN (?, ?)`, [userAEmail, userBEmail]);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('POST /api/orders', () => {
      it('no JWT → 401', () => {
        return request(app.getHttpServer())
          .post('/api/orders')
          .send({
            items: [{ productId, quantity: 1 }],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
          })
          .expect(401);
      });

      it('valid body → 201, orderNumber matches ORD-YYYYMMDD-XXXXXXXX', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/orders')
          .set('Cookie', cookieHeader(userACookies))
          .send({
            items: [{ productId, quantity: 1 }],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
          })
          .expect(201);

        const body = res.body as { id: number; orderNumber: string; items: unknown[] };
        expect(body.orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9-]{8,9}$/);
        orderId = body.id;
      });

      it('after order: products.stock decreased by quantity', async () => {
        const rows = await dataSource.query(
          `SELECT stock FROM products WHERE id = ?`,
          [productId],
        ) as Array<{ stock: number }>;
        expect(Number(rows[0].stock)).toBe(4); // started at 5, ordered 1
      });

      it('excess quantity → 400', () => {
        return request(app.getHttpServer())
          .post('/api/orders')
          .set('Cookie', cookieHeader(userACookies))
          .send({
            items: [{ productId, quantity: 999 }],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
          })
          .expect(400);
      });

      it('empty items → 400', () => {
        return request(app.getHttpServer())
          .post('/api/orders')
          .set('Cookie', cookieHeader(userACookies))
          .send({
            items: [],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
          })
          .expect(400);
      });
    });

    describe('GET /api/orders', () => {
      it('no JWT → 401', () => {
        return request(app.getHttpServer()).get('/api/orders').expect(401);
      });

      it('user A → 200, includes created order', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/orders')
          .set('Cookie', cookieHeader(userACookies))
          .expect(200);

        const body = res.body as { items: Array<{ id: number }>; total: number };
        expect(body.total).toBeGreaterThanOrEqual(1);
        expect(body.items.some((o) => o.id === orderId)).toBe(true);
      });
    });

    describe('GET /api/orders/:id', () => {
      it('user A → 200, has items array', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/orders/${orderId}`)
          .set('Cookie', cookieHeader(userACookies))
          .expect(200);

        const body = res.body as { id: number; items: unknown[] };
        expect(body.id).toBe(orderId);
        expect(Array.isArray(body.items)).toBe(true);
        expect(body.items.length).toBeGreaterThanOrEqual(1);
      });

      it('user B for user A order → 403', () => {
        return request(app.getHttpServer())
          .get(`/api/orders/${orderId}`)
          .set('Cookie', cookieHeader(userBCookies))
          .expect(403);
      });

      it('non-existent id → 404', () => {
        return request(app.getHttpServer())
          .get('/api/orders/999999')
          .set('Cookie', cookieHeader(userACookies))
          .expect(404);
      });
    });
  });
}
