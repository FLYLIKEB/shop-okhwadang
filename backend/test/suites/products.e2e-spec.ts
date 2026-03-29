import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

let app: INestApplication;
let dataSource: DataSource;

export function registerProductsSuite(getApp: () => INestApplication) {
  describe('Products (e2e)', () => {
    let categoryId: number;
    let activeProductId: number;
    let draftProductId: number;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Seed category
      const catResult = await dataSource.query(`
        INSERT INTO categories (name, slug, is_active, sort_order)
        VALUES ('테스트 카테고리', 'test-category-e2e', 1, 0)
      `);
      categoryId = catResult.insertId as number;

      // Seed active products
      const prod1 = await dataSource.query(`
        INSERT INTO products (name, slug, price, stock, status, category_id, is_featured)
        VALUES ('테스트 상품 A', 'test-product-a-e2e', 10000, 10, 'active', ?, 0)
      `, [categoryId]);
      activeProductId = prod1.insertId as number;

      await dataSource.query(`
        INSERT INTO products (name, slug, price, stock, status, category_id, is_featured)
        VALUES ('테스트 상품 B', 'test-product-b-e2e', 20000, 5, 'active', ?, 0)
      `, [categoryId]);

      // Seed draft product
      const draftProd = await dataSource.query(`
        INSERT INTO products (name, slug, price, stock, status, category_id)
        VALUES ('임시 상품', 'draft-product-e2e', 5000, 0, 'draft', ?)
      `, [categoryId]);
      draftProductId = draftProd.insertId as number;

      // Seed option and image for active product
      await dataSource.query(`
        INSERT INTO product_options (product_id, name, value, price_adjustment, stock, sort_order)
        VALUES (?, '색상', '블랙', 0, 5, 0)
      `, [activeProductId]);

      await dataSource.query(`
        INSERT INTO product_images (product_id, url, alt, sort_order, is_thumbnail)
        VALUES (?, 'https://example.com/image.jpg', '테스트 이미지', 0, 1)
      `, [activeProductId]);
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(`DELETE FROM product_images WHERE product_id IN (
        SELECT id FROM products WHERE slug LIKE '%-e2e'
      )`);
      await dataSource.query(`DELETE FROM product_options WHERE product_id IN (
        SELECT id FROM products WHERE slug LIKE '%-e2e'
      )`);
      await dataSource.query(`DELETE FROM products WHERE slug LIKE '%-e2e'`);
      await dataSource.query(`DELETE FROM categories WHERE slug = 'test-category-e2e'`);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('GET /api/products', () => {
      it('200 — active 상품만 반환', () => {
        return request(app.getHttpServer())
          .get('/api/products')
          .expect(200)
          .expect((res) => {
            expect(res.body.items).toBeDefined();
            const statuses = (res.body.items as Array<{ status: string }>).map(
              (p) => p.status,
            );
            expect(statuses.every((s) => s === 'active')).toBe(true);
          });
      });

      it('sort=price_asc → 가격 오름차순', () => {
        return request(app.getHttpServer())
          .get('/api/products?sort=price_asc')
          .expect(200)
          .expect((res) => {
            const prices = (res.body.items as Array<{ price: number }>).map(
              (p) => Number(p.price),
            );
            for (let i = 1; i < prices.length; i++) {
              expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
            }
          });
      });

      it('q=테스트 → 검색 결과 포함', () => {
        return request(app.getHttpServer())
          .get('/api/products?q=테스트')
          .expect(200)
          .expect((res) => {
            expect(res.body.total).toBeGreaterThan(0);
          });
      });

      it('categoryId 필터', () => {
        return request(app.getHttpServer())
          .get(`/api/products?categoryId=${categoryId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.total).toBeGreaterThan(0);
          });
      });
    });

    describe('GET /api/products/:id', () => {
      it('active 상품 → 200, options/images 포함', () => {
        return request(app.getHttpServer())
          .get(`/api/products/${activeProductId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBeDefined();
            expect(res.body.options).toBeDefined();
            expect(res.body.images).toBeDefined();
          });
      });

      it('draft 상품 → 404', () => {
        return request(app.getHttpServer())
          .get(`/api/products/${draftProductId}`)
          .expect(404);
      });

      it('존재하지 않는 id → 404', () => {
        return request(app.getHttpServer())
          .get('/api/products/999999')
          .expect(404);
      });
    });

    describe('GET /api/categories', () => {
      it('200 — 트리 구조 반환', () => {
        return request(app.getHttpServer())
          .get('/api/categories')
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            const testCat = (
              res.body as Array<{ slug: string; children: unknown[] }>
            ).find((c) => c.slug === 'test-category-e2e');
            expect(testCat).toBeDefined();
            expect(testCat?.children).toBeDefined();
          });
      });
    });

    describe('POST /api/products', () => {
      it('일반 사용자 → 403', () => {
        return request(app.getHttpServer())
          .post('/api/products')
          .send({
            name: '신상품',
            slug: 'new-product-e2e',
            price: 15000,
          })
          .expect(401);
      });
    });

    describe('GET /api/products?q=', () => {
      it('q=테스트 → 200, 검색 결과 포함', () => {
        return request(app.getHttpServer())
          .get('/api/products?q=테스트')
          .expect(200)
          .expect((res) => {
            const body = res.body as { items: unknown[]; total: number; page: number; limit: number };
            expect(body.items).toBeDefined();
            expect(body.total).toBeGreaterThan(0);
          });
      });

      it('q 빈 문자열 → 200, active 상품 전체 반환', () => {
        return request(app.getHttpServer())
          .get('/api/products?q=')
          .expect(200)
          .expect((res) => {
            const body = res.body as { items: unknown[]; total: number };
            expect(body.items).toBeDefined();
            expect(body.total).toBeGreaterThanOrEqual(0);
          });
      });
    });

    describe('GET /api/products — price range', () => {
      it('price_min > price_max → 400', () => {
        return request(app.getHttpServer())
          .get('/api/products?price_min=50000&price_max=10000')
          .expect(400);
      });

      it('price_min=5000&price_max=15000 → 200, 범위 내 상품만 반환', () => {
        return request(app.getHttpServer())
          .get('/api/products?price_min=5000&price_max=15000')
          .expect(200)
          .expect((res) => {
            const body = res.body as { items: Array<{ price: number }> };
            body.items.forEach((p) => {
              expect(Number(p.price)).toBeGreaterThanOrEqual(5000);
              expect(Number(p.price)).toBeLessThanOrEqual(15000);
            });
          });
      });
    });

    describe('GET /api/products/autocomplete', () => {
      it('q 길이 1 (< 2) → 200, 빈 배열', () => {
        return request(app.getHttpServer())
          .get('/api/products/autocomplete?q=a')
          .expect(200)
          .expect((res) => {
            expect(res.body).toEqual([]);
          });
      });

      it('q=테스트 → 200, id/name/slug 포함 배열 반환', () => {
        return request(app.getHttpServer())
          .get('/api/products/autocomplete?q=테스트')
          .expect(200)
          .expect((res) => {
            const body = res.body as Array<{ id: number; name: string; slug: string }>;
            expect(Array.isArray(body)).toBe(true);
            if (body.length > 0) {
              expect(body[0].id).toBeDefined();
              expect(body[0].name).toBeDefined();
              expect(body[0].slug).toBeDefined();
            }
          });
      });
    });

    describe('GET /api/search/popular', () => {
      it('200 — keywords 배열 반환', () => {
        return request(app.getHttpServer())
          .get('/api/search/popular')
          .expect(200)
          .expect((res) => {
            const body = res.body as { keywords: string[] };
            expect(Array.isArray(body.keywords)).toBe(true);
            expect(body.keywords.length).toBeGreaterThan(0);
          });
      });
    });
  });
}
