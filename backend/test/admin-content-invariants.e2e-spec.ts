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
      await app.get(SettingsService).bulkUpdate([]);
    }
    if (app) await app.close();
  });

  it('resets theme values and translations while preserving business, brand and operational settings', async () => {
    const repo = db.getRepository(SiteSetting);
    const fixtures = await repo.save(['color', 'business_info', 'brand', 'shipping'].map((group) => repo.create({
      key: `${RUN}-${group}`, group, label: group, value: 'custom', valueEn: 'English custom', valueJa: 'legacy ja', valueZh: 'legacy zh', defaultValue: 'default',
    })));
    await request(app.getHttpServer()).post('/api/admin/settings/reset').set('Cookie', adminCookie).expect(201);
    for (const fixture of fixtures) {
      const actual = await repo.findOneByOrFail({ key: fixture.key });
      if (fixture.group === 'color') {
        expect(actual).toMatchObject({ value: 'default', valueEn: null, valueJa: null, valueZh: null });
      } else {
        expect(actual).toMatchObject({ value: 'custom', valueEn: 'English custom', valueJa: 'legacy ja', valueZh: 'legacy zh' });
      }
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
