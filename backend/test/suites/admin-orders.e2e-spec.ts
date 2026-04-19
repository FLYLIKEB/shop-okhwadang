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

export function registerAdminOrdersSuite(getApp: () => INestApplication) {
  describe('Admin Orders (e2e)', () => {
    let adminCookies: AuthCookies;
    let userCookies: AuthCookies;
    let orderId: number;
    let refundOrderId: number;
    let productId: number;

    const adminEmail = `admin-orders-admin-${Date.now()}@test.com`;
    const userEmail = `admin-orders-user-${Date.now()}@test.com`;

    async function createOrder(): Promise<number> {
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Cookie', cookieHeader(userCookies))
        .send({
          items: [{ productId, quantity: 1 }],
          recipientName: '테스트',
          recipientPhone: '010-1234-5678',
          zipcode: '12345',
          address: '서울시 강남구',
        });
      return (orderRes.body as { id: number }).id;
    }

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Register admin
      await registerAndGetCookies(app, {
        email: adminEmail,
        password: 'Test1234!',
        name: '주문관리자',
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
        name: '일반유저',
      });
      userCookies = await loginAndGetCookies(app, {
        email: userEmail,
        password: 'Test1234!',
      });

      // Create product for order
      const slug = `admin-orders-test-product-${Date.now()}`;
      const productRes = await request(app.getHttpServer())
        .post('/api/products')
        .set('Cookie', cookieHeader(adminCookies))
        .send({ name: '주문테스트상품', slug, price: 10000, stock: 100, status: 'active' });
      productId = (productRes.body as { id: number }).id;

      orderId = await createOrder();
      refundOrderId = await createOrder();
    });

    describe('GET /api/admin/orders', () => {
      it('admin → 200 주문 목록 조회', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/orders')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as { items: unknown[]; total: number; page: number; limit: number };
        expect(body.items).toBeDefined();
        expect(body.total).toBeGreaterThanOrEqual(1);
        expect(body.page).toBe(1);
      });

      it('일반 user → 403 거부', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/orders')
          .set('Cookie', cookieHeader(userCookies))
          .expect(403);
      });

      it('비인증 → 401', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/orders')
          .expect(401);
      });

      it('상태 필터 → 200', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/orders?status=pending')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as { items: { status: string }[] };
        for (const item of body.items) {
          expect(item.status).toBe('pending');
        }
      });
    });

    describe('PATCH /api/admin/orders/:id', () => {
      it('pending → paid 상태 변경', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'paid' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('paid');
      });

      it('paid → preparing 상태 변경', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'preparing' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('preparing');
      });

      it('preparing → shipped: 운송장 없으면 400', async () => {
        await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'shipped' })
          .expect(400);
      });

      it('허용되지 않은 전이 → 400', async () => {
        // preparing → pending is not allowed
        await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'pending' })
          .expect(400);
      });

      it('일반 user → 403', async () => {
        await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Cookie', cookieHeader(userCookies))
          .send({ status: 'paid' })
          .expect(403);
      });
    });

    describe('POST /api/admin/shipping/:orderId', () => {
      it('운송장 등록 → 201', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/admin/shipping/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ carrier: 'cj', trackingNumber: `TRK-${Date.now()}` })
          .expect(201);

        const body = res.body as { carrier: string; trackingNumber: string };
        expect(body.carrier).toBe('cj');
        expect(body.trackingNumber).toBeDefined();
      });

      it('운송장 중복 등록 → 409', async () => {
        await request(app.getHttpServer())
          .post(`/api/admin/shipping/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ carrier: 'cj', trackingNumber: `TRK-DUP-${Date.now()}` })
          .expect(409);
      });

      it('일반 user → 403', async () => {
        await request(app.getHttpServer())
          .post(`/api/admin/shipping/${orderId}`)
          .set('Cookie', cookieHeader(userCookies))
          .send({ carrier: 'cj', trackingNumber: 'TRK-USER' })
          .expect(403);
      });
    });

    describe('delivered → completed flow', () => {
      it('preparing → shipped (운송장 등록 후)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'shipped' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('shipped');
      });

      it('shipped → delivered', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'delivered' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('delivered');
      });

      it('delivered → completed', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'completed' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('completed');
      });

      it('completed → paid: 전이 불가', async () => {
        await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'paid' })
          .expect(400);
      });
    });

    describe('delivered → refund_requested → refunded flow', () => {
      it('refund order 운송장 등록 → 201', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/admin/shipping/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ carrier: 'cj', trackingNumber: `TRK-REFUND-${Date.now()}` })
          .expect(201);

        const body = res.body as { carrier: string; trackingNumber: string };
        expect(body.carrier).toBe('cj');
        expect(body.trackingNumber).toBeDefined();
      });

      it('refund order pending → paid', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'paid' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('paid');
      });

      it('refund order paid → preparing', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'preparing' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('preparing');
      });

      it('refund order preparing → shipped', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'shipped' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('shipped');
      });

      it('refund order shipped → delivered', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'delivered' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('delivered');
      });

      it('refund order delivered → refund_requested', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'refund_requested' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('refund_requested');
      });

      it('refund_requested → refunded', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'refunded' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('refunded');
      });
    });
  });
}
