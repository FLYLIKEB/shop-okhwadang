import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

let app: INestApplication;
let dataSource: DataSource;

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+i5fQAAAAASUVORK5CYII=',
  'base64',
);

function buildAccessCookie(jwtService: JwtService, userId: number, email: string, role: string): string[] {
  return [
    `accessToken=${jwtService.sign({ sub: userId, email, role, tokenType: 'access', jti: `commerce-${userId}-${Date.now()}` })}`,
  ];
}

export function registerCommerceModulesSuite(getApp: () => INestApplication) {
  describe('Commerce support modules (e2e)', () => {
    const unique = Date.now();
    const adminEmail = `commerce-admin-${unique}@test.com`;
    const userEmail = `commerce-user-${unique}@test.com`;
    const categorySlug = `commerce-category-${unique}`;
    const productSlug = `commerce-product-${unique}`;
    const couponCode = `COUPON${unique}`;
    const expiredCouponCode = `COUPON${unique}EXP`;

    let adminCookies: string[];
    let userCookies: string[];
    let adminUserId: number;
    let userId: number;
    let categoryId: number;
    let productId: number;
    let wishlistId: number;
    let couponId: number;
    let userCouponId: number;
    let addressId: number;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);
      const jwtService = app.get(JwtService);
      const passwordHash = await bcrypt.hash('Test1234!', 10);

      const adminInsert = await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 1, 0, 1, NOW(), NOW(), NOW())`,
        [adminEmail, passwordHash, '커머스 관리자'],
      );
      adminUserId = Number(adminInsert.insertId);
      adminCookies = buildAccessCookie(jwtService, adminUserId, adminEmail, 'admin');

      const userInsert = await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'user', 1, 0, 1, NOW(), NOW(), NOW())`,
        [userEmail, passwordHash, '커머스 사용자'],
      );
      userId = Number(userInsert.insertId);
      userCookies = buildAccessCookie(jwtService, userId, userEmail, 'user');

      const categoryResult = await dataSource.query(
        `INSERT INTO categories (name, slug, is_active, sort_order) VALUES (?, ?, 1, 0)`,
        [`커머스 카테고리 ${unique}`, categorySlug],
      );
      categoryId = Number(categoryResult.insertId);

      const productResult = await dataSource.query(
        `INSERT INTO products (name, slug, price, stock, status, category_id, is_featured)
         VALUES (?, ?, 15000, 10, 'active', ?, 0)`,
        [`커머스 상품 ${unique}`, productSlug, categoryId],
      );
      productId = Number(productResult.insertId);
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query('DELETE FROM point_history WHERE user_id = ?', [userId]);
      await dataSource.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)', [userId]);
      await dataSource.query('DELETE FROM orders WHERE user_id = ?', [userId]);
      await dataSource.query('DELETE FROM user_addresses WHERE user_id = ?', [userId]);
      await dataSource.query('DELETE FROM wishlist WHERE product_id = ?', [productId]);
      await dataSource.query('DELETE FROM user_coupons WHERE user_id = ?', [userId]);
      await dataSource.query('DELETE FROM coupons WHERE code IN (?, ?)', [couponCode, expiredCouponCode]);
      await dataSource.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
      await dataSource.query('DELETE FROM product_options WHERE product_id = ?', [productId]);
      await dataSource.query('DELETE FROM products WHERE id = ?', [productId]);
      await dataSource.query('DELETE FROM categories WHERE id = ?', [categoryId]);
      await dataSource.query('DELETE FROM users WHERE id IN (?, ?)', [adminUserId, userId]);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    it('wishlist supports create/check/list/delete for a user', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/wishlist')
        .set('Cookie', userCookies)
        .send({ productId })
        .expect(201);
      wishlistId = Number((createRes.body as { id: number }).id);

      await request(app.getHttpServer())
        .get('/api/wishlist/check')
        .query({ productId })
        .set('Cookie', userCookies)
        .expect(200)
        .expect((res) => {
          expect((res.body as { isWishlisted: boolean }).isWishlisted).toBe(true);
        });

      await request(app.getHttpServer())
        .get('/api/wishlist')
        .set('Cookie', userCookies)
        .expect(200)
        .expect((res) => {
          expect((res.body as { total: number }).total).toBe(1);
        });

      await request(app.getHttpServer())
        .post('/api/wishlist')
        .set('Cookie', userCookies)
        .send({ productId })
        .expect(409);

      await request(app.getHttpServer())
        .delete(`/api/wishlist/${wishlistId}`)
        .set('Cookie', userCookies)
        .expect(204);
    });

    it('coupons supports admin creation/issuance and user discount calculation', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/coupons')
        .set('Cookie', userCookies)
        .send({ code: 'FAIL', name: '실패', type: 'fixed', value: 1000, startsAt: '2026-04-01T00:00:00.000Z', expiresAt: '2026-05-01T00:00:00.000Z' })
        .expect(403);

      const couponRes = await request(app.getHttpServer())
        .post('/api/admin/coupons')
        .set('Cookie', adminCookies)
        .send({
          code: couponCode,
          name: `쿠폰-${unique}`,
          type: 'fixed',
          value: 3000,
          minOrderAmount: 10000,
          startsAt: '2026-04-01T00:00:00.000Z',
          expiresAt: '2026-05-01T00:00:00.000Z',
          isActive: true,
        })
        .expect(201);
      couponId = Number((couponRes.body as { id: number }).id);

      const issueRes = await request(app.getHttpServer())
        .post('/api/admin/coupons/issue')
        .set('Cookie', adminCookies)
        .send({ couponId, userId })
        .expect(201);
      userCouponId = Number((issueRes.body as { id: number }).id);

      await request(app.getHttpServer())
        .get('/api/coupons')
        .set('Cookie', userCookies)
        .expect(200)
        .expect((res) => {
          expect((res.body as { coupons: Array<{ id: number }> }).coupons.some((coupon) => Number(coupon.id) === userCouponId)).toBe(true);
        });

      await request(app.getHttpServer())
        .post('/api/coupons/calculate')
        .set('Cookie', userCookies)
        .send({ orderAmount: 5000, userCouponId })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/coupons/calculate')
        .set('Cookie', userCookies)
        .send({ orderAmount: 15000, pointsToUse: 1 })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/coupons/calculate')
        .set('Cookie', userCookies)
        .send({ orderAmount: 15000, userCouponId })
        .expect(200)
        .expect((res) => {
          expect((res.body as { couponDiscount: number }).couponDiscount).toBe(3000);
          expect((res.body as { totalPayable: number }).totalPayable).toBe(15000);
        });

      const expiredCouponRes = await request(app.getHttpServer())
        .post('/api/admin/coupons')
        .set('Cookie', adminCookies)
        .send({
          code: expiredCouponCode,
          name: `만료쿠폰-${unique}`,
          type: 'fixed',
          value: 1000,
          startsAt: '2020-01-01T00:00:00.000Z',
          expiresAt: '2020-01-02T00:00:00.000Z',
          isActive: true,
        })
        .expect(201);
      const expiredCouponId = Number((expiredCouponRes.body as { id: number }).id);

      const expiredIssueRes = await request(app.getHttpServer())
        .post('/api/admin/coupons/issue')
        .set('Cookie', adminCookies)
        .send({ couponId: expiredCouponId, userId })
        .expect(201);
      const expiredUserCouponId = Number((expiredIssueRes.body as { id: number }).id);

      await request(app.getHttpServer())
        .post('/api/coupons/calculate')
        .set('Cookie', userCookies)
        .send({ orderAmount: 15000, userCouponId: expiredUserCouponId })
        .expect(400);

      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Cookie', userCookies)
        .send({
          items: [{ productId, quantity: 1 }],
          recipientName: '커머스 사용자',
          recipientPhone: '010-1234-5678',
          zipcode: '12345',
          address: '서울특별시 강남구',
          userCouponId,
        })
        .expect(201);

      const orderId = Number((orderRes.body as { id: number }).id);
      const usedCoupons = await dataSource.query(
        `SELECT status, order_id FROM user_coupons WHERE id = ?`,
        [userCouponId],
      ) as Array<{ status: string; order_id: number }>;

      expect(usedCoupons[0].status).toBe('used');
      expect(Number(usedCoupons[0].order_id)).toBe(orderId);

      await request(app.getHttpServer())
        .post('/api/orders')
        .set('Cookie', userCookies)
        .send({
          items: [{ productId, quantity: 1 }],
          recipientName: '커머스 사용자',
          recipientPhone: '010-1234-5678',
          zipcode: '12345',
          address: '서울특별시 강남구',
          userCouponId,
        })
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/coupons/points')
        .set('Cookie', userCookies)
        .expect(200)
        .expect((res) => {
          expect((res.body as { balance: number }).balance).toBeGreaterThanOrEqual(0);
        });
    });

    it('users module supports address CRUD and deletion request validation', async () => {
      const addressRes = await request(app.getHttpServer())
        .post('/api/users/me/addresses')
        .set('Cookie', userCookies)
        .send({
          recipientName: '홍길동',
          phone: '010-1234-5678',
          zipcode: '12345',
          address: '서울특별시 강남구 테헤란로 1',
          addressDetail: '101호',
          label: '집',
          isDefault: true,
        })
        .expect(201);
      addressId = Number((addressRes.body as { id: number }).id);

      await request(app.getHttpServer())
        .get('/api/users/me/addresses')
        .set('Cookie', userCookies)
        .expect(200)
        .expect((res) => {
          expect((res.body as Array<{ id: number }>).some((item) => Number(item.id) === addressId)).toBe(true);
        });

      await request(app.getHttpServer())
        .patch(`/api/users/me/addresses/${addressId}`)
        .set('Cookie', userCookies)
        .send({ label: '회사' })
        .expect(200)
        .expect((res) => {
          expect((res.body as { label: string }).label).toBe('회사');
        });

      await request(app.getHttpServer())
        .post('/api/users/me/request-deletion')
        .set('Cookie', userCookies)
        .send({ password: 'WrongPass123!' })
        .expect(400);

      await request(app.getHttpServer())
        .delete(`/api/users/me/addresses/${addressId}`)
        .set('Cookie', userCookies)
        .expect(200);
    });

    it('upload category-image endpoint rejects invalid type and unauthorized access', async () => {
      const gifBuffer = Buffer.from('GIF89a', 'ascii');
      await request(app.getHttpServer())
        .post('/api/upload/category-image')
        .set('Cookie', adminCookies)
        .attach('file', gifBuffer, { filename: 'bad.gif', contentType: 'image/gif' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/upload/category-image')
        .set('Cookie', userCookies)
        .attach('file', PNG_1X1, { filename: 'ok.png', contentType: 'image/png' })
        .expect(403);
    });
  });
}
