import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

let app: INestApplication;
let dataSource: DataSource;

function buildAccessCookie(jwtService: JwtService, userId: number, email: string, role: string): string[] {
  return [
    `accessToken=${jwtService.sign({ sub: userId, email, role, tokenType: 'access', jti: `cms-${userId}-${Date.now()}` })}`,
  ];
}

export function registerCmsModulesSuite(getApp: () => INestApplication) {
  describe('CMS modules (e2e)', () => {
    const unique = Date.now();
    const adminEmail = `cms-admin-${unique}@test.com`;
    const userEmail = `cms-user-${unique}@test.com`;
    const settingKey = `cms-setting-${unique}`;
    const collectionUrl = `/products?collection=${unique}`;
    const niloUrl = `/products?nilo=${unique}`;
    const artistUrl = `/products?artist=${unique}`;
    const journalSlug = `journal-${unique}`;
    const faqCategory = `카테고리-${unique}`;
    const noticeTitle = `공지-${unique}`;
    const promotionTitle = `프로모션-${unique}`;
    const bannerTitle = `배너-${unique}`;

    let adminCookies: string[];
    let userCookies: string[];
    let adminUserId: number;
    let userUserId: number;
    let collectionId: number;
    let niloTypeId: number;
    let processStepId: number;
    let artistId: number;
    let journalId: number;
    let faqId: number;
    let noticeId: number;
    let promotionId: number;
    let bannerId: number;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);
      const jwtService = app.get(JwtService);
      const passwordHash = await bcrypt.hash('Test1234!', 10);

      const adminInsert = await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 1, 0, 1, NOW(), NOW(), NOW())`,
        [adminEmail, passwordHash, 'CMS 관리자'],
      );
      adminUserId = Number(adminInsert.insertId);
      adminCookies = buildAccessCookie(jwtService, adminUserId, adminEmail, 'admin');

      const userInsert = await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'user', 1, 0, 1, NOW(), NOW(), NOW())`,
        [userEmail, passwordHash, 'CMS 사용자'],
      );
      userUserId = Number(userInsert.insertId);
      userCookies = buildAccessCookie(jwtService, userUserId, userEmail, 'user');

      await dataSource.query(
        `INSERT INTO site_settings (
          setting_key, value, value_en, value_ja, value_zh, \`group\`,
          label, input_type, options, default_value, sort_order
        ) VALUES (?, '기본값', NULL, NULL, NULL, 'test', '테스트 설정', 'text', NULL, '기본값', 999)`,
        [settingKey],
      );
    });

    afterAll(async () => {
      await dataSource.query('DELETE FROM banners WHERE title = ?', [bannerTitle]);
      await dataSource.query('DELETE FROM promotions WHERE title = ?', [promotionTitle]);
      await dataSource.query('DELETE FROM notices WHERE title = ?', [noticeTitle]);
      await dataSource.query('DELETE FROM faqs WHERE category = ?', [faqCategory]);
      await dataSource.query('DELETE FROM journal_entries WHERE slug = ?', [journalSlug]);
      await dataSource.query('DELETE FROM artists WHERE product_url = ?', [artistUrl]);
      await dataSource.query('DELETE FROM process_steps WHERE title = ?', [`공정-${unique}`]);
      await dataSource.query('DELETE FROM nilo_types WHERE product_url = ?', [niloUrl]);
      await dataSource.query('DELETE FROM collections WHERE product_url = ?', [collectionUrl]);
      await dataSource.query('DELETE FROM site_settings WHERE setting_key = ?', [settingKey]);
      await dataSource.query('DELETE FROM users WHERE id IN (?, ?)', [adminUserId, userUserId]);
    });

    it('collections: admin can create/reorder/delete and public list returns it', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/admin/collections')
        .set('Cookie', adminCookies)
        .send({
          type: 'clay',
          name: `컬렉션-${unique}`,
          nameKo: `컬렉션-${unique}`,
          productUrl: collectionUrl,
          sortOrder: 1,
          isActive: true,
        })
        .expect(201);
      collectionId = Number((createRes.body as { id: number }).id);

      await request(app.getHttpServer())
        .post('/api/admin/collections')
        .set('Cookie', userCookies)
        .send({ type: 'clay', name: '실패', productUrl: 'https://example.com/x' })
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/collections/clay')
        .expect(200)
        .expect((res) => {
          expect((res.body as Array<{ id: number }>).some((item) => Number(item.id) === collectionId)).toBe(true);
        });

      await request(app.getHttpServer())
        .patch('/api/admin/collections/reorder')
        .set('Cookie', adminCookies)
        .send({ orders: [{ id: collectionId, sortOrder: 7 }] })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/admin/collections')
        .set('Cookie', adminCookies)
        .expect(200)
        .expect((res) => {
          const collection = (res.body as Array<{ id: number; sortOrder: number }>).find((item) => Number(item.id) === collectionId);
          expect(collection?.sortOrder).toBe(7);
        });

      await request(app.getHttpServer())
        .delete(`/api/admin/collections/${collectionId}`)
        .set('Cookie', adminCookies)
        .expect(204);
    });

    it('archives: admin can manage archive records and public endpoint returns them', async () => {
      const niloRes = await request(app.getHttpServer())
        .post('/api/admin/archives/nilo-types')
        .set('Cookie', adminCookies)
        .send({
          name: `Nilo ${unique}`,
          nameKo: `니로 ${unique}`,
          color: '#8B4513',
          region: 'Jeju',
          description: '설명',
          characteristics: ['부드러움'],
          productUrl: niloUrl,
          sortOrder: 0,
          isActive: true,
        })
        .expect(201);
      niloTypeId = Number((niloRes.body as { id: number }).id);

      const stepRes = await request(app.getHttpServer())
        .post('/api/admin/archives/process-steps')
        .set('Cookie', adminCookies)
        .send({ step: 99, title: `공정-${unique}`, description: '설명', detail: '상세' })
        .expect(201);
      processStepId = Number((stepRes.body as { id: number }).id);

      const artistRes = await request(app.getHttpServer())
        .post('/api/admin/archives/artists')
        .set('Cookie', adminCookies)
        .send({
          name: `작가-${unique}`,
          title: '명인',
          region: '서울',
          story: '이야기',
          specialty: '차',
          productUrl: artistUrl,
          sortOrder: 0,
          isActive: true,
        })
        .expect(201);
      artistId = Number((artistRes.body as { id: number }).id);

      await request(app.getHttpServer())
        .get('/api/archives')
        .expect(200)
        .expect((res) => {
          const body = res.body as {
            niloTypes: Array<{ id: number }>;
            processSteps: Array<{ id: number }>;
            artists: Array<{ id: number }>;
          };
          expect(body.niloTypes.some((item) => Number(item.id) === niloTypeId)).toBe(true);
          expect(body.processSteps.some((item) => Number(item.id) === processStepId)).toBe(true);
          expect(body.artists.some((item) => Number(item.id) === artistId)).toBe(true);
        });

      await request(app.getHttpServer()).delete(`/api/admin/archives/artists/${artistId}`).set('Cookie', adminCookies).expect(204);
      await request(app.getHttpServer()).delete(`/api/admin/archives/process-steps/${processStepId}`).set('Cookie', adminCookies).expect(204);
      await request(app.getHttpServer()).delete(`/api/admin/archives/nilo-types/${niloTypeId}`).set('Cookie', adminCookies).expect(204);
    });

    it('journal/faqs/notices: admin can publish content and public endpoints can read it', async () => {
      const journalRes = await request(app.getHttpServer())
        .post('/api/admin/journals')
        .set('Cookie', adminCookies)
        .send({ slug: journalSlug, title: `저널-${unique}`, category: 'NEWS', date: '2026-04-20', summary: '요약', content: JSON.stringify(['본문']), isPublished: true })
        .expect(201);
      journalId = Number((journalRes.body as { id: number }).id);

      const faqRes = await request(app.getHttpServer())
        .post('/api/admin/faqs')
        .set('Cookie', adminCookies)
        .send({ category: faqCategory, question: `질문-${unique}`, answer: '답변', isPublished: true })
        .expect(201);
      faqId = Number((faqRes.body as { id: number }).id);

      const noticeRes = await request(app.getHttpServer())
        .post('/api/admin/notices')
        .set('Cookie', adminCookies)
        .send({ title: noticeTitle, content: '공지 본문', isPinned: true, isPublished: true })
        .expect(201);
      noticeId = Number((noticeRes.body as { id: number }).id);

      await request(app.getHttpServer())
        .get('/api/journals')
        .expect(200)
        .expect((res) => {
          expect((res.body as Array<{ slug: string }>).some((item) => item.slug === journalSlug)).toBe(true);
        });

      await request(app.getHttpServer())
        .get(`/api/journals/${journalSlug}`)
        .expect(200)
        .expect((res) => {
          expect((res.body as { slug: string }).slug).toBe(journalSlug);
        });

      await request(app.getHttpServer())
        .get(`/api/faqs?category=${encodeURIComponent(faqCategory)}`)
        .expect(200)
        .expect((res) => {
          expect((res.body as Array<{ id: number }>).some((item) => Number(item.id) === faqId)).toBe(true);
        });

      await request(app.getHttpServer())
        .get('/api/notices')
        .expect(200)
        .expect((res) => {
          expect((res.body as Array<{ id: number }>).some((item) => Number(item.id) === noticeId)).toBe(true);
        });

      await request(app.getHttpServer())
        .get(`/api/notices/${noticeId}`)
        .expect(200)
        .expect((res) => {
          expect((res.body as { viewCount: number }).viewCount).toBeGreaterThan(0);
        });

      await request(app.getHttpServer()).delete(`/api/admin/notices/${noticeId}`).set('Cookie', adminCookies).expect(200);
      await request(app.getHttpServer()).delete(`/api/admin/faqs/${faqId}`).set('Cookie', adminCookies).expect(200);
      await request(app.getHttpServer()).delete(`/api/admin/journals/${journalId}`).set('Cookie', adminCookies).expect(204);
    });

    it('settings/promotions/banners: admin can update settings and manage public promos', async () => {
      await request(app.getHttpServer())
        .put('/api/admin/settings')
        .set('Cookie', adminCookies)
        .send({ settings: [{ key: settingKey, value: '변경값' }] })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/settings/map')
        .expect(200)
        .expect((res) => {
          expect((res.body as Record<string, string>)[settingKey]).toBe('변경값');
        });

      await request(app.getHttpServer())
        .post('/api/admin/settings/reset')
        .set('Cookie', adminCookies)
        .expect(201);

      await request(app.getHttpServer())
        .get('/api/settings/map')
        .expect(200)
        .expect((res) => {
          expect((res.body as Record<string, string>)[settingKey]).toBe('기본값');
        });

      const promotionRes = await request(app.getHttpServer())
        .post('/api/admin/promotions')
        .set('Cookie', adminCookies)
        .send({ title: promotionTitle, type: 'event', startsAt: '2026-04-01T00:00:00.000Z', endsAt: '2026-05-01T00:00:00.000Z', isActive: true })
        .expect(201);
      promotionId = Number((promotionRes.body as { id: number }).id);

      const bannerRes = await request(app.getHttpServer())
        .post('/api/admin/banners')
        .set('Cookie', adminCookies)
        .send({ title: bannerTitle, imageUrl: 'https://example.com/banner.png', linkUrl: 'https://example.com/products', isActive: true })
        .expect(201);
      bannerId = Number((bannerRes.body as { id: number }).id);

      await request(app.getHttpServer())
        .get('/api/promotions')
        .expect(200)
        .expect((res) => {
          expect((res.body as Array<{ id: number }>).some((item) => Number(item.id) === promotionId)).toBe(true);
        });

      await request(app.getHttpServer())
        .get('/api/banners')
        .expect(200)
        .expect((res) => {
          expect((res.body as Array<{ id: number }>).some((item) => Number(item.id) === bannerId)).toBe(true);
        });

      await request(app.getHttpServer()).delete(`/api/admin/banners/${bannerId}`).set('Cookie', adminCookies).expect(200);
      await request(app.getHttpServer()).delete(`/api/admin/promotions/${promotionId}`).set('Cookie', adminCookies).expect(200);
    });
  });
}
