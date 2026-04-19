import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuthCookies, cookieHeader, loginAndGetCookies } from '../helpers/auth-cookie.helper';

let app: INestApplication;
let dataSource: DataSource;

export function registerAttributesSuite(getApp: () => INestApplication) {
  describe('Attributes (e2e)', () => {
    let categoryId: number;
    let productId: number;
    let attributeTypeId: number;
    let adminCookies: AuthCookies;

    const adminEmail = `attributes-admin-${Date.now()}@test.com`;
    const adminPassword = 'Test1234!';

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: adminEmail, password: adminPassword, name: '속성관리자' });
      await dataSource.query(
        `UPDATE users SET role = 'admin', is_email_verified = 1, email_verified_at = NOW() WHERE email = ?`,
        [adminEmail],
      );
      adminCookies = await loginAndGetCookies(app, {
        email: adminEmail,
        password: adminPassword,
      });

      const catResult = await dataSource.query(`
        INSERT INTO categories (name, slug, is_active, sort_order)
        VALUES ('테스트 카테고리-attr', 'test-category-attr', 1, 0)
      `);
      categoryId = catResult.insertId as number;

      const prodResult = await dataSource.query(`
        INSERT INTO products (name, slug, price, stock, status, category_id, is_featured)
        VALUES ('테스트 상품-attr', 'test-product-attr', 10000, 10, 'active', ?, 0)
      `, [categoryId]);
      productId = prodResult.insertId as number;

      const typeResult = await dataSource.query(`
        INSERT INTO attribute_types (code, name, name_ko, input_type, is_filterable, is_searchable, valid_values, sort_order)
        VALUES ('test_attr', 'Test Attribute', '테스트 속성', 'select', TRUE, FALSE, '["val1","val2"]', 0)
      `);
      attributeTypeId = typeResult.insertId as number;
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(`DELETE FROM product_attributes WHERE product_id = ?`, [productId]);
      await dataSource.query(`DELETE FROM products WHERE slug = 'test-product-attr'`);
      await dataSource.query(`DELETE FROM attribute_types WHERE code = 'test_attr'`);
      await dataSource.query(`DELETE FROM categories WHERE slug = 'test-category-attr'`);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('GET /api/attributes/types', () => {
      it('200 — 모든 속성 유형 반환', () => {
        return request(app.getHttpServer())
          .get('/api/attributes/types')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });

      it('test_attr 타입이 존재', () => {
        return request(app.getHttpServer())
          .get('/api/attributes/types')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200)
          .expect((res) => {
            const testType = (res.body as Array<{ code: string }>).find(
              (t) => t.code === 'test_attr',
            );
            expect(testType).toBeDefined();
          });
      });
    });

    describe('GET /api/attributes/types/filterable', () => {
      it('200 — 필터 가능한 속성 유형만 반환', () => {
        return request(app.getHttpServer())
          .get('/api/attributes/types/filterable')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            const types = res.body as Array<{ isFilterable: boolean }>;
            types.forEach((t) => {
              expect(t.isFilterable).toBe(true);
            });
          });
      });
    });

    describe('GET /api/attributes/types/:id', () => {
      it('200 — 존재하는 ID로 조회', () => {
        return request(app.getHttpServer())
          .get(`/api/attributes/types/${attributeTypeId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(attributeTypeId);
            expect(res.body.code).toBe('test_attr');
          });
      });

      it('404 — 존재하지 않는 ID', () => {
        return request(app.getHttpServer())
          .get('/api/attributes/types/999999')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(404);
      });
    });

    describe('GET /api/attributes/types/code/:code', () => {
      it('200 — 코드로 조회', () => {
        return request(app.getHttpServer())
          .get('/api/attributes/types/code/test_attr')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200)
          .expect((res) => {
            expect(res.body.code).toBe('test_attr');
          });
      });
    });

    describe('GET /api/attributes/types/:code/values', () => {
      it('200 — 속성의 가능한 값 목록 반환', () => {
        return request(app.getHttpServer())
          .get('/api/attributes/types/test_attr/values')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toContain('val1');
            expect(res.body).toContain('val2');
          });
      });
    });

    describe('POST /api/attributes/types', () => {
      it('201 — 속성 유형 생성', () => {
        return request(app.getHttpServer())
          .post('/api/attributes/types')
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            code: `new_test_attr_${Date.now()}`,
            name: 'New Test',
            nameKo: '새 테스트',
            inputType: 'text',
            isFilterable: true,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.code).toMatch(/^new_test_attr_/);
          });
      });

      it('400 — 중복 코드', () => {
        return request(app.getHttpServer())
          .post('/api/attributes/types')
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            code: 'test_attr',
            name: 'Duplicate Test',
          })
          .expect(409);
      });
    });

    describe('PATCH /api/attributes/types/:id', () => {
      it('200 — 속성 유형 수정', () => {
        return request(app.getHttpServer())
          .patch(`/api/attributes/types/${attributeTypeId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            name: 'Updated Test',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.name).toBe('Updated Test');
          });
      });
    });

    describe('GET /api/attributes/products/:productId', () => {
      it('200 — 상품 속성 조회 (빈 배열)', () => {
        return request(app.getHttpServer())
          .get(`/api/attributes/products/${productId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });

    describe('POST /api/attributes/products', () => {
      it('201 — 상품 속성 생성', () => {
        return request(app.getHttpServer())
          .post('/api/attributes/products')
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            productId,
            attributeTypeId,
            value: 'val1',
            displayValue: '값1',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.value).toBe('val1');
            expect(res.body.displayValue).toBe('값1');
          });
      });
    });

    describe('POST /api/attributes/products/:productId/set', () => {
      it('200 — 상품 속성 일괄 설정', () => {
        return request(app.getHttpServer())
          .post(`/api/attributes/products/${productId}/set`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            attributes: [
              { attributeTypeId, value: 'val2', displayValue: '값2' },
            ],
          })
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].value).toBe('val2');
          });
      });
    });

    describe('PATCH /api/attributes/products/:id', () => {
      it('404 — 존재하지 않는 속성 ID', () => {
        return request(app.getHttpServer())
          .patch('/api/attributes/products/999999')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ value: 'updated' })
          .expect(404);
      });
    });

    describe('DELETE /api/attributes/products/:id', () => {
      it('204 — 상품 속성 삭제', async () => {
        const createResult = await request(app.getHttpServer())
          .post(`/api/attributes/products/${productId}/set`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            attributes: [
              { attributeTypeId, value: 'to_delete', displayValue: 'to_delete' },
            ],
          })
          .expect(200);

        const attrId = createResult.body[0].id;

        return request(app.getHttpServer())
          .delete(`/api/attributes/products/${attrId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(204);
      });
    });

    describe('DELETE /api/attributes/types/:id', () => {
      it('204 — 속성 유형 삭제', async () => {
        const createResult = await request(app.getHttpServer())
          .post('/api/attributes/types')
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            code: 'to_delete_type',
            name: 'To Delete',
          });

        const typeId = createResult.body.id;

        return request(app.getHttpServer())
          .delete(`/api/attributes/types/${typeId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(204);
      });
    });

    describe('GET /api/products with attrs filter', () => {
      it('200 — 속성 필터로 상품 조회 (attrs 파라미터)', async () => {
        await request(app.getHttpServer())
          .post(`/api/attributes/products/${productId}/set`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            attributes: [
              { attributeTypeId, value: 'filter_test', displayValue: 'filter_test' },
            ],
          })
          .expect(200);

        return request(app.getHttpServer())
          .get(`/api/products?attrs=test_attr:filter_test`)
          .expect(200)
          .expect((res) => {
            expect(res.body.items).toBeDefined();
          });
      });

      it('200 — 여러 속성 필터 (comma-separated)', async () => {
        await request(app.getHttpServer())
          .post(`/api/attributes/products/${productId}/set`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            attributes: [
              { attributeTypeId, value: 'multi_test', displayValue: 'multi_test' },
            ],
          })
          .expect(200);

        return request(app.getHttpServer())
          .get(`/api/products?attrs=test_attr:multi_test`)
          .expect(200)
          .expect((res) => {
            expect(res.body.items).toBeDefined();
          });
      });
    });
  });
}
