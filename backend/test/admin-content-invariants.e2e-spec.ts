import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource, Like } from 'typeorm';
import { AppModule } from '../src/app.module';
import { SiteSetting } from '../src/modules/settings/entities/site-setting.entity';
import { User, UserRole } from '../src/modules/users/entities/user.entity';
import { SettingsService } from '../src/modules/settings/settings.service';
import { JournalEntry, JournalCategory } from '../src/modules/journal/entities/journal-entry.entity';
import { Notice } from '../src/modules/notices/entities/notice.entity';

const RUN = `content-audit-${Date.now()}`;

describe('admin content invariants (MySQL)', () => {
  let app: INestApplication;
  let db: DataSource;
  let adminId: number;
  let adminCookie: string;
  let memberId: number;
  let memberCookie: string;
  let originalThemeSettings: SiteSetting[];
  const journalIds: number[] = [];
  const noticeIds: number[] = [];

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!url.pathname.endsWith('_test')) throw new Error('Content tests require a dedicated _test database');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    db = app.get(DataSource);
    const repo = db.getRepository(User);
    const admin = await repo.save(repo.create({ email: `${RUN}@example.test`, name: 'Content fixture', role: UserRole.ADMIN,
      isActive: true, isEmailVerified: true, emailVerifiedAt: new Date(), tier: 'Bronze', tierAccumulatedAmount: 0 }));
    adminId = Number(admin.id);
    adminCookie = `accessToken=${app.get(JwtService).sign({ sub: adminId, email: admin.email, role: admin.role, tokenType: 'access', jti: RUN })}`;
    const member = await repo.save(repo.create({ email: `${RUN}-member@example.test`, name: 'Member fixture', role: UserRole.USER,
      isActive: true, isEmailVerified: true, emailVerifiedAt: new Date(), tier: 'Bronze', tierAccumulatedAmount: 0 }));
    memberId = Number(member.id);
    memberCookie = `accessToken=${app.get(JwtService).sign({ sub: memberId, email: member.email, role: member.role, tokenType: 'access', jti: `${RUN}-member` })}`;
    originalThemeSettings = (await db.getRepository(SiteSetting).find()).filter((setting) => ['color', 'color_dark', 'typography', 'spacing', 'radius'].includes(setting.group));
  });

  afterAll(async () => {
    if (db) {
      const repo = db.getRepository(SiteSetting);
      await repo.delete({ key: Like(`${RUN}%`) });
      if (originalThemeSettings?.length) await repo.save(originalThemeSettings);
      for (const id of journalIds) await db.getRepository(JournalEntry).delete(id);
      for (const id of noticeIds) await db.getRepository(Notice).delete(id);
      if (adminId) await db.getRepository(User).delete(adminId);
      if (memberId) await db.getRepository(User).delete(memberId);
      await app.get(SettingsService).bulkUpdate([]);
    }
    if (app) await app.close();
  });

  it('persists bilingual business settings and refreshes cached admin and public reads', async () => {
    const repo = db.getRepository(SiteSetting);
    const key = `${RUN}-business-persistence`;
    await repo.save(repo.create({ key, group: 'business_info', label: 'Business fixture', value: '기존 상호', valueEn: 'Original company', defaultValue: '기본 상호' }));
    await app.get(SettingsService).bulkUpdate([]);
    for (const locale of ['ko', 'en']) {
      await request(app.getHttpServer()).get(`/api/settings?group=business_info&locale=${locale}`).expect(200);
      await request(app.getHttpServer()).get(`/api/settings/map?locale=${locale}`).expect(200);
    }
    await request(app.getHttpServer()).put('/api/admin/settings').set('Cookie', adminCookie)
      .send({ settings: [{ key, value: '변경 상호', valueEn: 'Updated company' }] }).expect(204).expect('');
    expect(await repo.findOneByOrFail({ key })).toMatchObject({ value: '변경 상호', valueEn: 'Updated company' });
    const adminRead = await request(app.getHttpServer()).get('/api/admin/settings?group=business_info').set('Cookie', adminCookie).expect(200);
    expect(adminRead.body).toEqual(expect.arrayContaining([expect.objectContaining({ key, value: '변경 상호', valueEn: 'Updated company' })]));
    for (const [locale, value] of [['ko', '변경 상호'], ['en', 'Updated company']]) {
      const list = await request(app.getHttpServer()).get(`/api/settings?group=business_info&locale=${locale}`).expect(200);
      expect(list.body).toEqual(expect.arrayContaining([expect.objectContaining({ key, value })]));
      const map = await request(app.getHttpServer()).get(`/api/settings/map?locale=${locale}`).expect(200);
      expect(map.body[key]).toBe(value);
    }
    await request(app.getHttpServer()).put('/api/admin/settings').set('Cookie', adminCookie)
      .send({ settings: [{ key, valueEn: '' }] }).expect(204).expect('');
    expect(await repo.findOneByOrFail({ key })).toMatchObject({ value: '변경 상호', valueEn: '' });
    const fallback = await request(app.getHttpServer()).get('/api/settings/map?locale=en').expect(200);
    expect(fallback.body[key]).toBe('변경 상호');
  });

  it('rejects unauthorized business updates and rolls back a batch containing an unknown key', async () => {
    const repo = db.getRepository(SiteSetting);
    const key = `${RUN}-business-protected`;
    await repo.save(repo.create({ key, group: 'business_info', label: 'Protected fixture', value: 'Original', defaultValue: 'Original' }));
    const settings = [{ key, value: 'Changed' }];
    await request(app.getHttpServer()).put('/api/admin/settings').send({ settings }).expect(401);
    await request(app.getHttpServer()).put('/api/admin/settings').set('Cookie', memberCookie).send({ settings }).expect(403);
    await request(app.getHttpServer()).put('/api/admin/settings').set('Cookie', adminCookie)
      .send({ settings: [...settings, { key: `${RUN}-missing`, value: 'Invalid' }] }).expect(400);
    expect((await repo.findOneByOrFail({ key })).value).toBe('Original');
  });

  it('saves theme settings for public locale readers and clears English overrides', async () => {
    await request(app.getHttpServer()).get('/api/settings/map?locale=ko').expect(200);
    await request(app.getHttpServer()).get('/api/settings/map?locale=en').expect(200);
    await request(app.getHttpServer()).put('/api/admin/settings').set('Cookie', adminCookie).send({ settings: [
      { key: 'color_primary', value: '#123456' },
      { key: 'color_dark_primary', value: '#abcdef' },
      { key: 'font_size_base', value: '18px', valueEn: '20px' },
      { key: 'font_family_base', value: "'Noto Serif KR', 'Georgia', serif" },
      { key: 'spacing_md', value: '0' },
      { key: 'radius_md', value: '0.75rem' },
    ] }).expect(204).expect('');
    for (const locale of ['ko', 'en']) {
      const result = await request(app.getHttpServer()).get(`/api/settings/map?locale=${locale}`).expect(200);
      expect(result.body).toMatchObject({
        color_primary: '#123456', color_dark_primary: '#abcdef', font_size_base: locale === 'en' ? '20px' : '18px',
        font_family_base: "'Noto Serif KR', 'Georgia', serif", spacing_md: '0', radius_md: '0.75rem',
      });
    }
    for (const valueEn of ['', null]) {
      await request(app.getHttpServer()).put('/api/admin/settings').set('Cookie', adminCookie)
        .send({ settings: [{ key: 'font_size_base', valueEn }] }).expect(204).expect('');
      const result = await request(app.getHttpServer()).get('/api/settings/map?locale=en').expect(200);
      expect(result.body.font_size_base).toBe('18px');
    }
  });

  it('rejects invalid mixed theme batches without changing stored values or cached public settings', async () => {
    const repo = db.getRepository(SiteSetting);
    const before = await repo.find({ order: { key: 'ASC' } });
    const publicBefore = await request(app.getHttpServer()).get('/api/settings/map?locale=ko').expect(200);
    for (const invalid of [
      { key: 'color_dark_primary', value: '#12345' },
      { key: 'font_size_base', valueEn: '-2rem' },
      { key: 'font_size_base', value: null },
      { key: 'font_weight_bold', value: '1001' },
    ]) {
      await request(app.getHttpServer()).put('/api/admin/settings').set('Cookie', adminCookie)
        .send({ settings: [{ key: 'color_primary', value: '#654321' }, invalid] }).expect(400);
      expect(await repo.find({ order: { key: 'ASC' } })).toEqual(before);
      const publicAfter = await request(app.getHttpServer()).get('/api/settings/map?locale=ko').expect(200);
      expect(publicAfter.body).toEqual(publicBefore.body);
    }
  });

  it('resets theme values and translations while preserving business, brand and operational settings', async () => {
    const repo = db.getRepository(SiteSetting);
    const fixtures = await repo.save(['color', 'business_info', 'brand', 'shipping'].map((group) => repo.create({
      key: `${RUN}-${group}`, group, label: group, value: 'custom', valueEn: 'English custom', valueJa: 'legacy ja', valueZh: 'legacy zh', defaultValue: 'default',
    })));
    await request(app.getHttpServer()).post('/api/admin/settings/reset').set('Cookie', adminCookie).expect(204).expect('');
    for (const fixture of fixtures) {
      const actual = await repo.findOneByOrFail({ key: fixture.key });
      if (fixture.group === 'color') {
        expect(actual).toMatchObject({ value: 'default', valueEn: null, valueJa: null, valueZh: null });
      } else {
        expect(actual).toMatchObject({ value: 'custom', valueEn: 'English custom', valueJa: 'legacy ja', valueZh: 'legacy zh' });
      }
    }
    for (const locale of ['ko', 'en']) {
      const result = await request(app.getHttpServer()).get(`/api/settings/map?locale=${locale}`).expect(200);
      for (const setting of originalThemeSettings) expect(result.body[setting.key]).toBe(setting.defaultValue);
    }
  });

  it('hides unpublished public details while retaining authenticated journal editing', async () => {
    const journals = db.getRepository(JournalEntry);
    const journal = await journals.save(journals.create({ slug: RUN, title: RUN, category: JournalCategory.NEWS, date: '2026-10-20', isPublished: false }));
    journalIds.push(Number(journal.id));
    const notices = db.getRepository(Notice);
    const notice = await notices.save(notices.create({ title: RUN, content: 'Draft fixture', isPublished: false, viewCount: 0 }));
    noticeIds.push(Number(notice.id));
    await request(app.getHttpServer()).get(`/api/journals/${RUN}`).expect(404);
    await request(app.getHttpServer()).get(`/api/notices/${notice.id}`).expect(404);
    expect((await notices.findOneByOrFail({ id: notice.id })).viewCount).toBe(0);
    await request(app.getHttpServer()).get(`/api/admin/journals/${journal.id}`).set('Cookie', adminCookie).expect(200);
    await journals.update(journal.id, { isPublished: true });
    await notices.update(notice.id, { isPublished: true });
    await request(app.getHttpServer()).get(`/api/journals/${RUN}`).expect(200);
    await request(app.getHttpServer()).get(`/api/notices/${notice.id}`).expect(200);
  });
});
