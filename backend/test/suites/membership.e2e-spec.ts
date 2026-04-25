import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

let app: INestApplication;
let dataSource: DataSource;

function buildAccessCookie(jwtService: JwtService, userId: number, email: string, role: string): string[] {
  return [
    `accessToken=${jwtService.sign({ sub: userId, email, role, tokenType: 'access', jti: `mb-${userId}-${Date.now()}` })}`,
  ];
}

export function registerMembershipSuite(getApp: () => INestApplication) {
  describe('Membership (e2e)', () => {
    const unique = Date.now();
    const adminEmail = `mb-admin-${unique}@test.com`;
    const userEmail = `mb-user-${unique}@test.com`;
    const tierName = `테스트등급-${unique}`;

    let adminCookies: string[];
    let userCookies: string[];
    let adminUserId: number;
    let userUserId: number;
    const createdTierIds: number[] = [];

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);
      const jwtService = app.get(JwtService);
      const passwordHash = await bcrypt.hash('Test1234!', 10);

      const adminInsert = await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 1, 0, 1, NOW(), NOW(), NOW())`,
        [adminEmail, passwordHash, '등급 관리자'],
      );
      adminUserId = Number(adminInsert.insertId);
      adminCookies = buildAccessCookie(jwtService, adminUserId, adminEmail, 'admin');

      const userInsert = await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'user', 1, 0, 1, NOW(), NOW(), NOW())`,
        [userEmail, passwordHash, '일반사용자'],
      );
      userUserId = Number(userInsert.insertId);
      userCookies = buildAccessCookie(jwtService, userUserId, userEmail, 'user');
    });

    afterAll(async () => {
      if (createdTierIds.length > 0) {
        await dataSource.query(
          `DELETE FROM membership_tiers WHERE id IN (${createdTierIds.map(() => '?').join(',')})`,
          createdTierIds,
        );
      }
      await dataSource.query('DELETE FROM users WHERE id IN (?, ?)', [adminUserId, userUserId]);
    });

    describe('POST /api/admin/membership-tiers', () => {
      it('관리자 → 201 등급 생성', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/admin/membership-tiers')
          .set('Cookie', adminCookies)
          .send({
            name: tierName,
            minAmount: 100000,
            pointRate: 2,
            sortOrder: 99,
          })
          .expect(201);

        const body = res.body as { id: number; name: string };
        expect(body.name).toBe(tierName);
        createdTierIds.push(Number(body.id));
      });

      it('동일한 등급명 생성 시 409 Conflict', async () => {
        await request(app.getHttpServer())
          .post('/api/admin/membership-tiers')
          .set('Cookie', adminCookies)
          .send({ name: tierName, minAmount: 100000, pointRate: 1 })
          .expect(409);
      });

      it('일반 user → 403', async () => {
        await request(app.getHttpServer())
          .post('/api/admin/membership-tiers')
          .set('Cookie', userCookies)
          .send({ name: '실패등급', minAmount: 0, pointRate: 1 })
          .expect(403);
      });

      it('비인증 → 401', async () => {
        await request(app.getHttpServer())
          .post('/api/admin/membership-tiers')
          .send({ name: '실패', minAmount: 0, pointRate: 1 })
          .expect(401);
      });
    });

    describe('GET /api/admin/membership-tiers', () => {
      it('관리자 → 200 등급 목록 반환', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/membership-tiers')
          .set('Cookie', adminCookies)
          .expect(200);

        const body = res.body as Array<{ id: number; name: string }>;
        expect(Array.isArray(body)).toBe(true);
        expect(body.some((t) => Number(t.id) === createdTierIds[0])).toBe(true);
      });

      it('일반 user → 403', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/membership-tiers')
          .set('Cookie', userCookies)
          .expect(403);
      });
    });

    describe('GET /api/admin/membership-tiers/:id', () => {
      it('관리자 → 200 단건 조회', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/admin/membership-tiers/${createdTierIds[0]}`)
          .set('Cookie', adminCookies)
          .expect(200);

        const body = res.body as { id: number; name: string };
        expect(body.name).toBe(tierName);
      });

      it('없는 ID → 404', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/membership-tiers/999999')
          .set('Cookie', adminCookies)
          .expect(404);
      });
    });

    describe('PATCH /api/admin/membership-tiers/:id', () => {
      it('수정 성공', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/membership-tiers/${createdTierIds[0]}`)
          .set('Cookie', adminCookies)
          .send({ pointRate: 3 })
          .expect(200);

        const body = res.body as { pointRate: number | string };
        expect(Number(body.pointRate)).toBe(3);
      });
    });

    describe('GET /api/users/me/tier', () => {
      it('인증된 사용자 → 200, tier 정보 반환', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/users/me/tier')
          .set('Cookie', userCookies)
          .expect(200);

        const body = res.body as {
          tier: string;
          tierAccumulatedAmount: number;
          tierDetails: unknown;
          nextTier: unknown;
          amountToNextTier: number | null;
        };
        expect(body).toHaveProperty('tier');
        expect(body).toHaveProperty('tierAccumulatedAmount');
        expect(body).toHaveProperty('tierEvaluatedAt');
      });

      it('비인증 → 401', async () => {
        await request(app.getHttpServer())
          .get('/api/users/me/tier')
          .expect(401);
      });
    });
  });
}
