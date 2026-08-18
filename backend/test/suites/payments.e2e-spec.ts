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

export function registerPaymentsSuite(getApp: () => INestApplication) {
  describe('Payments (e2e)', () => {
    let userCookies: AuthCookies;
    let productId: number;
    let orderId: number;
    let orderAmount: number;
    let preparedPaymentKey: string;
    const guestOrderIds: number[] = [];

    const userEmail = `payments-user-${Date.now()}@test.com`;
    const otherEmail = `payments-other-${Date.now()}@test.com`;
    const guestEmail = `payments-guest-${Date.now()}@test.com`;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Create main user
      await registerAndGetCookies(app, {
        email: userEmail,
        password: 'Test1234!',
        name: '결제유저',
      });
      userCookies = await loginAndGetCookies(app, {
        email: userEmail,
        password: 'Test1234!',
      });

      // Create other user
      await registerAndGetCookies(app, {
        email: otherEmail,
        password: 'Test1234!',
        name: '다른유저',
      });
      await loginAndGetCookies(app, {
        email: otherEmail,
        password: 'Test1234!',
      });

      // Seed product
      const prodResult = await dataSource.query(`
        INSERT INTO products (name, slug, price, sale_price, stock, status)
        VALUES ('결제테스트상품', 'payments-test-product-e2e', 30000, 30000, 10, 'active')
      `);
      productId = (prodResult as { insertId: number }).insertId;

      // Create order
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('order'))
        .set('Cookie', cookieHeader(userCookies))
        .send({
          items: [{ productId, quantity: 1 }],
          recipientName: '홍길동',
          recipientPhone: '010-1234-5678',
          zipcode: '12345',
          address: '서울시 강남구',
          policyConsents: currentPolicyConsents,
        });
      if (orderRes.status !== 201) throw new Error(`Create order failed: ${orderRes.status} ${JSON.stringify(orderRes.body)}`);
      orderId = Number((orderRes.body as { id: number }).id);
      orderAmount = Number((orderRes.body as { totalAmount: number | string }).totalAmount);
    });

    const createGuestOrder = async (email = guestEmail) => {
      const orderRes = await request(app.getHttpServer())
        .post('/api/guest/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('guest-order'))
        .send({
          items: [{ productId, quantity: 1 }],
          guestEmail: email,
          recipientName: '게스트결제',
          recipientPhone: '010-9876-5432',
          zipcode: '54321',
          address: '서울시 마포구',
          orderLocale: 'ko',
          policyConsents: currentPolicyConsents,
        });

      if (orderRes.status !== 201) {
        throw new Error(`Create guest order failed: ${orderRes.status} ${JSON.stringify(orderRes.body)}`);
      }

      const body = orderRes.body as {
        order: { id: number; totalAmount: number | string; orderNumber: string };
        guestAccessToken: string;
        guestAccessTokenExpiresAt: string;
      };
      guestOrderIds.push(Number(body.order.id));
      return {
        orderId: Number(body.order.id),
        orderAmount: Number(body.order.totalAmount),
        orderNumber: body.order.orderNumber,
        guestAccessToken: body.guestAccessToken,
        guestAccessTokenExpiresAt: body.guestAccessTokenExpiresAt,
      };
    };

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(`DELETE FROM shipping WHERE order_id = ?`, [orderId]);
      await dataSource.query(`DELETE FROM payments WHERE order_id = ?`, [orderId]);
      if (guestOrderIds.length > 0) {
        await dataSource.query(`DELETE FROM guest_order_access WHERE order_id IN (${guestOrderIds.map(() => '?').join(', ')})`, guestOrderIds);
        await dataSource.query(`DELETE FROM shipping WHERE order_id IN (${guestOrderIds.map(() => '?').join(', ')})`, guestOrderIds);
        await dataSource.query(`DELETE FROM payments WHERE order_id IN (${guestOrderIds.map(() => '?').join(', ')})`, guestOrderIds);
        await dataSource.query(`DELETE FROM order_items WHERE order_id IN (${guestOrderIds.map(() => '?').join(', ')})`, guestOrderIds);
        await dataSource.query(`DELETE FROM orders WHERE id IN (${guestOrderIds.map(() => '?').join(', ')})`, guestOrderIds);
      }
      await dataSource.query(`DELETE FROM order_items WHERE product_id = ?`, [productId]);
      await dataSource.query(
        `DELETE FROM orders WHERE user_id IN (
          SELECT id FROM users WHERE email IN (?, ?)
        )`,
        [userEmail, otherEmail],
      );
      await dataSource.query(`DELETE FROM users WHERE email IN (?, ?, ?)`, [userEmail, otherEmail, guestEmail]);
      await dataSource.query(`DELETE FROM products WHERE slug = 'payments-test-product-e2e'`);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('POST /api/payments/prepare', () => {
      it('no JWT → 401', () => {
        return request(app.getHttpServer())
          .post('/api/payments/prepare')
          .set('Idempotency-Key', e2eIdempotencyKey('payment'))
          .send({ orderId })
          .expect(401);
      });

      it('invalid orderId → 404', () => {
        return request(app.getHttpServer())
          .post('/api/payments/prepare')
          .set('Idempotency-Key', e2eIdempotencyKey('payment'))
          .set('Cookie', cookieHeader(userCookies))
          .send({ orderId: 999999 })
          .expect(404);
      });

      it('valid → 200/201, has clientKey', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/payments/prepare')
          .set('Idempotency-Key', e2eIdempotencyKey('payment'))
          .set('Cookie', cookieHeader(userCookies))
          .send({ orderId })
          .expect((r) => {
            if (r.status !== 200 && r.status !== 201) throw new Error(`Expected 200/201 got ${r.status}: ${JSON.stringify(r.body)}`);
          });

        const body = res.body as {
          clientKey: string;
          orderId: number;
          amount: number;
          gatewayPayload?: { paymentKey?: string };
        };
        expect(body.clientKey).toBeDefined();
        expect(body.orderId).toBe(orderId);
        expect(body.amount).toBe(orderAmount);
        preparedPaymentKey = body.gatewayPayload?.paymentKey ?? '';
        expect(preparedPaymentKey).toBeTruthy();
      });

      it('same payment preparation key replays the stored response', async () => {
        const key = e2eIdempotencyKey('payment-prepare-replay');
        const first = await request(app.getHttpServer()).post('/api/payments/prepare')
          .set('Cookie', cookieHeader(userCookies)).set('Idempotency-Key', key).send({ orderId })
          .expect((r) => { if (![200, 201].includes(r.status)) throw new Error(`unexpected ${r.status}`); });
        const replay = await request(app.getHttpServer()).post('/api/payments/prepare')
          .set('Cookie', cookieHeader(userCookies)).set('Idempotency-Key', key).send({ orderId })
          .expect((r) => { if (![200, 201].includes(r.status)) throw new Error(`unexpected ${r.status}`); });
        expect(replay.body).toEqual(first.body);
      });
    });

    describe('POST /api/payments/confirm', () => {
      it('amount match → 200/201, status=confirmed', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/payments/confirm')
          .set('Idempotency-Key', e2eIdempotencyKey('payment'))
          .set('Cookie', cookieHeader(userCookies))
          .send({ orderId, paymentKey: preparedPaymentKey, amount: orderAmount })
          .expect((r) => {
            if (r.status !== 200 && r.status !== 201) throw new Error(`Expected 200/201 got ${r.status}: ${JSON.stringify(r.body)}`);
          });

        const body = res.body as { status: string; orderId: number };
        expect(body.status).toBe('confirmed');
        expect(body.orderId).toBe(orderId);
      });

      it('after confirm: order.status should be paid', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/orders/${orderId}`)
          .set('Cookie', cookieHeader(userCookies))
          .expect(200);

        const body = res.body as { status: string };
        expect(body.status).toBe('paid');
      });

      it('amount mismatch → 400', async () => {
        // Need a fresh order for this test — just verify logic by re-confirm with wrong amount
        // The order is already confirmed so we'll get 409; create a separate order for mismatch test
        const orderRes = await request(app.getHttpServer())
          .post('/api/orders')
          .set('Idempotency-Key', e2eIdempotencyKey('order'))
          .set('Cookie', cookieHeader(userCookies))
          .send({
            items: [{ productId, quantity: 1 }],
            recipientName: '홍길동',
            recipientPhone: '010-1234-5678',
            zipcode: '12345',
            address: '서울시 강남구',
            policyConsents: currentPolicyConsents,
          });
        if (orderRes.status !== 201) {
          throw new Error(
            `Mismatch order create failed: ${orderRes.status} ${JSON.stringify(orderRes.body)}`,
          );
        }
        const mismatchOrder = orderRes.body as {
          id?: number;
          orderNumber?: string;
          order?: { id: number; orderNumber: string };
        };
        const mismatchOrderId = Number(mismatchOrder.id ?? mismatchOrder.order?.id);
        const mismatchOrderNumber =
          mismatchOrder.orderNumber ?? mismatchOrder.order?.orderNumber;
        expect(Number.isInteger(mismatchOrderId)).toBe(true);
        expect(mismatchOrderNumber).toBeTruthy();

        // Prepare it first
        const mismatchPrepare = await request(app.getHttpServer())
          .post('/api/payments/prepare')
          .set('Idempotency-Key', e2eIdempotencyKey('payment'))
          .set('Cookie', cookieHeader(userCookies))
          .send({ orderId: mismatchOrderId });
        if (![200, 201].includes(mismatchPrepare.status)) {
          throw new Error(
            `Mismatch prepare failed: ${mismatchPrepare.status} ${JSON.stringify(mismatchPrepare.body)}`,
          );
        }
        const mismatchPaymentKey = `mock-${mismatchOrderNumber}`;

        await request(app.getHttpServer())
          .post('/api/payments/confirm')
          .set('Idempotency-Key', e2eIdempotencyKey('payment'))
          .set('Cookie', cookieHeader(userCookies))
          .send({ orderId: mismatchOrderId, paymentKey: mismatchPaymentKey, amount: 99999 })
          .expect(400);

        // A transaction prepared for the first order cannot settle this order.
        await request(app.getHttpServer())
          .post('/api/payments/confirm')
          .set('Idempotency-Key', e2eIdempotencyKey('payment-cross-order'))
          .set('Cookie', cookieHeader(userCookies))
          .send({ orderId: mismatchOrderId, paymentKey: preparedPaymentKey, amount: orderAmount })
          .expect(500);

        // Cleanup
        await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
        await dataSource.query(`DELETE FROM payments WHERE order_id = ?`, [mismatchOrderId]);
        await dataSource.query(`DELETE FROM order_items WHERE order_id = ?`, [mismatchOrderId]);
        await dataSource.query(`DELETE FROM orders WHERE id = ?`, [mismatchOrderId]);
        await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
      });

      it('re-confirm (already confirmed) → 409', () => {
        return request(app.getHttpServer())
          .post('/api/payments/confirm')
          .set('Idempotency-Key', e2eIdempotencyKey('payment'))
          .set('Cookie', cookieHeader(userCookies))
          .send({ orderId, paymentKey: preparedPaymentKey, amount: orderAmount })
          .expect(409);
      });
    });

    describe('POST /api/guest/orders/:id/payments/prepare', () => {
      it('missing token → 401', async () => {
        const guestOrder = await createGuestOrder();

        await request(app.getHttpServer())
          .post(`/api/guest/orders/${guestOrder.orderId}/payments/prepare`)
          .set('Idempotency-Key', e2eIdempotencyKey('guest-payment'))
          .send({ locale: 'ko' })
          .expect(401);
      });

      it('invalid token → 401', async () => {
        const guestOrder = await createGuestOrder();

        await request(app.getHttpServer())
          .post(`/api/guest/orders/${guestOrder.orderId}/payments/prepare`)
          .set('Idempotency-Key', e2eIdempotencyKey('guest-payment'))
          .set('X-Guest-Access-Token', 'invalid-token')
          .send({ locale: 'ko' })
          .expect(401);
      });

      it('valid token → 200/201 with member prepare shape', async () => {
        const guestOrder = await createGuestOrder();

        const res = await request(app.getHttpServer())
          .post(`/api/guest/orders/${guestOrder.orderId}/payments/prepare`)
          .set('Idempotency-Key', e2eIdempotencyKey('guest-payment'))
          .set('X-Guest-Access-Token', guestOrder.guestAccessToken)
          .send({})
          .expect((r) => {
            if (r.status !== 200 && r.status !== 201) throw new Error(`Expected 200/201 got ${r.status}: ${JSON.stringify(r.body)}`);
          });

        const body = res.body as { clientKey: string; orderId: number; amount: number; gateway: string };
        expect(body.clientKey).toBeDefined();
        expect(body.orderId).toBe(guestOrder.orderId);
        expect(body.amount).toBe(guestOrder.orderAmount);
        expect(body.gateway).toBe('mock');
      });


  });

    describe('POST /api/guest/orders/:id/payments/confirm', () => {
      it('invalid token → 401', async () => {
        const guestOrder = await createGuestOrder();

        await request(app.getHttpServer())
          .post(`/api/guest/orders/${guestOrder.orderId}/payments/confirm`)
          .set('Idempotency-Key', e2eIdempotencyKey('guest-payment'))
          .set('X-Guest-Access-Token', 'invalid-token')
          .send({ paymentKey: 'pay_guest_invalid', amount: guestOrder.orderAmount })
          .expect(401);
      });

      it('valid token → 200 with rotated token fields, stale old token 401, rotated token usable', async () => {
        const guestOrder = await createGuestOrder();

        await request(app.getHttpServer())
          .post(`/api/guest/orders/${guestOrder.orderId}/payments/prepare`)
          .set('Idempotency-Key', e2eIdempotencyKey('guest-payment'))
          .set('X-Guest-Access-Token', guestOrder.guestAccessToken)
          .send({})
          .expect((r) => {
            if (r.status !== 200 && r.status !== 201) throw new Error(`Expected 200/201 got ${r.status}: ${JSON.stringify(r.body)}`);
          });


        const confirmRes = await request(app.getHttpServer())
          .post(`/api/guest/orders/${guestOrder.orderId}/payments/confirm`)
          .set('Idempotency-Key', e2eIdempotencyKey('guest-payment'))
          .set('X-Guest-Access-Token', guestOrder.guestAccessToken)
          .send({
            paymentKey: `mock-${guestOrder.orderNumber}`,
            amount: guestOrder.orderAmount,
          })
          .expect((r) => {
            if (r.status !== 200 && r.status !== 201) throw new Error(`Expected 200/201 got ${r.status}: ${JSON.stringify(r.body)}`);
          });

        const confirmBody = confirmRes.body as {
          status: string;
          orderId: number;
          guestAccessToken: string;
          guestAccessTokenExpiresAt: string;
        };
        expect(confirmBody.status).toBe('confirmed');
        expect(confirmBody.orderId).toBe(guestOrder.orderId);
        expect(confirmBody.guestAccessToken).toBeDefined();
        expect(confirmBody.guestAccessTokenExpiresAt).toBeDefined();
        expect(confirmBody.guestAccessToken).not.toBe(guestOrder.guestAccessToken);

        await request(app.getHttpServer())
          .post(`/api/guest/orders/${guestOrder.orderId}/payments/prepare`)
          .set('Idempotency-Key', e2eIdempotencyKey('guest-payment'))
          .set('X-Guest-Access-Token', guestOrder.guestAccessToken)
          .send({ locale: 'ko' })
          .expect(401);

        const rotatedDetailRes = await request(app.getHttpServer())
          .get(`/api/guest/orders/${guestOrder.orderId}`)
          .set('X-Guest-Access-Token', confirmBody.guestAccessToken)
          .query({ locale: 'ko' })
          .expect(200);
        expect(Number((rotatedDetailRes.body as { id: number | string; status: string }).id)).toBe(guestOrder.orderId);
        expect((rotatedDetailRes.body as { id: number | string; status: string }).status).toBe('paid');
      });

      it('simultaneous confirm → one winner, one stale/conflict loser, final order stays paid', async () => {
        const guestOrder = await createGuestOrder(`payments-guest-race-${Date.now()}@test.com`);

        await request(app.getHttpServer())
          .post(`/api/guest/orders/${guestOrder.orderId}/payments/prepare`)
          .set('Idempotency-Key', e2eIdempotencyKey('guest-payment'))
          .set('X-Guest-Access-Token', guestOrder.guestAccessToken)
          .send({})
          .expect((r) => {
            if (r.status !== 200 && r.status !== 201) throw new Error(`Expected 200/201 got ${r.status}: ${JSON.stringify(r.body)}`);
          });

        const raceKey = e2eIdempotencyKey('guest-payment-race');
        const racePayload = {
          paymentKey: `mock-${guestOrder.orderNumber}`,
          amount: guestOrder.orderAmount,
        };
        const [firstResult, secondResult] = await Promise.allSettled([
          request(app.getHttpServer())
            .post(`/api/guest/orders/${guestOrder.orderId}/payments/confirm`)
            .set('Idempotency-Key', raceKey)
            .set('X-Guest-Access-Token', guestOrder.guestAccessToken)
            .send(racePayload),
          request(app.getHttpServer())
            .post(`/api/guest/orders/${guestOrder.orderId}/payments/confirm`)
            .set('Idempotency-Key', raceKey)
            .set('X-Guest-Access-Token', guestOrder.guestAccessToken)
            .send(racePayload),
        ]);

        expect(firstResult.status).toBe('fulfilled');
        expect(secondResult.status).toBe('fulfilled');

        const responses = [firstResult, secondResult].map((result) => {
          if (result.status !== 'fulfilled') {
            throw result.reason;
          }
          return result.value;
        });
        expect(responses.every((response) => response.status === 200 || response.status === 201)).toBe(true);
        const successResponse = responses[0];
        expect(responses[1].body).toEqual(successResponse.body);
        expect(successResponse).toBeDefined();

        const successBody = successResponse!.body as {
          status: string;
          orderId: number | string;
          guestAccessToken: string;
          guestAccessTokenExpiresAt: string;
        };
        expect(successBody.status).toBe('confirmed');
        expect(Number(successBody.orderId)).toBe(guestOrder.orderId);
        expect(successBody.guestAccessToken).toBeDefined();
        expect(successBody.guestAccessTokenExpiresAt).toBeDefined();
        expect(successBody.guestAccessToken).not.toBe(guestOrder.guestAccessToken);

        await request(app.getHttpServer())
          .post(`/api/guest/orders/${guestOrder.orderId}/payments/prepare`)
          .set('Idempotency-Key', e2eIdempotencyKey('guest-payment'))
          .set('X-Guest-Access-Token', guestOrder.guestAccessToken)
          .send({})
          .expect(401);

        const paidDetailRes = await request(app.getHttpServer())
          .get(`/api/guest/orders/${guestOrder.orderId}`)
          .set('X-Guest-Access-Token', successBody.guestAccessToken)
          .query({ locale: 'ko' })
          .expect(200);

        expect(Number((paidDetailRes.body as { id: number | string; status: string }).id)).toBe(guestOrder.orderId);
        expect((paidDetailRes.body as { id: number | string; status: string }).status).toBe('paid');
      });
    });

    describe('POST /api/payments/cancel', () => {
      it('confirmed → 200/201, status=cancelled', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/payments/cancel')
          .set('Cookie', cookieHeader(userCookies))
          .send({ orderId, reason: '테스트 취소' })
          .expect((r) => {
            if (r.status !== 200 && r.status !== 201) throw new Error(`Expected 200/201 got ${r.status}: ${JSON.stringify(r.body)}`);
          });

        const body = res.body as { status: string };
        expect(body.status).toBe('cancelled');
      });

      it('after cancel → cancel again → 400', () => {
        return request(app.getHttpServer())
          .post('/api/payments/cancel')
          .set('Cookie', cookieHeader(userCookies))
          .send({ orderId, reason: '재취소' })
          .expect(400);
      });
    });
  });
}
