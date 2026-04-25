import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { UserAwareThrottlerGuard } from '../src/common/guards/user-aware-throttler.guard';
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
import { registerAttributesSuite } from './suites/attributes.e2e-spec';
import { registerInquiriesSuite } from './suites/inquiries.e2e-spec';
import { registerRefundsSuite } from './suites/refunds.e2e-spec';
import { registerCmsModulesSuite } from './suites/cms-modules.e2e-spec';
import { registerCommerceModulesSuite } from './suites/commerce-modules.e2e-spec';
import { registerRestockAlertsSuite } from './suites/restock-alerts.e2e-spec';
import { registerAnnouncementBarsSuite } from './suites/announcement-bars.e2e-spec';
import { registerAuditLogsSuite } from './suites/audit-logs.e2e-spec';
import { registerMembershipSuite } from './suites/membership.e2e-spec';
import { registerSeoSuite } from './suites/seo.e2e-spec';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserAwareThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(ThrottlerStorage)
      .useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 }), getRecord: async () => [] })
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
  registerAttributesSuite(() => app);
  registerInquiriesSuite(() => app);
  registerRefundsSuite(() => app);
  registerCmsModulesSuite(() => app);
  registerCommerceModulesSuite(() => app);
  registerRestockAlertsSuite(() => app);
  registerAnnouncementBarsSuite(() => app);
  registerAuditLogsSuite(() => app);
  registerMembershipSuite(() => app);
  registerSeoSuite(() => app);
});
