import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource, Like } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Popup } from '../src/modules/popups/entities/popup.entity';
import { User, UserRole } from '../src/modules/users/entities/user.entity';

const RUN = 'popup-' + Date.now();

describe('popup management (MySQL)', () => {
  let app: INestApplication;
  let db: DataSource;
  const cookies: Partial<Record<UserRole, string>> = {};

  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test')) throw new Error('Popup tests require a dedicated _test database');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    db = app.get(DataSource);
    for (const role of [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.USER]) {
      const repo = db.getRepository(User);
      const user = await repo.save(repo.create({ email: RUN + '-' + role + '@example.test', name: 'Popup fixture', role,
        isActive: true, isEmailVerified: true, emailVerifiedAt: new Date(), tier: 'Bronze', tierAccumulatedAmount: 0 }));
      cookies[role] = 'accessToken=' + app.get(JwtService).sign({ sub: Number(user.id), email: user.email, role, tokenType: 'access', jti: RUN + role });
    }
  });

  afterAll(async () => {
    if (db) {
      await db.getRepository(Popup).delete({ title: Like(RUN + '%') });
      await db.getRepository(User).delete({ email: Like(RUN + '%') });
    }
    if (app) await app.close();
  });

  it('protects every admin action from visitors and members', async () => {
    for (const cookie of [undefined, cookies[UserRole.USER]]) {
      const expected = cookie ? 403 : 401;
      const actions = [
        () => request(app.getHttpServer()).get('/api/admin/popups'),
        () => request(app.getHttpServer()).post('/api/admin/popups').send({ title: RUN, imageUrl: '/popup.png' }),
        () => request(app.getHttpServer()).patch('/api/admin/popups/1').send({ isActive: true }),
        () => request(app.getHttpServer()).delete('/api/admin/popups/1'),
      ];
      for (const createAction of actions) {
        const action = createAction();
        if (cookie) action.set('Cookie', cookie);
        await action.expect(expected);
      }
    }
  });

  it('persists CRUD, honors scheduling and sorting, and validates merged periods', async () => {
    const create = async (suffix: string, fields: object = {}) => {
      const response = await request(app.getHttpServer()).post('/api/admin/popups').set('Cookie', cookies[UserRole.ADMIN]!)
        .send({ title: RUN + '-' + suffix, imageUrl: '/uploads/popup.png', ...fields }).expect(201);
      return response.body as Popup;
    };
    const draft = await create('draft');
    expect(draft.isActive).toBe(false);
    const active = await create('active', { isActive: true, sortOrder: 2, startsAt: '2000-01-01T00:00:00Z', endsAt: '2099-01-01T00:00:00Z' });
    const first = await create('first', { isActive: true, sortOrder: 1 });
    await create('future', { isActive: true, startsAt: '2099-01-01T00:00:00Z' });
    await create('expired', { isActive: true, endsAt: '2000-01-01T00:00:00Z' });
    const publicRead = await request(app.getHttpServer()).get('/api/popups').expect(200);
    expect(publicRead.body.filter((popup: Popup) => popup.title.startsWith(RUN)).map((popup: Popup) => popup.title))
      .toEqual([first.title, active.title]);
    const adminRead = await request(app.getHttpServer()).get('/api/admin/popups').set('Cookie', cookies[UserRole.SUPER_ADMIN]!).expect(200);
    expect(adminRead.body.filter((popup: Popup) => popup.title.startsWith(RUN))).toHaveLength(5);
    await request(app.getHttpServer()).patch('/api/admin/popups/' + active.id).set('Cookie', cookies[UserRole.ADMIN]!)
      .send({ startsAt: '2100-01-01T00:00:00Z' }).expect(400);
    await request(app.getHttpServer()).patch('/api/admin/popups/' + active.id).set('Cookie', cookies[UserRole.SUPER_ADMIN]!)
      .send({ endsAt: null, linkUrl: '/products', isActive: false }).expect(200);
    expect(await db.getRepository(Popup).findOneByOrFail({ id: active.id })).toMatchObject({ endsAt: null, linkUrl: '/products', isActive: false });
    await request(app.getHttpServer()).delete('/api/admin/popups/' + first.id).set('Cookie', cookies[UserRole.ADMIN]!).expect(204);
    expect(await db.getRepository(Popup).findOneBy({ id: first.id })).toBeNull();
  });
});
