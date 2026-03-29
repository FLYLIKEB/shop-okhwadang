import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as path from 'path';

let app: INestApplication;
let dataSource: DataSource;

export function registerAdminProductsSuite(getApp: () => INestApplication) {
  describe('Admin Products (e2e)', () => {
    let adminToken: string;
    let userToken: string;
    let createdProductId: number;

    const adminEmail = `admin-products-admin-${Date.now()}@test.com`;
    const userEmail = `admin-products-user-${Date.now()}@test.com`;

    beforeAll(async () => {
      app = getApp();
      dataSource = app.get(DataSource);

      // Register admin user
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: adminEmail, password: 'Test1234!', name: '관리자' });
      await dataSource.query(`UPDATE users SET role = 'admin' WHERE email = ?`, [adminEmail]);
      const adminRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminEmail, password: 'Test1234!' });
      adminToken = (adminRes.body as { accessToken: string }).accessToken;

      // Register regular user
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: userEmail, password: 'Test1234!', name: '일반유저' });
      const userRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: userEmail, password: 'Test1234!' });
      userToken = (userRes.body as { accessToken: string }).accessToken;
    });

    describe('POST /api/products (admin)', () => {
      it('admin → 201 상품 생성', async () => {
        const slug = `test-product-admin-e2e-${Date.now()}`;
        const res = await request(app.getHttpServer())
          .post('/api/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '어드민 테스트 상품',
            slug,
            price: 10000,
            stock: 100,
            status: 'active',
          })
          .expect(201);

        const body = res.body as { id: number; name: string };
        expect(body.id).toBeDefined();
        expect(body.name).toBe('어드민 테스트 상품');
        createdProductId = body.id;
      });

      it('일반 user → 403 거부', async () => {
        await request(app.getHttpServer())
          .post('/api/products')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            name: '일반유저상품',
            slug: `user-product-${Date.now()}`,
            price: 5000,
          })
          .expect(403);
      });

      it('비인증 → 401', async () => {
        await request(app.getHttpServer())
          .post('/api/products')
          .send({
            name: '비인증상품',
            slug: `noauth-product-${Date.now()}`,
            price: 5000,
          })
          .expect(401);
      });
    });

    describe('PATCH /api/products/:id (admin)', () => {
      it('admin → 200 상품 수정', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/products/${createdProductId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: '수정된 상품명', price: 20000 })
          .expect(200);

        const body = res.body as { name: string; price: number };
        expect(body.name).toBe('수정된 상품명');
      });
    });

    describe('DELETE /api/products/:id (admin)', () => {
      it('admin → 200 상품 삭제', async () => {
        const slug = `delete-test-${Date.now()}`;
        const createRes = await request(app.getHttpServer())
          .post('/api/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: '삭제테스트', slug, price: 1000 });
        const deleteId = (createRes.body as { id: number }).id;

        await request(app.getHttpServer())
          .delete(`/api/products/${deleteId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });
    });

    describe('POST /api/upload/image', () => {
      it('gif 업로드 → 400 거부', async () => {
        const gifBuffer = Buffer.from('GIF89a', 'ascii');
        await request(app.getHttpServer())
          .post('/api/upload/image')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('file', gifBuffer, {
            filename: 'test.gif',
            contentType: 'image/gif',
          })
          .expect(400);
      });

      it('일반 user → 403 거부', async () => {
        const buf = Buffer.from('fake');
        await request(app.getHttpServer())
          .post('/api/upload/image')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('file', buf, {
            filename: 'test.jpg',
            contentType: 'image/jpeg',
          })
          .expect(403);
      });
    });
  });
}
