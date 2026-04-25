import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuditAction } from '../../src/modules/audit-logs/entities/audit-log.entity';

let app: INestApplication;
let dataSource: DataSource;

function buildAccessCookie(jwtService: JwtService, userId: number, email: string, role: string): string[] {
  return [
    `accessToken=${jwtService.sign({ sub: userId, email, role, tokenType: 'access', jti: `audit-${userId}-${Date.now()}` })}`,
  ];
}

export function registerAuditLogsSuite(getApp: () => INestApplication) {
  describe('Audit logs (e2e)', () => {
    const unique = Date.now();
    const adminEmail = `audit-admin-${unique}@test.com`;
    const userEmail = `audit-user-${unique}@test.com`;
    const createdUserIds: number[] = [];
    const createdAuditLogIds: number[] = [];

    let adminCookies: string[];
    let userCookies: string[];
    let adminUserId: number;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);
      const jwtService = app.get(JwtService);
      const passwordHash = await bcrypt.hash('Test1234!', 10);

      const adminInsert = await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 1, 0, 1, NOW(), NOW(), NOW())`,
        [adminEmail, passwordHash, '감사 관리자'],
      );
      adminUserId = Number(adminInsert.insertId);
      createdUserIds.push(adminUserId);
      adminCookies = buildAccessCookie(jwtService, adminUserId, adminEmail, 'admin');

      const userInsert = await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'user', 1, 0, 1, NOW(), NOW(), NOW())`,
        [userEmail, passwordHash, '일반 사용자'],
      );
      const userId = Number(userInsert.insertId);
      createdUserIds.push(userId);
      userCookies = buildAccessCookie(jwtService, userId, userEmail, 'user');

      const logInsert = await dataSource.query(
        `INSERT INTO audit_logs (actorId, actorRole, action, resourceType, resourceId, beforeJson, afterJson, ip, userAgent, createdAt)
         VALUES (?, 'admin', ?, 'order', 91001, ?, ?, '127.0.0.1', 'e2e-agent', NOW())`,
        [
          adminUserId,
          AuditAction.ORDER_STATUS_UPDATE,
          JSON.stringify({ status: 'pending' }),
          JSON.stringify({ status: 'paid' }),
        ],
      );
      createdAuditLogIds.push(Number(logInsert.insertId));
    });

    afterAll(async () => {
      if (createdAuditLogIds.length > 0) {
        await dataSource.query(
          `DELETE FROM audit_logs WHERE id IN (${createdAuditLogIds.map(() => '?').join(',')})`,
          createdAuditLogIds,
        );
      }
      if (createdUserIds.length > 0) {
        await dataSource.query(
          `DELETE FROM users WHERE id IN (${createdUserIds.map(() => '?').join(',')})`,
          createdUserIds,
        );
      }
    });

    describe('GET /api/admin/audit-logs', () => {
      it('관리자 → 200 감사 로그 목록과 페이지네이션 반환', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/admin/audit-logs')
          .query({ actorId: adminUserId, action: AuditAction.ORDER_STATUS_UPDATE, resourceType: 'order' })
          .set('Cookie', adminCookies)
          .expect(200);

        const body = res.body as {
          data: Array<{ id: number; actorId: number; action: string; resourceType: string; resourceId: number }>;
          total: number;
          page: number;
          limit: number;
        };
        expect(body.page).toBe(1);
        expect(body.limit).toBe(20);
        expect(body.total).toBeGreaterThanOrEqual(1);
        expect(body.data.some((log) => Number(log.id) === createdAuditLogIds[0])).toBe(true);
        expect(body.data[0]).toMatchObject({
          actorId: adminUserId,
          action: AuditAction.ORDER_STATUS_UPDATE,
          resourceType: 'order',
        });
      });

      it('일반 user → 403', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/audit-logs')
          .set('Cookie', userCookies)
          .expect(403);
      });

      it('비인증 → 401', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/audit-logs')
          .expect(401);
      });

      it('잘못된 action 필터 → 400', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/audit-logs')
          .query({ action: 'NOT_A_REAL_ACTION' })
          .set('Cookie', adminCookies)
          .expect(400);
      });
    });
  });
}
