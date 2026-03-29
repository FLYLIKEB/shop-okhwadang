import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

let app: INestApplication;
let dataSource: DataSource;

export function registerCartSuite(getApp: () => INestApplication) {
  describe('Cart (e2e)', () => {
    let userAToken: string;
    let userBToken: string;
    let productId: number;
    let optionId: number;
    let cartItemId: number;

    const userAEmail = `cart-user-a-${Date.now()}@test.com`;
    const userBEmail = `cart-user-b-${Date.now()}@test.com`;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Create user A
      const regA = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: userAEmail, password: 'Test1234!', name: '카트유저A' });
      if (regA.status !== 201) throw new Error(`Register A failed: ${regA.status} ${JSON.stringify(regA.body)}`);

      const loginA = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: userAEmail, password: 'Test1234!' });
      if (loginA.status !== 200) throw new Error(`Login A failed: ${loginA.status} ${JSON.stringify(loginA.body)}`);
      userAToken = (loginA.body as { accessToken: string }).accessToken;

      // Create user B
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: userBEmail, password: 'Test1234!', name: '카트유저B' });

      const loginB = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: userBEmail, password: 'Test1234!' });
      userBToken = (loginB.body as { accessToken: string }).accessToken;

      // Seed product and option
      const prodResult = await dataSource.query(`
        INSERT INTO products (name, slug, price, sale_price, stock, status)
        VALUES ('카트테스트상품', 'cart-test-product-e2e', 29000, 24000, 100, 'active')
      `);
      productId = (prodResult as { insertId: number }).insertId;

      const optResult = await dataSource.query(
        `INSERT INTO product_options (product_id, name, value, price_adjustment, stock, sort_order)
         VALUES (?, '색상', '블랙', 1000, 50, 0)`,
        [productId],
      );
      optionId = (optResult as { insertId: number }).insertId;
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(
        `DELETE FROM cart_items WHERE product_id = ?`,
        [productId],
      );
      await dataSource.query(
        `DELETE FROM product_options WHERE product_id = ?`,
        [productId],
      );
      await dataSource.query(
        `DELETE FROM products WHERE slug = 'cart-test-product-e2e'`,
      );
      await dataSource.query(
        `DELETE FROM users WHERE email IN (?, ?)`,
        [userAEmail, userBEmail],
      );
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('GET /api/cart', () => {
      it('no JWT → 401', () => {
        return request(app.getHttpServer()).get('/api/cart').expect(401);
      });

      it('user A — empty cart → 200, items=[]', () => {
        return request(app.getHttpServer())
          .get('/api/cart')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200)
          .expect((res) => {
            expect((res.body as { items: unknown[] }).items).toHaveLength(0);
            expect((res.body as { totalAmount: number }).totalAmount).toBe(0);
          });
      });
    });

    describe('POST /api/cart', () => {
      it('adds item for user A → 201', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/cart')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ productId, productOptionId: null, quantity: 1 })
          .expect(201);

        expect((res.body as { items: unknown[] }).items).toHaveLength(1);
        cartItemId = (
          (res.body as { items: Array<{ id: number }> }).items[0]
        ).id;
      });

      it('same product again → 201, quantity upserted to 2', () => {
        return request(app.getHttpServer())
          .post('/api/cart')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ productId, productOptionId: null, quantity: 1 })
          .expect(201)
          .expect((res) => {
            const items = (res.body as { items: Array<{ quantity: number }> })
              .items;
            expect(items[0].quantity).toBe(2);
          });
      });

      it('non-existent productId → 404', () => {
        return request(app.getHttpServer())
          .post('/api/cart')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ productId: 999999, productOptionId: null, quantity: 1 })
          .expect(404);
      });

      it('quantity=0 → 400 validation error', () => {
        return request(app.getHttpServer())
          .post('/api/cart')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ productId, productOptionId: null, quantity: 0 })
          .expect(400);
      });
    });

    describe('GET /api/cart after add', () => {
      it('user A — 1 item quantity=2', () => {
        return request(app.getHttpServer())
          .get('/api/cart')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200)
          .expect((res) => {
            const items = (res.body as { items: Array<{ quantity: number }> })
              .items;
            expect(items).toHaveLength(1);
            expect(items[0].quantity).toBe(2);
          });
      });
    });

    describe('PATCH /api/cart/:id', () => {
      it('user A updates quantity to 5 → 200', () => {
        return request(app.getHttpServer())
          .patch(`/api/cart/${cartItemId}`)
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ quantity: 5 })
          .expect(200)
          .expect((res) => {
            expect((res.body as { quantity: number }).quantity).toBe(5);
          });
      });

      it('user B updates user A item → 403', () => {
        return request(app.getHttpServer())
          .patch(`/api/cart/${cartItemId}`)
          .set('Authorization', `Bearer ${userBToken}`)
          .send({ quantity: 3 })
          .expect(403);
      });
    });

    describe('DELETE /api/cart/:id', () => {
      it('user B deletes user A item → 403', () => {
        return request(app.getHttpServer())
          .delete(`/api/cart/${cartItemId}`)
          .set('Authorization', `Bearer ${userBToken}`)
          .expect(403);
      });

      it('user A deletes own item → 200', () => {
        return request(app.getHttpServer())
          .delete(`/api/cart/${cartItemId}`)
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200)
          .expect((res) => {
            expect((res.body as { message: string }).message).toBe(
              '삭제되었습니다.',
            );
          });
      });

      it('GET /api/cart after delete — items=[]', () => {
        return request(app.getHttpServer())
          .get('/api/cart')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200)
          .expect((res) => {
            expect((res.body as { items: unknown[] }).items).toHaveLength(0);
          });
      });
    });

    describe('Cart with option', () => {
      it('adds item with option → 201, totalAmount accounts for priceAdjustment', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/cart')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ productId, productOptionId: optionId, quantity: 2 })
          .expect(201);

        const items = (
          res.body as { items: Array<{ unitPrice: number; subtotal: number }> }
        ).items;
        // salePrice=24000, priceAdjustment=1000, quantity=2 → unitPrice=25000, subtotal=50000
        expect(items[0].unitPrice).toBe(25000);
        expect(items[0].subtotal).toBe(50000);
        expect((res.body as { totalAmount: number }).totalAmount).toBe(50000);

        // cleanup
        const itemId = (
          res.body as { items: Array<{ id: number }> }
        ).items[0].id;
        await request(app.getHttpServer())
          .delete(`/api/cart/${itemId}`)
          .set('Authorization', `Bearer ${userAToken}`);
      });
    });
  });
}
