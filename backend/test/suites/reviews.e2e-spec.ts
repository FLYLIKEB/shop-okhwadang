import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

let app: INestApplication;
let dataSource: DataSource;

export function registerReviewsSuite(getApp: () => INestApplication) {
  describe('Reviews (e2e)', () => {
    let accessToken: string;
    let userId: number;
    let productId: number;
    let orderItemId: number;
    let reviewId: number;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Create test user
      const userResult = await dataSource.query(
        `INSERT INTO users (email, password, name, role) VALUES ('review-test@e2e.com', '$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456', '리뷰테스터', 'user')`,
      );
      userId = userResult.insertId as number;

      // Login to get token
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'review-test@e2e.com', password: 'Password1!' });

      // If login fails due to password hash, create token directly via register
      if (loginRes.status !== 200 && loginRes.status !== 201) {
        // Clean up and re-register
        await dataSource.query(`DELETE FROM users WHERE email = 'review-test@e2e.com'`);
        const regRes = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({ email: 'review-test@e2e.com', password: 'Password1!', name: '리뷰테스터' });
        accessToken = (regRes.body as { accessToken: string }).accessToken;
        userId = (regRes.body as { user: { id: number } }).user.id;
      } else {
        accessToken = (loginRes.body as { accessToken: string }).accessToken;
      }

      // Create test product
      const prodResult = await dataSource.query(
        `INSERT INTO products (name, slug, price, stock, status) VALUES ('리뷰테스트상품', 'review-test-product-e2e', 10000, 100, 'active')`,
      );
      productId = prodResult.insertId as number;

      // Create test order + order_item
      const orderResult = await dataSource.query(
        `INSERT INTO orders (user_id, order_number, status, total_amount, recipient_name, recipient_phone, zipcode, address)
         VALUES (?, 'ORD-REVIEW-E2E-001', 'delivered', 10000, '테스터', '010-0000-0000', '12345', '서울시 테스트구')`,
        [userId],
      );
      const orderId = orderResult.insertId as number;

      const oiResult = await dataSource.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
         VALUES (?, ?, '리뷰테스트상품', 10000, 1)`,
        [orderId, productId],
      );
      orderItemId = oiResult.insertId as number;
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(`DELETE FROM reviews WHERE user_id = ?`, [userId]);
      await dataSource.query(`DELETE FROM order_items WHERE product_id = ?`, [productId]);
      await dataSource.query(`DELETE FROM orders WHERE user_id = ?`, [userId]);
      await dataSource.query(`DELETE FROM products WHERE slug = 'review-test-product-e2e'`);
      await dataSource.query(`DELETE FROM users WHERE email = 'review-test@e2e.com'`);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('GET /api/reviews', () => {
      it('200 - 빈 리뷰 목록 반환', () => {
        return request(app.getHttpServer())
          .get(`/api/reviews?productId=${productId}`)
          .expect(200)
          .expect((res) => {
            const body = res.body as { data: unknown[]; stats: { totalCount: number }; pagination: { page: number } };
            expect(body.data).toBeDefined();
            expect(body.stats).toBeDefined();
            expect(body.pagination).toBeDefined();
            expect(body.stats.totalCount).toBe(0);
          });
      });
    });

    describe('POST /api/reviews', () => {
      it('401 - 인증 없이 리뷰 작성 시도', () => {
        return request(app.getHttpServer())
          .post('/api/reviews')
          .send({ productId, orderItemId, rating: 5, content: '좋아요' })
          .expect(401);
      });

      it('201 - 리뷰 작성 성공', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/reviews')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ productId, orderItemId, rating: 5, content: '정말 좋은 상품입니다!' })
          .expect(201);

        const body = res.body as { id: number; userName: string; rating: number };
        expect(body.id).toBeDefined();
        expect(body.rating).toBe(5);
        expect(body.userName).toMatch(/^.{1}\*\*$/);
        reviewId = body.id;
      });

      it('409 - 중복 리뷰 작성', () => {
        return request(app.getHttpServer())
          .post('/api/reviews')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ productId, orderItemId, rating: 4, content: '또 써볼까' })
          .expect(409);
      });
    });

    describe('GET /api/reviews (after creation)', () => {
      it('200 - 리뷰 1건 포함', () => {
        return request(app.getHttpServer())
          .get(`/api/reviews?productId=${productId}`)
          .expect(200)
          .expect((res) => {
            const body = res.body as { data: Array<{ id: number }>; stats: { totalCount: number; averageRating: number } };
            expect(body.data.length).toBe(1);
            expect(body.stats.totalCount).toBe(1);
            expect(body.stats.averageRating).toBe(5);
          });
      });
    });

    describe('PATCH /api/reviews/:id', () => {
      it('200 - 리뷰 수정 성공', () => {
        return request(app.getHttpServer())
          .patch(`/api/reviews/${reviewId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ rating: 4, content: '수정된 리뷰' })
          .expect(200)
          .expect((res) => {
            const body = res.body as { rating: number; content: string };
            expect(body.rating).toBe(4);
            expect(body.content).toBe('수정된 리뷰');
          });
      });
    });

    describe('DELETE /api/reviews/:id', () => {
      it('200 - 리뷰 삭제 성공', () => {
        return request(app.getHttpServer())
          .delete(`/api/reviews/${reviewId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
      });

      it('404 - 이미 삭제된 리뷰', () => {
        return request(app.getHttpServer())
          .delete(`/api/reviews/${reviewId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);
      });
    });
  });
}
