import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MockEmailAdapter } from '../../src/modules/notification/adapters/mock.adapter';

let app: INestApplication;
let dataSource: DataSource;
let mockEmailAdapter: MockEmailAdapter;

function buildAccessCookie(jwtService: JwtService, userId: number, email: string, role: string): string[] {
  return [
    `accessToken=${jwtService.sign({ sub: userId, email, role, tokenType: 'access', jti: `restock-${userId}-${Date.now()}` })}`,
  ];
}

export function registerRestockAlertsSuite(getApp: () => INestApplication) {
  describe('Restock alerts (e2e)', () => {
    const unique = Date.now();
    const adminEmail = `restock-admin-${unique}@test.com`;
    const userEmail = `restock-user-${unique}@test.com`;
    const productSlug = `restock-product-${unique}`;

    let adminCookies: string[];
    let userCookies: string[];
    let adminUserId: number;
    let userId: number;
    let productId: number;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);
      mockEmailAdapter = app.get(MockEmailAdapter);
      mockEmailAdapter.clear();
      const jwtService = app.get(JwtService);
      const passwordHash = await bcrypt.hash('Test1234!', 10);

      const adminInsert = await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 1, 0, 1, NOW(), NOW(), NOW())`,
        [adminEmail, passwordHash, '재입고 관리자'],
      );
      adminUserId = Number(adminInsert.insertId);
      adminCookies = buildAccessCookie(jwtService, adminUserId, adminEmail, 'admin');

      const userInsert = await dataSource.query(
        `INSERT INTO users (email, password, name, role, is_active, failed_login_attempts, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'user', 1, 0, 1, NOW(), NOW(), NOW())`,
        [userEmail, passwordHash, '재입고 사용자'],
      );
      userId = Number(userInsert.insertId);
      userCookies = buildAccessCookie(jwtService, userId, userEmail, 'user');

      const productRes = await request(app.getHttpServer())
        .post('/api/products')
        .set('Cookie', adminCookies)
        .send({ name: `재입고 상품 ${unique}`, slug: productSlug, price: 20000, stock: 0, status: 'active' })
        .expect(201);
      productId = Number((productRes.body as { id: number }).id);
    });

    afterAll(async () => {
      await dataSource.query('DELETE FROM restock_alerts WHERE user_id = ?', [userId]);
      await dataSource.query('DELETE FROM products WHERE id = ?', [productId]);
      await dataSource.query('DELETE FROM users WHERE id IN (?, ?)', [adminUserId, userId]);
    });

    it('subscribes a user and marks notification sent when stock recovers from 0', async () => {
      const subscribeRes = await request(app.getHttpServer())
        .post(`/api/products/${productId}/restock-alert`)
        .set('Cookie', userCookies)
        .send({})
        .expect(201);
      const alertId = Number((subscribeRes.body as { id: number }).id);

      await request(app.getHttpServer())
        .get('/api/users/me/restock-alerts')
        .set('Cookie', userCookies)
        .expect(200)
        .expect((res) => {
          expect((res.body as Array<{ id: number }>).some((item) => Number(item.id) === alertId)).toBe(true);
        });

      await request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .set('Cookie', adminCookies)
        .send({ stock: 3 })
        .expect(200)
        .expect((res) => {
          expect((res.body as { stock: number }).stock).toBe(3);
        });

      expect(mockEmailAdapter.getSent()).toHaveLength(1);
      expect(mockEmailAdapter.getSent()[0].subject).toContain('재입고');
      expect(mockEmailAdapter.getSent()[0].to).toBe(userEmail);

      await request(app.getHttpServer())
        .get('/api/users/me/restock-alerts')
        .set('Cookie', userCookies)
        .expect(200)
        .expect((res) => {
          const alert = (res.body as Array<{ id: number; notifiedAt: string | null }>).find((item) => Number(item.id) === alertId);
          expect(alert?.notifiedAt).toBeTruthy();
        });

      await request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .set('Cookie', adminCookies)
        .send({ stock: 5 })
        .expect(200);

      expect(mockEmailAdapter.getSent()).toHaveLength(1);
    });

    it('rejects new subscriptions when the product is already in stock', async () => {
      await request(app.getHttpServer())
        .post(`/api/products/${productId}/restock-alert`)
        .set('Cookie', userCookies)
        .send({})
        .expect(400);
    });
  });
}
