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

export function registerAdminOrdersSuite(getApp: () => INestApplication) {
  describe('Admin Orders (e2e)', () => {
    let adminCookies: AuthCookies;
    let userCookies: AuthCookies;
    let orderId: number;
    let refundOrderId: number;
    let productId: number;
    let userId: number;

    const adminEmail = `admin-orders-admin-${Date.now()}@test.com`;
    const userEmail = `admin-orders-user-${Date.now()}@test.com`;

    async function createOrder(options: { pointsUsed?: number } = {}): Promise<number> {
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('order'))
        .set('Cookie', cookieHeader(userCookies))
        .send({
          items: [{ productId, quantity: 1 }],
          recipientName: '테스트',
          recipientPhone: '010-1234-5678',
          zipcode: '12345',
          address: '서울시 강남구',
          policyConsents: currentPolicyConsents,
          ...(options.pointsUsed === undefined ? {} : { pointsUsed: options.pointsUsed }),
        })
        .expect(201);
      return Number((orderRes.body as { id: number | string }).id);
    }

    async function getProductStock(): Promise<number> {
      const rows = await dataSource.query(
        `SELECT stock FROM products WHERE id = ?`,
        [productId],
      ) as Array<{ stock: number }>;
      return Number(rows[0].stock);
    }

    async function getLatestPointBalance(): Promise<{ balance: number; type: string }> {
      const rows = await dataSource.query(
        `SELECT balance, type FROM point_history WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId],
      ) as Array<{ balance: number; type: string }>;
      return { balance: Number(rows[0].balance), type: rows[0].type };
    }

    async function confirmOrderPayment(targetOrderId: number): Promise<void> {
      await dataSource.query(
        `INSERT INTO payments (order_id, amount, status, paid_at)
         SELECT id, total_amount, 'confirmed', NOW()
         FROM orders
         WHERE id = ?
         ON DUPLICATE KEY UPDATE status = 'confirmed', amount = VALUES(amount), paid_at = NOW()`,
        [targetOrderId],
      );
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
      const userRows = await dataSource.query(
        `SELECT id FROM users WHERE email = ?`,
        [userEmail],
      ) as Array<{ id: number }>;
      userId = Number(userRows[0].id);
      userCookies = await loginAndGetCookies(app, {
        email: userEmail,
        password: 'Test1234!',
      });

      const productResult = await dataSource.query(`
        INSERT INTO products (name, slug, price, sale_price, stock, status)
        VALUES (?, ?, 10000, 10000, 100, 'active')
      `, ['주문테스트상품', `admin-orders-test-product-${Date.now()}`]);
      productId = Number((productResult as { insertId: number }).insertId);

      orderId = await createOrder();
      refundOrderId = await createOrder();
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(`DELETE FROM point_history WHERE user_id = ?`, [userId]);
      await dataSource.query(`DELETE FROM shipping WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)`, [userId]);
      await dataSource.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)`, [userId]);
      await dataSource.query(`DELETE FROM orders WHERE user_id = ?`, [userId]);
      await dataSource.query(`DELETE FROM products WHERE id = ?`, [productId]);
      await dataSource.query(`DELETE FROM users WHERE email IN (?, ?)`, [adminEmail, userEmail]);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
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
        await confirmOrderPayment(orderId);
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

    describe('stock and point reversals', () => {
      it('pending → cancelled restores reserved product stock', async () => {
        const stockBeforeOrder = await getProductStock();
        const cancelOrderId = await createOrder();

        expect(await getProductStock()).toBe(stockBeforeOrder - 1);

        const cancelRes = await request(app.getHttpServer())
          .post(`/api/admin/orders/${cancelOrderId}/cancel`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ reason: '관리자 재고 복구 테스트' })
          .expect(201);

        expect(cancelRes.body.status).toBe('cancelled');
        expect(cancelRes.body.cancelReason).toBe('관리자 재고 복구 테스트');
        expect(await getProductStock()).toBe(stockBeforeOrder);
      });

      it('pending → cancelled restores spent points', async () => {
        await dataSource.query(
          `INSERT INTO point_history (user_id, type, amount, remaining_amount, balance, description, expires_at, related_entity_type)
           VALUES (?, 'earn', 5000, 5000, 5000, '테스트 적립', DATE_ADD(NOW(), INTERVAL 30 DAY), 'order')`,
          [userId],
        );

        const pointsOrderId = await createOrder({ pointsUsed: 2000 });

        expect(await getLatestPointBalance()).toEqual({ balance: 3000, type: 'spend' });

        const cancelRes = await request(app.getHttpServer())
          .post(`/api/admin/orders/${pointsOrderId}/cancel`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ reason: '관리자 포인트 복구 테스트' })
          .expect(201);

        expect(cancelRes.body.status).toBe('cancelled');
        expect(cancelRes.body.cancelReason).toBe('관리자 포인트 복구 테스트');
        expect(await getLatestPointBalance()).toEqual({ balance: 5000, type: 'admin_adjust' });
      });
    });

    describe('POST /api/admin/shipping/:orderId', () => {
      it('운송장 등록 → 201', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/admin/shipping/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ carrier: 'mock', trackingNumber: `TRK-${Date.now()}` })
          .expect(201);

        const body = res.body as { carrier: string; trackingNumber: string };
        expect(body.carrier).toBe('mock');
        expect(body.trackingNumber).toBeDefined();
      });

      it('운송장 중복 등록 → 409', async () => {
        await request(app.getHttpServer())
          .post(`/api/admin/shipping/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ carrier: 'mock', trackingNumber: `TRK-DUP-${Date.now()}` })
          .expect(409);
      });

      it('일반 user → 403', async () => {
        await request(app.getHttpServer())
          .post(`/api/admin/shipping/${orderId}`)
          .set('Cookie', cookieHeader(userCookies))
          .send({ carrier: 'mock', trackingNumber: 'TRK-USER' })
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

      it('shipped → cancelled: 전이 불가', async () => {
        await request(app.getHttpServer())
          .patch(`/api/admin/orders/${orderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'cancelled' })
          .expect(400);
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
      it('결제 확정 전 운송장 등록 → 400', async () => {
        await request(app.getHttpServer())
          .post(`/api/admin/shipping/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ carrier: 'mock', trackingNumber: `TRK-REFUND-${Date.now()}` })
          .expect(400);
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
        await confirmOrderPayment(refundOrderId);
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'preparing' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('preparing');
      });

      it('refund order preparing 운송장 등록 → 201', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/admin/shipping/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ carrier: 'mock', trackingNumber: `TRK-REFUND-${Date.now()}` })
          .expect(201);

        const body = res.body as { carrier: string; trackingNumber: string };
        expect(body.carrier).toBe('mock');
        expect(body.trackingNumber).toBeDefined();
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
        const stockBeforeRefund = await getProductStock();

        const res = await request(app.getHttpServer())
          .patch(`/api/admin/orders/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ status: 'refunded' })
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('refunded');
        expect(await getProductStock()).toBe(stockBeforeRefund + 1);
      });

      it('refunded order 운송장 등록 → 400', async () => {
        await request(app.getHttpServer())
          .post(`/api/admin/shipping/${refundOrderId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ carrier: 'mock', trackingNumber: `TRK-REFUNDED-${Date.now()}` })
          .expect(400);
      });
    });
  });
}
