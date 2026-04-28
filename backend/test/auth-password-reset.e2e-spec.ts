import 'dotenv/config';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AuthModule } from '../src/modules/auth/auth.module';
import { NotificationModule } from '../src/modules/notification/notification.module';
import { MockEmailAdapter } from '../src/modules/notification/adapters/mock.adapter';
import { CacheModule } from '../src/modules/cache/cache.module';

process.env.JWT_SECRET ??= 'test-secret-key-for-e2e-tests';
process.env.FRONTEND_URL ??= 'http://localhost:5173';
process.env.NOTIFICATION_PROVIDER ??= 'mock';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      url: process.env.DATABASE_URL,
      charset: 'utf8mb4',
      autoLoadEntities: true,
      synchronize: false,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 200,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 30,
      },
      {
        name: 'forgotPassword',
        ttl: 60000,
        limit: 1,
        getTracker: (req) => {
          const rawEmail =
            typeof req.body === 'object' && req.body !== null && 'email' in req.body
              ? req.body.email
              : undefined;

          if (typeof rawEmail === 'string') {
            const normalizedEmail = rawEmail.trim().toLowerCase();
            if (normalizedEmail.length > 0) {
              return `forgot-password:${normalizedEmail}`;
            }
          }

          return `forgot-password:${req.ip}`;
        },
      },
    ]),
    NotificationModule,
    CacheModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
class AuthPasswordResetTestModule {}

describe('Auth password reset flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let mockEmailAdapter: MockEmailAdapter;

  const password = 'Test1234!';
  const forgotPasswordEmail = `auth-forgot-${Date.now()}@test.com`;
  const tokenReuseEmail = `auth-reuse-${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthPasswordResetTestModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    mockEmailAdapter = app.get(MockEmailAdapter);

    const hashedPassword = await bcrypt.hash(password, 10);
    await dataSource.query(
      'INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [forgotPasswordEmail, hashedPassword, '비밀번호분실유저', 'user', 1, 0],
    );
    await dataSource.query(
      'INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [tokenReuseEmail, hashedPassword, '토큰재사용유저', 'user', 1, 0],
    );
  });

  beforeEach(() => {
    mockEmailAdapter.clear();
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email IN (?, ?))', [
      forgotPasswordEmail,
      tokenReuseEmail,
    ]);
    await dataSource.query('DELETE FROM users WHERE email IN (?, ?)', [
      forgotPasswordEmail,
      tokenReuseEmail,
    ]);
    await app.close();
  });

  it('returns the same 200 response for existing and missing emails', async () => {
    const existingRes = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: forgotPasswordEmail })
      .expect(200);

    const missingRes = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: 'missing-auth-e2e@test.com' })
      .expect(200);

    expect(existingRes.body).toEqual(missingRes.body);
    expect(existingRes.body).toEqual({
      message: '가입된 계정이 있다면 비밀번호 재설정 링크를 이메일로 발송했습니다.',
    });
    expect(mockEmailAdapter.getSent()).toHaveLength(1);
  });

  it('prevents reuse of a password reset token', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: tokenReuseEmail })
      .expect(200);

    const sentEmails = mockEmailAdapter.getSent();
    expect(sentEmails).toHaveLength(1);
    const text = sentEmails[0].text ?? '';
    const match = text.match(/token=([A-Za-z0-9]+)/);
    expect(match).not.toBeNull();
    const token = match?.[1] ?? '';

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'NewPass123!' })
      .expect(200)
      .expect({ message: '비밀번호가 재설정되었습니다.' });

    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'AnotherPass123!' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('유효하지 않거나 만료된 비밀번호 재설정 토큰입니다.');
      });
  });
});
