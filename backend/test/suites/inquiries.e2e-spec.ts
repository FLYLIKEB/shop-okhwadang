import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  AuthCookies,
  cookieHeader,
  loginAndGetCookies,
} from '../helpers/auth-cookie.helper';

// Pre-hashed 'Test1234!' with bcrypt rounds=10
const TEST_PASSWORD_HASH = '$2b$10$HdzN6WGZunyatQk56WrsXO.h.9E/gUvsyEF0xFTAM4Cm7cTa3gMbm';

export function registerInquiriesSuite(getApp: () => INestApplication) {
  describe('Inquiries (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let userCookies: AuthCookies;
    let adminCookies: AuthCookies;
    let userId: number;
    let inquiryId: number;

    const userEmail = `inquiry-user-${Date.now()}@e2e.com`;
    const adminEmail = `inquiry-admin-${Date.now()}@e2e.com`;
    const password = 'Test1234!';

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Insert users directly to avoid hitting auth rate-limit in throttle-active test env
      await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_email_verified, email_verified_at, created_at, updated_at) VALUES (?, ?, '문의테스터', 'user', 1, NOW(), NOW(), NOW())`,
        [userEmail, TEST_PASSWORD_HASH],
      );
      await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_email_verified, email_verified_at, created_at, updated_at) VALUES (?, ?, '관리자', 'admin', 1, NOW(), NOW(), NOW())`,
        [adminEmail, TEST_PASSWORD_HASH],
      );

      const [userRow] = await dataSource.query<[{ id: number }]>(
        `SELECT id FROM users WHERE email = ?`,
        [userEmail],
      );
      userId = userRow.id;

      userCookies = await loginAndGetCookies(app, { email: userEmail, password });
      adminCookies = await loginAndGetCookies(app, { email: adminEmail, password });
    });

    afterAll(async () => {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query(`DELETE FROM inquiries WHERE user_id = ?`, [userId]);
      await dataSource.query(`DELETE FROM users WHERE email IN (?, ?)`, [userEmail, adminEmail]);
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('POST /api/inquiries', () => {
      it('401 - 인증 없이 문의 작성 시도', () => {
        return request(app.getHttpServer())
          .post('/api/inquiries')
          .send({ type: '상품', title: '제목', content: '내용' })
          .expect(401);
      });

      it('201 - 문의 작성 성공', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/inquiries')
          .set('Cookie', cookieHeader(userCookies))
          .send({ type: '상품', title: '테스트 문의', content: '문의 내용입니다.' })
          .expect(201);

        const body = res.body as { id: number; status: string };
        expect(body.id).toBeDefined();
        expect(body.status).toBe('pending');
        inquiryId = body.id;
      });
    });

    describe('GET /api/inquiries', () => {
      it('200 - 내 문의 목록 조회', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/inquiries')
          .set('Cookie', cookieHeader(userCookies))
          .expect(200);

        const body = res.body as Array<{ id: number }>;
        expect(Array.isArray(body)).toBe(true);
        expect(body.some((i) => i.id === inquiryId)).toBe(true);
      });
    });

    describe('GET /api/inquiries/:id (before answer)', () => {
      it('200 - 문의 상세 조회, customerReadAt 없음', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/inquiries/${inquiryId}`)
          .set('Cookie', cookieHeader(userCookies))
          .expect(200);

        const body = res.body as { id: number; customerReadAt: null };
        expect(body.id).toBe(inquiryId);
        expect(body.customerReadAt).toBeNull();
      });

      it('403 - 타인 문의 조회 금지', async () => {
        // Admin is a different user trying to access as customer
        return request(app.getHttpServer())
          .get(`/api/inquiries/${inquiryId}`)
          .set('Cookie', cookieHeader(adminCookies))
          .expect(403);
      });
    });

    describe('POST /api/admin/inquiries/:id/answer', () => {
      it('401 - 인증 없이 답변 시도', () => {
        return request(app.getHttpServer())
          .post(`/api/admin/inquiries/${inquiryId}/answer`)
          .send({ answer: '답변입니다.' })
          .expect(401);
      });

      it('201 - 관리자 답변 성공', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/admin/inquiries/${inquiryId}/answer`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ answer: '문의 답변 드립니다.' })
          .expect(201);

        const body = res.body as { id: number; status: string; answeredAt: string };
        expect(body.id).toBe(inquiryId);
        expect(body.status).toBe('answered');
        expect(body.answeredAt).toBeDefined();
      });
    });

    describe('GET /api/inquiries/:id (after answer) → customerReadAt 갱신', () => {
      it('200 - 조회 후 customerReadAt 자동 설정', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/inquiries/${inquiryId}`)
          .set('Cookie', cookieHeader(userCookies))
          .expect(200);

        const body = res.body as { id: number; customerReadAt: string | null };
        expect(body.id).toBe(inquiryId);
        expect(body.customerReadAt).not.toBeNull();
      });

      it('200 - 재조회 시 customerReadAt 유지 (변경 없음)', async () => {
        const res1 = await request(app.getHttpServer())
          .get(`/api/inquiries/${inquiryId}`)
          .set('Cookie', cookieHeader(userCookies))
          .expect(200);

        const res2 = await request(app.getHttpServer())
          .get(`/api/inquiries/${inquiryId}`)
          .set('Cookie', cookieHeader(userCookies))
          .expect(200);

        const body1 = res1.body as { customerReadAt: string };
        const body2 = res2.body as { customerReadAt: string };
        expect(body1.customerReadAt).toBe(body2.customerReadAt);
      });
    });

    describe('GET /api/admin/inquiries?unread=true (미확인 답변 필터)', () => {
      it('200 - 고객 확인 전: 미확인 목록에 포함', async () => {
        // Create a new inquiry and answer it without customer reading
        const newInquiry = await request(app.getHttpServer())
          .post('/api/inquiries')
          .set('Cookie', cookieHeader(userCookies))
          .send({ type: '배송', title: '배송 문의', content: '배송 언제 되나요?' })
          .expect(201);
        const newInquiryBody = newInquiry.body as { id: number };
        const newId = newInquiryBody.id;

        await request(app.getHttpServer())
          .post(`/api/admin/inquiries/${newId}/answer`)
          .set('Cookie', cookieHeader(adminCookies))
          .send({ answer: '곧 발송 예정입니다.' })
          .expect(201);

        const res = await request(app.getHttpServer())
          .get('/api/admin/inquiries?unread=true')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as { items: Array<{ id: number }> };
        expect(Array.isArray(body.items)).toBe(true);
        expect(body.items.some((i) => i.id === newId)).toBe(true);
      });

      it('200 - 고객 확인 후: 미확인 목록에서 제외', async () => {
        // Customer reads the already-answered original inquiry (customerReadAt was set above)
        const res = await request(app.getHttpServer())
          .get('/api/admin/inquiries?unread=true')
          .set('Cookie', cookieHeader(adminCookies))
          .expect(200);

        const body = res.body as { items: Array<{ id: number }> };
        // The first inquiry (inquiryId) should NOT be in unread since customer already read it
        expect(body.items.every((i) => i.id !== inquiryId)).toBe(true);
      });
    });
  });
}
