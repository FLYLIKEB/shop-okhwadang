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
    const journalSlug = `journal-${unique}`;
    const faqCategory = `카테고리-${unique}`;
    const noticeTitle = `공지-${unique}`;
    const promotionTitle = `프로모션-${unique}`;
    const bannerTitle = `배너-${unique}`;

    let adminCookies: string[];
    let adminUserId: number;
    let userUserId: number;
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
      await dataSource.query('DELETE FROM site_settings WHERE setting_key = ?', [settingKey]);
      await dataSource.query('DELETE FROM users WHERE id IN (?, ?)', [adminUserId, userUserId]);
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
        .send({ title: promotionTitle, type: 'event', startsAt: '2026-04-01T00:00:00.000Z', endsAt: '2099-05-01T00:00:00.000Z', isActive: true })
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
