import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  AuthCookies,
  cookieHeader,
  loginAndGetCookies,
  registerAndGetCookies,
} from '../helpers/auth-cookie.helper';

export function registerPagesSuite(getApp: () => INestApplication) {
  describe('Pages (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let adminCookies: AuthCookies;
    let userCookies: AuthCookies;
    let adminUserId: number;
    let regularUserId: number;
    let createdPageId: number;
    let createdBlockId: number;

    const adminEmail = `admin-pages-e2e-${Date.now()}@test.com`;
    const userEmail = `user-pages-e2e-${Date.now()}@test.com`;
    const password = 'Test1234!';

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      await registerAndGetCookies(app, {
        email: adminEmail,
        password,
        name: '페이지관리자',
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
      await dataSource.query(`DELETE FROM page_blocks WHERE page_id IN (SELECT id FROM pages WHERE slug LIKE '%-pages-e2e')`);
      await dataSource.query(`DELETE FROM pages WHERE slug LIKE '%-pages-e2e'`);
      await dataSource.query('DELETE FROM users WHERE id IN (?, ?)', [adminUserId, regularUserId]);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('POST /api/pages', () => {
      it('admin -> 201, 페이지 생성 성공', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/pages')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ slug: 'test-home-pages-e2e', title: '테스트 홈페이지' })
          .expect(201);

        const body = res.body as { id: number; slug: string; title: string };
        expect(body.id).toBeDefined();
        expect(body.slug).toBe('test-home-pages-e2e');
        expect(body.title).toBe('테스트 홈페이지');
        createdPageId = body.id;
      });

      it('일반 user -> 403', () => {
        return request(app.getHttpServer())
          .post('/api/pages')
          .set('Cookie', cookieHeader(userCookies))
          .send({ slug: 'user-page-pages-e2e', title: '유저페이지' })
          .expect(403);
      });

      it('인증 없음 -> 401', () => {
        return request(app.getHttpServer())
          .post('/api/pages')
          .send({ slug: 'no-auth-pages-e2e', title: '비인증' })
          .expect(401);
      });

      it('slug 중복 -> 409', () => {
        return request(app.getHttpServer())
          .post('/api/pages')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ slug: 'test-home-pages-e2e', title: '중복' })
          .expect(409);
      });
    });

    describe('GET /api/pages (public)', () => {
      it('공개 페이지 목록 조회 (비인증 가능)', async () => {
        // publish the page first
        await request(app.getHttpServer())
          .patch(`/api/pages/${createdPageId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ is_published: true });

        const res = await request(app.getHttpServer())
          .get('/api/pages')
          .expect(200);

        const body = res.body as Array<{ slug: string }>;
        expect(Array.isArray(body)).toBe(true);
        const found = body.find((p) => p.slug === 'test-home-pages-e2e');
        expect(found).toBeDefined();
      });
    });

    describe('PATCH /api/pages/:id', () => {
      it('admin -> 200, 페이지 수정', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/pages/${createdPageId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ title: '수정된 홈페이지' })
          .expect(200);

        const body = res.body as { title: string };
        expect(body.title).toBe('수정된 홈페이지');
      });
    });

    describe('DELETE /api/pages/:id', () => {
      it('공개 중인 페이지 삭제 -> 400', () => {
        return request(app.getHttpServer())
          .delete(`/api/pages/${createdPageId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(400);
      });
    });

    describe('GET /api/pages/:slug (public)', () => {
      it('slug로 공개 페이지 조회', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/pages/test-home-pages-e2e')
          .expect(200);

        const body = res.body as { slug: string; title: string };
        expect(body.slug).toBe('test-home-pages-e2e');
      });

      it('존재하지 않는 slug -> 404', () => {
        return request(app.getHttpServer())
          .get('/api/pages/nonexistent-slug')
          .expect(404);
      });
    });

    describe('GET /api/admin/pages', () => {
      it('admin -> 200, 전체 목록 (비공개 포함)', async () => {
        // create unpublished page
        await request(app.getHttpServer())
          .post('/api/pages')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ slug: 'unpublished-pages-e2e', title: '비공개 페이지' });

        const res = await request(app.getHttpServer())
          .get('/api/admin/pages')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as Array<{ slug: string }>;
        expect(body.some((p) => p.slug === 'unpublished-pages-e2e')).toBe(true);
      });

      it('일반 user -> 403', () => {
        return request(app.getHttpServer())
          .get('/api/admin/pages')
          .set('Cookie', cookieHeader(userCookies))
          .expect(403);
      });
    });

    describe('POST /api/pages/:pageId/blocks', () => {
      it('admin -> 201, 블록 추가', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/pages/${createdPageId}/blocks`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            type: 'hero_banner',
            content: { title: '메인 배너', imageUrl: '/banner.jpg' },
            sort_order: 0,
          })
          .expect(201);

        const body = res.body as { id: number; type: string };
        expect(body.type).toBe('hero_banner');
        createdBlockId = body.id;
      });

      it('존재하지 않는 페이지 -> 404', () => {
        return request(app.getHttpServer())
          .post('/api/pages/999999/blocks')
          .set('Cookie', cookieHeader(adminCookies))
          .send({ type: 'hero_banner', content: {} })
          .expect(404);
      });

      it('지원하지 않는 블록 타입 -> 400', () => {
        return request(app.getHttpServer())
          .post(`/api/pages/${createdPageId}/blocks`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ type: 'invalid_type', content: {} })
          .expect(400);
      });
    });

    describe('PATCH /api/pages/:pageId/blocks/:blockId', () => {
      it('admin -> 200, 블록 수정', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/pages/${createdPageId}/blocks/${createdBlockId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ content: { title: '수정된 배너' } })
          .expect(200);

        const body = res.body as { content: { title: string } };
        expect(body.content.title).toBe('수정된 배너');
      });
    });

    describe('PATCH /api/pages/:pageId/blocks/reorder', () => {
      it('admin -> 204, 블록 순서 변경', async () => {
        // add another block
        const res = await request(app.getHttpServer())
          .post(`/api/pages/${createdPageId}/blocks`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ type: 'text_content', content: { text: '본문' }, sort_order: 1 });
        const secondBlockId = Number((res.body as { id: number | string }).id);

        await request(app.getHttpServer())
          .patch(`/api/pages/${createdPageId}/blocks/reorder`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({
            orders: [
              { id: Number(createdBlockId), sort_order: 1 },
              { id: secondBlockId, sort_order: 0 },
            ],
          })
          .expect(204);
      });
    });

    describe('DELETE /api/pages/:pageId/blocks/:blockId', () => {
      it('admin -> 204, 블록 삭제', () => {
        return request(app.getHttpServer())
          .delete(`/api/pages/${createdPageId}/blocks/${createdBlockId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(204);
      });
    });

    describe('DELETE /api/pages/:id (비공개 후 삭제)', () => {
      it('비공개 처리 후 삭제 -> 204', async () => {
        await request(app.getHttpServer())
          .patch(`/api/pages/${createdPageId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ is_published: false });

        await request(app.getHttpServer())
          .delete(`/api/pages/${createdPageId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(204);
      });
    });
  });
}
