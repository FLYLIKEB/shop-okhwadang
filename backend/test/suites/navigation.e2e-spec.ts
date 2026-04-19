import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  AuthCookies,
  cookieHeader,
  loginAndGetCookies,
} from '../helpers/auth-cookie.helper';

export function registerNavigationSuite(getApp: () => INestApplication) {
  describe('Navigation (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let adminCookies: AuthCookies;
    let userCookies: AuthCookies;
    let adminUserId: number;
    let regularUserId: number;
    let createdItemId: number;
    let childItemId: number;

    const adminEmail = `admin-nav-e2e-${Date.now()}@test.com`;
    const userEmail = `user-nav-e2e-${Date.now()}@test.com`;
    const password = 'Test1234!';

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      const hashedPassword = await bcrypt.hash(password, 10);

      const adminResult = await dataSource.query(
        `INSERT INTO users (email, password, name, role) VALUES (?, ?, '네비관리자', 'admin')`,
        [adminEmail, hashedPassword],
      );
      adminUserId = adminResult.insertId as number;

      const userResult = await dataSource.query(
        `INSERT INTO users (email, password, name, role) VALUES (?, ?, '일반유저', 'user')`,
        [userEmail, hashedPassword],
      );
      regularUserId = userResult.insertId as number;

      adminCookies = await loginAndGetCookies(app, { email: adminEmail, password });
      userCookies = await loginAndGetCookies(app, { email: userEmail, password });
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      if (childItemId) {
        await dataSource.query('DELETE FROM navigation_items WHERE id = ?', [childItemId]);
      }
      if (createdItemId) {
        await dataSource.query('DELETE FROM navigation_items WHERE id = ?', [createdItemId]);
      }
      await dataSource.query('DELETE FROM users WHERE id IN (?, ?)', [adminUserId, regularUserId]);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('POST /api/navigation', () => {
      it('admin -> 201, 네비게이션 생성', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/navigation')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ group: 'gnb', label: '상품', url: '/products', sort_order: 0 })
          .expect(201);

        const body = res.body as { id: number; label: string; group: string };
        expect(body.id).toBeDefined();
        expect(body.label).toBe('상품');
        expect(body.group).toBe('gnb');
        createdItemId = Number(body.id);
      });

      it('admin -> 201, 자식 항목 생성', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/navigation')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ group: 'gnb', label: '신상품', url: '/products?sort=newest', sort_order: 0, parent_id: createdItemId })
          .expect(201);

        const body = res.body as { id: number; parent_id: number };
        expect(Number(body.parent_id)).toBe(createdItemId);
        childItemId = Number(body.id);
      });

      it('일반 user -> 403', () => {
        return request(app.getHttpServer())
          .post('/api/navigation')
          .set('Cookie', cookieHeader(userCookies))
          .send({ group: 'gnb', label: '테스트', url: '/test' })
          .expect(403);
      });

      it('인증 없음 -> 401', () => {
        return request(app.getHttpServer())
          .post('/api/navigation')
          .send({ group: 'gnb', label: '테스트', url: '/test' })
          .expect(401);
      });
    });

    describe('GET /api/navigation?group=gnb (public)', () => {
      it('활성 항목을 트리 구조로 반환', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/navigation?group=gnb')
          .expect(200);

        const body = res.body as Array<{ label: string; children: Array<{ label: string }> }>;
        expect(Array.isArray(body)).toBe(true);
        const item = body.find((i) => i.label === '상품');
        expect(item).toBeDefined();
        expect(item!.children).toBeDefined();
      });
    });

    describe('GET /api/admin/navigation?group=gnb', () => {
      it('admin -> 200, 전체 목록 (비활성 포함)', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/navigation?group=gnb')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as Array<{ label: string }>;
        expect(Array.isArray(body)).toBe(true);
      });

      it('일반 user -> 403', () => {
        return request(app.getHttpServer())
          .get('/api/admin/navigation?group=gnb')
          .set('Cookie', cookieHeader(userCookies))
          .expect(403);
      });
    });

    describe('PATCH /api/navigation/:id', () => {
      it('admin -> 200, 항목 수정', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/navigation/${createdItemId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ label: '수정된 상품' })
          .expect(200);

        const body = res.body as { label: string };
        expect(body.label).toBe('수정된 상품');
      });

      it('존재하지 않는 항목 -> 404', () => {
        return request(app.getHttpServer())
          .patch('/api/navigation/999999')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ label: '없음' })
          .expect(404);
      });
    });

    describe('PATCH /api/navigation/reorder', () => {
      it('admin -> 204, 순서 변경', async () => {
        await request(app.getHttpServer())
          .patch('/api/navigation/reorder')
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            orders: [
              { id: createdItemId, sort_order: 1 },
            ],
          })
          .expect(204);
      });
    });

    describe('DELETE /api/navigation/:id', () => {
      it('admin -> 204, 자식 항목 삭제', async () => {
        await request(app.getHttpServer())
          .delete(`/api/navigation/${childItemId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(204);

        childItemId = 0;
      });

      it('admin -> 204, 부모 항목 삭제', async () => {
        await request(app.getHttpServer())
          .delete(`/api/navigation/${createdItemId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(204);

        createdItemId = 0;
      });

      it('존재하지 않는 항목 -> 404', () => {
        return request(app.getHttpServer())
          .delete('/api/navigation/999999')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(404);
      });
    });
  });
}
