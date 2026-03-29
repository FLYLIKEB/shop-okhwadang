import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

let app: INestApplication;
let dataSource: DataSource;

export function registerAdminCategoriesSuite(getApp: () => INestApplication) {
  describe('Admin Categories (e2e)', () => {
    let adminToken: string;
    let userToken: string;
    let adminUserId: number;
    let regularUserId: number;
    let createdCategoryId: number;

    const adminEmail = `admin-cat-e2e-${Date.now()}@test.com`;
    const userEmail = `user-cat-e2e-${Date.now()}@test.com`;
    const password = 'Test1234!';

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create admin user
      const adminResult = await dataSource.query(
        `INSERT INTO users (email, password, name, role) VALUES (?, ?, '관리자', 'admin')`,
        [adminEmail, hashedPassword],
      );
      adminUserId = adminResult.insertId as number;

      // Create regular user
      const userResult = await dataSource.query(
        `INSERT INTO users (email, password, name, role) VALUES (?, ?, '일반유저', 'user')`,
        [userEmail, hashedPassword],
      );
      regularUserId = userResult.insertId as number;

      // Login as admin
      const adminLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminEmail, password });
      adminToken = (adminLogin.body as { accessToken: string }).accessToken;

      // Login as regular user
      const userLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: userEmail, password });
      userToken = (userLogin.body as { accessToken: string }).accessToken;
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
          .set('Authorization', `Bearer ${adminToken}`)
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
          .set('Authorization', `Bearer ${userToken}`)
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
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: '중복슬러그', slug: 'test-root-admin-e2e' })
          .expect(409);
      });
    });

    describe('PATCH /api/categories/:id', () => {
      it('admin → 200, 이름 업데이트', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/categories/${createdCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: '업데이트된루트' })
          .expect(200);

        const body = res.body as { name: string };
        expect(body.name).toBe('업데이트된루트');
      });
    });

    describe('DELETE /api/categories/:id', () => {
      it('하위 카테고리가 있는 경우 → 400', async () => {
        // create child
        const childRes = await request(app.getHttpServer())
          .post('/api/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: '하위카테고리', slug: 'child-cat-admin-e2e', parentId: createdCategoryId });
        const childId = (childRes.body as { id: number }).id;

        await request(app.getHttpServer())
          .delete(`/api/categories/${createdCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);

        // cleanup child
        await dataSource.query('DELETE FROM categories WHERE id = ?', [childId]);
      });

      it('삭제 성공 → 204', () => {
        return request(app.getHttpServer())
          .delete(`/api/categories/${createdCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(204);
      });
    });

    describe('PATCH /api/categories/reorder', () => {
      it('admin → 204, sort_order 일괄 업데이트', async () => {
        const res1 = await request(app.getHttpServer())
          .post('/api/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'reorder1', slug: 'reorder1-admin-e2e', sortOrder: 0 });
        const res2 = await request(app.getHttpServer())
          .post('/api/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'reorder2', slug: 'reorder2-admin-e2e', sortOrder: 1 });

        const id1 = (res1.body as { id: number }).id;
        const id2 = (res2.body as { id: number }).id;

        await request(app.getHttpServer())
          .patch('/api/categories/reorder')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ orders: [{ id: id1, sortOrder: 10 }, { id: id2, sortOrder: 5 }] })
          .expect(204);

        // cleanup
        await dataSource.query('DELETE FROM categories WHERE id IN (?, ?)', [id1, id2]);
      });
    });
  });
}
