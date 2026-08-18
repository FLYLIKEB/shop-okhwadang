import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { e2eIdempotencyKey } from '../helpers/idempotency.helper';
import { currentPolicyConsents } from '../helpers/policy-consent.helper';

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
    let productOptionId: number;
    let guestProductId: number;
    let orderId: number;
    let guestOrderId: number;
    let guestOrderNumber: string;
    let guestAccessToken: string;
    let previousGuestAccessToken: string;
    let guestAccessTokenExpiresAt: string;

    const userAEmail = `orders-user-a-${Date.now()}@test.com`;
    const userBEmail = `orders-user-b-${Date.now()}@test.com`;
    const guestEmail = `guest-orders-${Date.now()}@test.com`;
    const throttleGuestCreateEmail = `guest-orders-create-throttle-${Date.now()}@test.com`;
    const throttleGuestLookupEmail = `guest-orders-lookup-throttle-${Date.now()}@test.com`;


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
      productOptionId = (optResult as { insertId: number }).insertId;

      const guestProductResult = await dataSource.query(`
        INSERT INTO products (name, name_en, slug, price, sale_price, stock, status, is_visible_en)
        VALUES ('비회원주문테스트상품', 'Guest Order Test Product', 'guest-orders-test-product-e2e', 18000, NULL, 10, 'active', 1)
      `);
      guestProductId = (guestProductResult as { insertId: number }).insertId;
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(`DELETE FROM order_items WHERE product_id IN (?, ?)`, [productId, guestProductId]);
      await dataSource.query(
        `DELETE FROM guest_order_access WHERE order_id IN (
          SELECT id FROM orders WHERE guest_email_normalized IN (?, ?, ?)
        )`,
        [guestEmail, throttleGuestCreateEmail, throttleGuestLookupEmail],
      );
      await dataSource.query(
        `DELETE FROM orders WHERE user_id IN (
          SELECT id FROM users WHERE email IN (?, ?)
        ) OR guest_email_normalized IN (?, ?, ?)`,
        [userAEmail, userBEmail, guestEmail, throttleGuestCreateEmail, throttleGuestLookupEmail],
      );
      await dataSource.query(`DELETE FROM product_options WHERE product_id = ?`, [productId]);
      await dataSource.query(`DELETE FROM products WHERE slug IN ('orders-test-product-e2e', 'guest-orders-test-product-e2e')`);
      await dataSource.query(`DELETE FROM users WHERE email IN (?, ?)`, [userAEmail, userBEmail]);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');


    });

    describe('POST /api/orders', () => {
      it('no JWT → 401', () => {
        return request(app.getHttpServer())
          .post('/api/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('order'))
          .send({
            items: [{ productId, quantity: 1 }],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
            orderLocale: 'ko',
          })
          .expect(401);
      });

      it('missing Idempotency-Key → 400', () => {
        return request(app.getHttpServer()).post('/api/orders')
          .set('Cookie', cookieHeader(userACookies))
          .send({ items: [{ productId, quantity: 1 }], recipientName: '홍길동', recipientPhone: '010-1234-5678', zipcode: '12345', address: '서울시 강남구' })
          .expect(400);
      });

      it('valid body → 201, orderNumber matches ORD-YYYYMMDD-XXXXX', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('order'))
          .set('Cookie', cookieHeader(userACookies))
          .send({
            items: [{ productId, quantity: 1 }],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
            orderLocale: 'en',
            policyConsents: currentPolicyConsents,
          })
          .expect(201);

        const body = res.body as { id: number; orderNumber: string; items: unknown[] };
        expect(body.orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{5}$/);
        orderId = body.id;

        const orderRow = await dataSource.query(
          `SELECT order_locale AS orderLocale FROM orders WHERE id = ?`,
          [orderId],
        ) as Array<{ orderLocale: 'ko' | 'en' }>;
        expect(orderRow[0]?.orderLocale).toBe('en');
      });

      it('after order: products.stock decreased by quantity', async () => {
        const rows = await dataSource.query(
          `SELECT stock FROM products WHERE id = ?`,
          [productId],
        ) as Array<{ stock: number }>;
        expect(Number(rows[0].stock)).toBe(4); // started at 5, ordered 1
      });

      it('same member key replays and changed payload conflicts', async () => {
        const key = e2eIdempotencyKey('member-replay');
        const payload = { items: [{ productId, quantity: 1 }], recipientName: '홍길동', recipientPhone: '010-1234-5678', zipcode: '12345', address: '서울시 강남구', orderLocale: 'ko', policyConsents: currentPolicyConsents };
        const first = await request(app.getHttpServer()).post('/api/orders').set('Cookie', cookieHeader(userACookies)).set('Idempotency-Key', key).send(payload).expect(201);
        const replay = await request(app.getHttpServer()).post('/api/orders').set('Cookie', cookieHeader(userACookies)).set('Idempotency-Key', key).send(payload).expect(201);
        expect(replay.body.id).toBe(first.body.id);
        await request(app.getHttpServer()).post('/api/orders').set('Cookie', cookieHeader(userACookies)).set('Idempotency-Key', key).send({ ...payload, memo: 'changed' }).expect(409);
      });

      it('option order: only option stock is decremented (product stock unchanged) — #723', async () => {
        // 정책 (#723): 옵션이 있는 상품은 옵션 재고만 원장으로 차감.
        // 상품 총 재고는 옵션 합산 집계가 아닌 무옵션 전용 원장이므로 옵션 주문 시 변하지 않는다.
        const productStockBefore = await dataSource.query(
          `SELECT stock FROM products WHERE id = ?`,
          [productId],
        ) as Array<{ stock: number }>;
        const stockBefore = Number(productStockBefore[0].stock);

        await request(app.getHttpServer())
          .post('/api/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('order'))
          .set('Cookie', cookieHeader(userACookies))
          .send({
            items: [{ productId, productOptionId, quantity: 2 }],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
            orderLocale: 'ko',
            policyConsents: currentPolicyConsents,
          })
          .expect(201);

        const products = await dataSource.query(
          `SELECT stock FROM products WHERE id = ?`,
          [productId],
        ) as Array<{ stock: number }>;
        const options = await dataSource.query(
          `SELECT stock FROM product_options WHERE id = ?`,
          [productOptionId],
        ) as Array<{ stock: number }>;

        expect(Number(products[0].stock)).toBe(stockBefore);
        expect(Number(options[0].stock)).toBe(1);
      });

      it('option excess quantity → 400', () => {
        return request(app.getHttpServer())
          .post('/api/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('order'))
          .set('Cookie', cookieHeader(userACookies))
          .send({
            items: [{ productId, productOptionId, quantity: 2 }],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
            orderLocale: 'ko',
          })
          .expect(400);
      });

      it('excess quantity → 400', () => {
        return request(app.getHttpServer())
          .post('/api/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('order'))
          .set('Cookie', cookieHeader(userACookies))
          .send({
            items: [{ productId, quantity: 999 }],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
            orderLocale: 'ko',
          })
          .expect(400);
      });

      it('insufficient points → 400', () => {
        return request(app.getHttpServer())
          .post('/api/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('order'))
          .set('Cookie', cookieHeader(userACookies))
          .send({
            items: [{ productId, quantity: 1 }],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
            orderLocale: 'ko',
            pointsUsed: 1,
          })
          .expect(400);
      });

      it('empty items → 400', () => {
        return request(app.getHttpServer())
          .post('/api/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('order'))
          .set('Cookie', cookieHeader(userACookies))
          .send({
            items: [],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
            orderLocale: 'ko',
          })
          .expect(400);
      });
    });

    describe('Guest orders', () => {
      it('missing Idempotency-Key → 400', () => {
        return request(app.getHttpServer()).post('/api/guest/orders')
          .send({ items: [{ productId: guestProductId, quantity: 1 }], guestEmail, recipientName: '비회원 주문자', recipientPhone: '010-9999-0000', zipcode: '54321', address: '서울시 마포구', orderLocale: 'ko' })
          .expect(400);
      });

      it('same guest key replays and changed payload conflicts', async () => {
        const key = e2eIdempotencyKey('guest-replay');
        const payload = { items: [{ productId: guestProductId, quantity: 1 }], guestEmail, recipientName: '비회원 주문자', recipientPhone: '010-9999-0000', zipcode: '54321', address: '서울시 마포구', orderLocale: 'ko', policyConsents: currentPolicyConsents };
        const first = await request(app.getHttpServer()).post('/api/guest/orders').set('Idempotency-Key', key).send(payload).expect(201);
        const replay = await request(app.getHttpServer()).post('/api/guest/orders').set('Idempotency-Key', key).send(payload).expect(201);
        expect(replay.body.order.id).toBe(first.body.order.id);
        await request(app.getHttpServer()).post('/api/guest/orders').set('Idempotency-Key', key).send({ ...payload, memo: 'changed' }).expect(409);
      });
      it('guest create returns top-level token, expiry, and guest-safe order fields', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/guest/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('guest-order'))
          .send({
            items: [{ productId: guestProductId, quantity: 1 }],
            guestEmail: `  ${guestEmail.toUpperCase()}  `,
            recipientName: '비회원 주문자',
            recipientPhone: '010-9999-0000',
            zipcode: '54321',
            address: '서울시 마포구',
            addressDetail: '202호',
            memo: '경비실에 맡겨주세요',
            orderLocale: 'en',
            policyConsents: [
              ...currentPolicyConsents,
            ],
            marketingConsent: true,
          })
          .expect(201);

        const body = res.body as {
          order: {
            id: number;
            orderNumber: string;
            userId: number | null;
            guestEmailNormalized: string | null;
            orderLocale: 'ko' | 'en';
            pointsUsed: number;
            discountAmount: number;
            items: unknown[];
          };
          guestAccessToken: string;
          guestAccessTokenExpiresAt: string;
        };

        expect(body.order.orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{5}$/);
        expect(body.order.userId).toBeNull();
        expect(body.order.guestEmailNormalized).toBe(guestEmail);
        expect(body.order.orderLocale).toBe('en');
        expect(body.order.pointsUsed).toBe(0);
        expect(Number(body.order.discountAmount)).toBe(0);
        expect(Array.isArray(body.order.items)).toBe(true);
        expect(body.guestAccessToken).toMatch(/^[a-f0-9]{64}$/);
        expect(typeof body.guestAccessTokenExpiresAt).toBe('string');

        guestOrderId = body.order.id;
        guestOrderNumber = body.order.orderNumber;
        guestAccessToken = body.guestAccessToken;
        guestAccessTokenExpiresAt = body.guestAccessTokenExpiresAt;
      });

      it('guest create rejects crafted member-only discount fields', () => {
        return request(app.getHttpServer())
          .post('/api/guest/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('guest-order'))
          .send({
            items: [{ productId: guestProductId, quantity: 1 }],
            guestEmail,
            recipientName: '비회원 주문자',
            recipientPhone: '010-9999-0000',
            zipcode: '54321',
            address: '서울시 마포구',
            orderLocale: 'en',
            policyConsents: currentPolicyConsents,
            pointsUsed: 1000,
            userCouponId: 1,
          })
          .expect(400);
      });

      it('guest detail requires X-Guest-Access-Token', () => {
        return request(app.getHttpServer())
          .get(`/api/guest/orders/${guestOrderId}`)
          .expect(401);
      });

      it('guest detail accepts locale=en and localizes the order response', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/guest/orders/${guestOrderId}`)
          .set('X-Guest-Access-Token', guestAccessToken)
          .query({ locale: 'en' })
          .expect(200);

        const body = res.body as {
          id: number;
          items: Array<{ productName?: string; product?: { name?: string } }>;
        };
        const item = body.items[0];

        expect(body.id).toBe(guestOrderId);
        expect(item).toBeDefined();
        expect(item.productName ?? item.product?.name).toBe('Guest Order Test Product');
      });

      it('guest lookup returns rotated top-level token and localized order response', async () => {
        previousGuestAccessToken = guestAccessToken;
        const res = await request(app.getHttpServer())
          .post('/api/guest/orders/lookup')
          .send({
            orderNumber: guestOrderNumber,
            email: guestEmail,
            locale: 'en',
          })
          .expect(200);

        const body = res.body as {
          order: {
            id: number;
            items: Array<{ productName?: string; product?: { name?: string } }>;
          };
          guestAccessToken: string;
          guestAccessTokenExpiresAt: string;
        };

        expect(body.order.id).toBe(guestOrderId);
        expect(body.guestAccessToken).toMatch(/^[a-f0-9]{64}$/);
        expect(body.guestAccessToken).not.toBe(previousGuestAccessToken);
        expect(typeof body.guestAccessTokenExpiresAt).toBe('string');
        expect(body.order.items[0].productName ?? body.order.items[0].product?.name).toBe('Guest Order Test Product');

        guestAccessToken = body.guestAccessToken;
        guestAccessTokenExpiresAt = body.guestAccessTokenExpiresAt;
      });

      it('guest lookup supersedes the prior token for detail access', async () => {
        await request(app.getHttpServer())
          .get(`/api/guest/orders/${guestOrderId}`)
          .set('X-Guest-Access-Token', guestAccessToken)
          .query({ locale: 'en' })
          .expect(200);

        await request(app.getHttpServer())
          .get(`/api/guest/orders/${guestOrderId}`)
          .set('X-Guest-Access-Token', previousGuestAccessToken)
          .expect(401);

        expect(typeof guestAccessTokenExpiresAt).toBe('string');
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
