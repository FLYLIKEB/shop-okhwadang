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

export function registerAdminCategoriesSuite(getApp: () => INestApplication) {
  describe('Admin Categories (e2e)', () => {
    let adminCookies: AuthCookies;
    let userCookies: AuthCookies;
    let adminUserId: number;
    let regularUserId: number;
    let createdCategoryId: number;

    const adminEmail = `admin-cat-e2e-${Date.now()}@test.com`;
    const userEmail = `user-cat-e2e-${Date.now()}@test.com`;
    const password = 'Test1234!';

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      await registerAndGetCookies(app, {
        email: adminEmail,
        password,
        name: '관리자',
      });
      await dataSource.query(`UPDATE users SET role = 'admin' WHERE email = ?`, [adminEmail]);
      adminCookies = await loginAndGetCookies(app, { email: adminEmail, password });
      const adminRow = await dataSource.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
      adminUserId = Number((adminRow[0] as { id: number }).id);

      await registerAndGetCookies(app, {
        email: userEmail,
        password,
        name: '일반유저',
      });
      userCookies = await loginAndGetCookies(app, { email: userEmail, password });
      const userRow = await dataSource.query('SELECT id FROM users WHERE email = ?', [userEmail]);
      regularUserId = Number((userRow[0] as { id: number }).id);
    });
    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(`DELETE FROM categories WHERE slug LIKE '%-admin-e2e'`);
      await dataSource.query('DELETE FROM users WHERE id IN (?, ?)', [adminUserId, regularUserId]);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('POST /api/categories', () => {
      it('admin → 201, 카테고리 생성 성공', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/categories')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ name: '테스트루트', slug: 'test-root-admin-e2e', sortOrder: 0 })
          .expect(201);

        const body = res.body as { id: number; name: string; slug: string };
        expect(body.id).toBeDefined();
        expect(body.name).toBe('테스트루트');
        createdCategoryId = body.id;
      });

      it('일반 user → 403', () => {
        return request(app.getHttpServer())
          .post('/api/categories')
          .set('Cookie', cookieHeader(userCookies))
          .send({ name: '일반유저카테고리', slug: 'user-cat-admin-e2e' })
          .expect(403);
      });

      it('인증 없음 → 401', () => {
        return request(app.getHttpServer())
          .post('/api/categories')
          .send({ name: '비인증', slug: 'no-auth-admin-e2e' })
          .expect(401);
      });

      it('slug 중복 → 409', () => {
        return request(app.getHttpServer())
          .post('/api/categories')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ name: '중복슬러그', slug: 'test-root-admin-e2e' })
          .expect(409);
      });
    });

    describe('PATCH /api/categories/:id', () => {
      it('admin → 200, 이름 업데이트', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/categories/${createdCategoryId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ name: '업데이트된루트' })
          .expect(200);

        const body = res.body as { name: string };
        expect(body.name).toBe('업데이트된루트');
      });
    });

    describe('DELETE /api/categories/:id', () => {
      it('하위 카테고리가 있는 경우 → 400', async () => {
        const childResult = await dataSource.query(
          `INSERT INTO categories (name, slug, parent_id, sort_order, is_active) VALUES (?, ?, ?, 0, 1)`,
          ['하위카테고리', 'child-cat-admin-e2e', createdCategoryId],
        );
        const childId = Number((childResult as { insertId: number }).insertId);

        await request(app.getHttpServer())
          .delete(`/api/categories/${createdCategoryId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(400);

        await dataSource.query('DELETE FROM categories WHERE id = ?', [childId]);
      });
      it('삭제 성공 → 204', () => {
        return request(app.getHttpServer())
          .delete(`/api/categories/${createdCategoryId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(204);
      });
    });

    describe('PATCH /api/categories/reorder', () => {
      it('admin → 204, sort_order 일괄 업데이트', async () => {
        const res1 = await request(app.getHttpServer())
          .post('/api/categories')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ name: 'reorder1', slug: 'reorder1-admin-e2e', sortOrder: 0 });
        const res2 = await request(app.getHttpServer())
          .post('/api/categories')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ name: 'reorder2', slug: 'reorder2-admin-e2e', sortOrder: 1 });

        const id1 = Number((res1.body as { id: number | string }).id);
        const id2 = Number((res2.body as { id: number | string }).id);

        await request(app.getHttpServer())
          .patch('/api/categories/reorder')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ orders: [{ id: id1, sortOrder: 10 }, { id: id2, sortOrder: 5 }] })
          .expect(204);

        // cleanup
        await dataSource.query('DELETE FROM categories WHERE id IN (?, ?)', [id1, id2]);
      });
    });

    describe('POST /api/upload/category-image', () => {
      it('admin → 201, 카테고리 이미지 업로드 성공', async () => {
        const fakeImage = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X4r0AAAAASUVORK5CYII=',
          'base64',
        );
        const res = await request(app.getHttpServer())
          .post('/api/upload/category-image')
          .set('Cookie', cookieHeader(adminCookies))
          .attach('file', fakeImage, {
            filename: 'test.png',
            contentType: 'image/png',
          })
          .expect(201);

        const body = res.body as { url: string; filename: string };
        expect(body.url).toContain('/uploads/categories/');
        expect(body.filename).toMatch(/^uploads\/categories\/.+\.png$/);
      });

      it('일반 user → 403', async () => {
        const fakeImage = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X4r0AAAAASUVORK5CYII=',
          'base64',
        );
        await request(app.getHttpServer())
          .post('/api/upload/category-image')
          .set('Cookie', cookieHeader(userCookies))
          .attach('file', fakeImage, {
            filename: 'test.png',
            contentType: 'image/png',
          })
          .expect(403);
      });

      it('인증 없음 → 401', async () => {
        const fakeImage = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X4r0AAAAASUVORK5CYII=',
          'base64',
        );
        await request(app.getHttpServer())
          .post('/api/upload/category-image')
          .attach('file', fakeImage, {
            filename: 'test.png',
            contentType: 'image/png',
          })
          .expect(401);
      });
    });

    describe('PATCH /api/categories/:id with imageUrl', () => {
      it('admin → 업로드된 이미지 URL을 카테고리에 설정', async () => {
        const catRes = await request(app.getHttpServer())
          .post('/api/categories')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ name: '이미지카테고리', slug: 'img-cat-admin-e2e', sortOrder: 0 });
        const catId = (catRes.body as { id: number }).id;

        const fakeImage = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X4r0AAAAASUVORK5CYII=',
          'base64',
        );
        const uploadRes = await request(app.getHttpServer())
          .post('/api/upload/category-image')
          .set('Cookie', cookieHeader(adminCookies))
          .attach('file', fakeImage, {
            filename: 'test.png',
            contentType: 'image/png',
          });
        const imageUrl = (uploadRes.body as { url: string }).url;

        const updateRes = await request(app.getHttpServer())
          .patch(`/api/categories/${catId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ imageUrl })
          .expect(200);

        expect((updateRes.body as { imageUrl: string | null }).imageUrl).toBe(imageUrl ?? null);

        await dataSource.query('DELETE FROM categories WHERE id = ?', [catId]);
      });
    });
  });
}
