import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

let app: INestApplication;
let dataSource: DataSource;

export function registerAdminOrdersSuite(getApp: () => INestApplication) {
  describe('Admin Orders (e2e)', () => {
    let adminToken: string;
    let userToken: string;
    let userId: number;
    let orderId: number;

    const adminEmail = `admin-orders-admin-${Date.now()}@test.com`;
    const userEmail = `admin-orders-user-${Date.now()}@test.com`;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Register admin
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: adminEmail, password: 'Test1234!', name: '주문관리자' });
      await dataSource.query(`UPDATE users SET role = 'admin' WHERE email = ?`, [adminEmail]);
      const adminRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminEmail, password: 'Test1234!' });
      adminToken = (adminRes.body as { accessToken: string }).accessToken;

      // Register user
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: userEmail, password: 'Test1234!', name: '일반유저' });
      const userRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: userEmail, password: 'Test1234!' });
      userToken = (userRes.body as { accessToken: string }).accessToken;
      const userProfile = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);
      userId = (userProfile.body as { id: number }).id;

      // Create product for order
      const slug = `admin-orders-test-product-${Date.now()}`;
      const productRes = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '주문테스트상품', slug, price: 10000, stock: 100, status: 'active' });
      const productId = (productRes.body as { id: number }).id;

      // Create order
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{ productId, quantity: 1 }],
          recipientName: '테스트',
          recipientPhone: '010-1234-5678',
          zipcode: '12345',
          address: '서울시 강남구',
        });
      orderId = (orderRes.body as { id: number }).id;
    });

    describe('GET /api/admin/orders', () => {
      it('admin → 200 주문 목록 조회', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        const body = res.body as { items: unknown[]; total: number; page: number; limit: number };
        expect(body.items).toBeDefined();
        expect(body.total).toBeGreaterThanOrEqual(1);
        expect(body.page).toBe(1);
      });

      it('일반 user → 403 거부', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/orders')
          .set('Authorization', `Bearer ${userToken}`)
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
          .set('Authorization', `Bearer ${adminToken}`)
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
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'paid' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('paid');
      });

      it('paid → preparing 상태 변경', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'preparing' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('preparing');
      });

      it('preparing → shipped: 운송장 없으면 400', async () => {
        await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'shipped' })
          .expect(400);
      });

      it('허용되지 않은 전이 → 400', async () => {
        // preparing → pending is not allowed
        await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'pending' })
          .expect(400);
      });

      it('일반 user → 403', async () => {
        await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ status: 'paid' })
          .expect(403);
      });
    });

    describe('POST /api/admin/shipping/:orderId', () => {
      it('운송장 등록 → 201', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/admin/shipping/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ carrier: 'cj', trackingNumber: `TRK-${Date.now()}` })
          .expect(201);

        const body = res.body as { carrier: string; trackingNumber: string };
        expect(body.carrier).toBe('cj');
        expect(body.trackingNumber).toBeDefined();
      });

      it('운송장 중복 등록 → 409', async () => {
        await request(app.getHttpServer())
          .post(`/api/admin/shipping/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ carrier: 'cj', trackingNumber: `TRK-DUP-${Date.now()}` })
          .expect(409);
      });

      it('일반 user → 403', async () => {
        await request(app.getHttpServer())
          .post(`/api/admin/shipping/${orderId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ carrier: 'cj', trackingNumber: 'TRK-USER' })
          .expect(403);
      });
    });

    describe('shipped → delivered flow', () => {
      it('preparing → shipped (운송장 등록 후)', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'shipped' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('shipped');
      });

      it('shipped → delivered', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'delivered' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('delivered');
      });

      it('delivered → 최종 상태, 전이 불가', async () => {
        await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'paid' })
          .expect(400);
      });
    });
  });
}
