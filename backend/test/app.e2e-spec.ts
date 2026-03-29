import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { registerAuthSuite } from './suites/auth.e2e-spec';
import { registerCartSuite } from './suites/cart.e2e-spec';
import { registerOrdersSuite } from './suites/orders.e2e-spec';
import { registerPaymentsSuite } from './suites/payments.e2e-spec';
import { registerProductsSuite } from './suites/products.e2e-spec';
import { registerShippingSuite } from './suites/shipping.e2e-spec';
import { registerAdminSuite } from './suites/admin.e2e-spec';
import { registerAdminProductsSuite } from './suites/admin-products.e2e-spec';
import { registerAdminCategoriesSuite } from './suites/admin-categories.e2e-spec';
import { registerAdminOrdersSuite } from './suites/admin-orders.e2e-spec';
import { registerAdminMembersSuite } from './suites/admin-members.e2e-spec';
import { registerAdminDashboardSuite } from './suites/admin-dashboard.e2e-spec';
import { registerPagesSuite } from './suites/pages.e2e-spec';
import { registerNavigationSuite } from './suites/navigation.e2e-spec';
import { registerReviewsSuite } from './suites/reviews.e2e-spec';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /api/health → 200', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.db).toBe('connected');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  registerAuthSuite(() => app);
  registerCartSuite(() => app);
  registerOrdersSuite(() => app);
  registerPaymentsSuite(() => app);
  registerShippingSuite(() => app);
  registerProductsSuite(() => app);
  registerAdminSuite(() => app);
  registerAdminProductsSuite(() => app);
  registerAdminCategoriesSuite(() => app);
  registerAdminOrdersSuite(() => app);
  registerAdminMembersSuite(() => app);
  registerAdminDashboardSuite(() => app);
  registerPagesSuite(() => app);
  registerNavigationSuite(() => app);
  registerReviewsSuite(() => app);
});
