import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

let app: INestApplication;
let dataSource: DataSource;

function buildAccessCookie(jwtService: JwtService, userId: number, email: string, role: string): string[] {
  return [
    `accessToken=${jwtService.sign({ sub: userId, email, role, tokenType: 'access', jti: `bar-${userId}-${Date.now()}` })}`,
  ];
}

export function registerAnnouncementBarsSuite(getApp: () => INestApplication) {
  describe('AnnouncementBars (e2e)', () => {
    const unique = Date.now();
    const adminEmail = `bar-admin-${unique}@test.com`;
    const userEmail = `bar-user-${unique}@test.com`;
    const messageMarker = `안내바-${unique}`;

    let adminCookies: string[];
    let userCookies: string[];
    let adminUserId: number;
    let userUserId: number;
    const createdBarIds: number[] = [];

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);
      const jwtService = app.get(JwtService);
      const passwordHash = await bcrypt.hash('Test1234!', 10);

      const adminInsert = await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 1, 0, 1, NOW(), NOW(), NOW())`,
        [adminEmail, passwordHash, '안내바 관리자'],
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
      if (createdBarIds.length > 0) {
        await dataSource.query(
          `DELETE FROM announcement_bars WHERE id IN (${createdBarIds.map(() => '?').join(',')})`,
          createdBarIds,
        );
      }
      await dataSource.query('DELETE FROM users WHERE id IN (?, ?)', [adminUserId, userUserId]);
    });

    describe('POST /api/admin/announcement-bars', () => {
      it('관리자 → 201 안내바 생성', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/admin/announcement-bars')
          .set('Cookie', adminCookies)
          .send({
            message: messageMarker,
            message_en: `Bar-${unique}`,
            href: '/promotions',
            sort_order: 99,
            is_active: true,
          })
          .expect(201);

        const body = res.body as { id: number; message: string };
        expect(body.message).toBe(messageMarker);
        createdBarIds.push(Number(body.id));
      });

      it('일반 user → 403', async () => {
        await request(app.getHttpServer())
          .post('/api/admin/announcement-bars')
          .set('Cookie', userCookies)
          .send({ message: '실패' })
          .expect(403);
      });

      it('비인증 → 401', async () => {
        await request(app.getHttpServer())
          .post('/api/admin/announcement-bars')
          .send({ message: '비인증' })
          .expect(401);
      });
    });

    describe('GET /api/announcement-bars (public)', () => {
      it('비인증 200 - 활성 안내바 목록 반환', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/announcement-bars')
          .expect(200);

        const body = res.body as Array<{ id: number; message: string }>;
        expect(Array.isArray(body)).toBe(true);
        expect(body.some((b) => Number(b.id) === createdBarIds[0])).toBe(true);
      });

      it('locale=en 이면 message_en 으로 message 가 치환된다', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/announcement-bars?locale=en')
          .expect(200);

        const body = res.body as Array<{ id: number; message: string }>;
        const created = body.find((b) => Number(b.id) === createdBarIds[0]);
        expect(created?.message).toBe(`Bar-${unique}`);
      });
    });

    describe('GET /api/admin/announcement-bars (admin)', () => {
      it('비활성 항목까지 모두 반환', async () => {
        // 비활성 안내바 추가
        const inactiveRes = await request(app.getHttpServer())
          .post('/api/admin/announcement-bars')
          .set('Cookie', adminCookies)
          .send({ message: `${messageMarker}-비활성`, is_active: false, sort_order: 100 })
          .expect(201);
        const inactiveId = Number((inactiveRes.body as { id: number }).id);
        createdBarIds.push(inactiveId);

        const res = await request(app.getHttpServer())
          .get('/api/admin/announcement-bars')
          .set('Cookie', adminCookies)
          .expect(200);

        const body = res.body as Array<{ id: number; is_active: boolean }>;
        expect(body.some((b) => Number(b.id) === inactiveId)).toBe(true);
      });

      it('일반 user → 403', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/announcement-bars')
          .set('Cookie', userCookies)
          .expect(403);
      });
    });

    describe('PATCH /api/admin/announcement-bars/:id', () => {
      it('수정 성공', async () => {
        const id = createdBarIds[0];
        const res = await request(app.getHttpServer())
          .patch(`/api/admin/announcement-bars/${id}`)
          .set('Cookie', adminCookies)
          .send({ message: `${messageMarker}-수정` })
          .expect(200);

        const body = res.body as { id: number; message: string };
        expect(body.message).toBe(`${messageMarker}-수정`);
      });

      it('없는 ID 수정 → 404', async () => {
        await request(app.getHttpServer())
          .patch('/api/admin/announcement-bars/999999')
          .set('Cookie', adminCookies)
          .send({ message: 'x' })
          .expect(404);
      });
    });

    describe('PATCH /api/admin/announcement-bars/reorder', () => {
      it('순서 변경 성공 (204)', async () => {
        if (createdBarIds.length < 2) return;
        await request(app.getHttpServer())
          .patch('/api/admin/announcement-bars/reorder')
          .set('Cookie', adminCookies)
          .send({
            orders: [
              { id: createdBarIds[0], sort_order: 50 },
              { id: createdBarIds[1], sort_order: 51 },
            ],
          })
          .expect(204);
      });
    });

    describe('DELETE /api/admin/announcement-bars/:id', () => {
      it('삭제 성공 (204)', async () => {
        const createRes = await request(app.getHttpServer())
          .post('/api/admin/announcement-bars')
          .set('Cookie', adminCookies)
          .send({ message: `${messageMarker}-삭제대상`, is_active: true })
          .expect(201);
        const id = Number((createRes.body as { id: number }).id);

        await request(app.getHttpServer())
          .delete(`/api/admin/announcement-bars/${id}`)
          .set('Cookie', adminCookies)
          .expect(204);
      });

      it('없는 ID 삭제 → 404', async () => {
        await request(app.getHttpServer())
          .delete('/api/admin/announcement-bars/999999')
          .set('Cookie', adminCookies)
          .expect(404);
      });
    });
  });
}
