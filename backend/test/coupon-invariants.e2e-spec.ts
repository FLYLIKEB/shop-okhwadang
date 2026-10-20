import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { DataSource, In, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Coupon } from '../src/modules/coupons/entities/coupon.entity';
import { UserCoupon } from '../src/modules/coupons/entities/user-coupon.entity';
import { CouponRule, CouponRuleTrigger } from '../src/modules/coupons/entities/coupon-rule.entity';
import { CouponsService } from '../src/modules/coupons/coupons.service';
import { CouponRulesService } from '../src/modules/coupons/coupon-rules.service';
import { User, UserRole } from '../src/modules/users/entities/user.entity';
import { Order, OrderStatus } from '../src/modules/orders/entities/order.entity';
import { AdminOrdersService } from '../src/modules/admin/admin-orders.service';
import { MembershipService } from '../src/modules/membership/membership.service';
import { OrderSchedulerJob } from '../src/modules/scheduler/jobs/order-scheduler.job';
import { Payment, PaymentStatus } from '../src/modules/payments/entities/payment.entity';
import { Shipping, ShippingStatus } from '../src/modules/payments/entities/shipping.entity';
import { PointsService } from '../src/modules/points/points.service';
import { NotificationService } from '../src/modules/notification/notification.service';
import { MessageNotificationService } from '../src/modules/notification/message-notification.service';
import { SettingsService } from '../src/modules/settings/settings.service';
import { AuditLog } from '../src/modules/audit-logs/entities/audit-log.entity';
import { runFirstTerminalTransitionRecovery } from '../src/modules/payments/services/order-terminal-recovery.util';

const RUN = `coupon-audit-${Date.now()}`;

describe('coupon and membership invariants (MySQL)', () => {
  let app: INestApplication;
  let db: DataSource;
  let coupons: CouponsService;
  let membership: MembershipService;
  let adminOrders: AdminOrdersService;
  let adminCookie: string;
  const userIds: number[] = [];
  const couponIds: number[] = [];
  const orderIds: number[] = [];
  let serial = 0;

  async function user(role = UserRole.USER): Promise<User> {
    const saved = await db.getRepository(User).save(db.getRepository(User).create({
      email: `${RUN}-${++serial}@example.test`, name: '쿠폰 검증 계정', role,
      isActive: true, isEmailVerified: true, emailVerifiedAt: new Date(),
      tier: 'Bronze', tierAccumulatedAmount: 0,
    }));
    userIds.push(Number(saved.id));
    return saved;
  }

  function template(overrides: Record<string, unknown> = {}) {
    return {
      code: `${RUN}-${++serial}`, name: '검증용 쿠폰', type: 'percentage' as const,
      value: 10, startsAt: new Date(Date.now() - 86_400_000).toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(), ...overrides,
    };
  }

  async function coupon(totalQuantity: number | null = null): Promise<number> {
    const saved = await coupons.createCoupon({ ...template(), totalQuantity });
    couponIds.push(saved.id);
    return saved.id;
  }

  async function order(userId: number, status = OrderStatus.PENDING): Promise<Order> {
    const saved = await db.getRepository(Order).save(db.getRepository(Order).create({
      userId, orderNumber: `${RUN}-${++serial}`, orderLocale: 'ko', status,
      totalAmount: 46_000, discountAmount: 7_000, shippingFee: 3_000, pointsUsed: 0,
      recipientName: '검증 수령인', recipientPhone: '01000000000', zipcode: '00000',
      address: '테스트 주소', updatedAt: new Date(Date.now() - 10 * 86_400_000),
    }));
    orderIds.push(Number(saved.id));
    if (status === OrderStatus.DELIVERED) {
      await db.getRepository(Payment).save(db.getRepository(Payment).create({
        orderId: Number(saved.id), amount: 46_000, status: PaymentStatus.CONFIRMED,
      }));
      await db.getRepository(Shipping).save(db.getRepository(Shipping).create({
        orderId: Number(saved.id), status: ShippingStatus.DELIVERED, trackingNumber: '000000000000',
      }));
    }
    return saved;
  }

  function confirmationJob(candidate: Order) {
    return new OrderSchedulerJob({
      // Scope candidate selection to this fixture; all transitions and increments use real MySQL.
      orderRepo: { find: jest.fn().mockResolvedValue([candidate]) } as unknown as Repository<Order>,
      userRepo: db.getRepository(User), dataSource: db,
      membershipService: membership, pointsService: app.get(PointsService),
      notificationService: app.get(NotificationService),
      messageNotificationService: app.get(MessageNotificationService),
      settingsService: app.get(SettingsService), logger: new Logger('CouponInvariantTest'),
    });
  }

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!url.pathname.endsWith('_test')) throw new Error('Coupon tests require a dedicated _test database');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    db = app.get(DataSource);
    coupons = app.get(CouponsService);
    membership = app.get(MembershipService);
    adminOrders = app.get(AdminOrdersService);
    const admin = await user(UserRole.ADMIN);
    adminCookie = `accessToken=${app.get(JwtService).sign({
      sub: Number(admin.id), email: admin.email, role: admin.role, tokenType: 'access', jti: RUN,
    })}`;
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (db) {
      if (couponIds.length) {
        await db.getRepository(CouponRule).delete({ couponTemplateId: In(couponIds) });
        await db.getRepository(UserCoupon).delete({ couponId: In(couponIds) });
        await db.getRepository(Coupon).delete({ id: In(couponIds) });
      }
      if (orderIds.length) {
        await db.getRepository(Shipping).delete({ orderId: In(orderIds) });
        await db.getRepository(Payment).delete({ orderId: In(orderIds) });
        await db.getRepository(Order).delete({ id: In(orderIds) });
      }
      if (userIds.length) {
        await db.getRepository(AuditLog).delete({ actorId: In(userIds) });
        await db.getRepository(User).delete({ id: In(userIds) });
      }
    }
    await app?.close();
  });

  it('rejects invalid create and null PATCH fields at the real HTTP boundary', async () => {
    const invalid = [
      { value: 150 }, { value: 0 }, { value: null }, { type: null }, { code: '   ' },
      { name: '' }, { totalQuantity: 1.5 }, { totalQuantity: 2_147_483_648 },
      { isActive: null }, { minOrderAmount: null },
      { expiresAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
    ];
    for (const fields of invalid) {
      await request(app.getHttpServer()).post('/api/admin/coupons')
        .set('Cookie', adminCookie).send(template(fields)).expect(400);
    }
    const id = await coupon();
    for (const field of ['code', 'name', 'type', 'value', 'minOrderAmount', 'startsAt', 'expiresAt', 'isActive']) {
      await request(app.getHttpServer()).patch(`/api/admin/coupons/${id}`)
        .set('Cookie', adminCookie).send({ [field]: null }).expect(400);
    }
    await request(app.getHttpServer()).patch(`/api/admin/coupons/${id}`)
      .set('Cookie', adminCookie).send({ maxDiscount: null, totalQuantity: null }).expect(200);
  });

  it('returns conflict for duplicate codes and preserves issued date precision on name-only edits', async () => {
    const id = await coupon();
    const original = await coupons.findAdminCoupon(id);
    await request(app.getHttpServer()).post('/api/admin/coupons')
      .set('Cookie', adminCookie).send(template({ code: original.code })).expect(409);
    const member = await user();
    await coupons.issueCoupon({ couponId: id, userId: Number(member.id) });
    await request(app.getHttpServer()).patch(`/api/admin/coupons/${id}`)
      .set('Cookie', adminCookie).send({ name: '이름만 수정' }).expect(200);
    const updated = await coupons.findAdminCoupon(id);
    expect(updated.startsAt.getTime()).toBe(original.startsAt.getTime());
    expect(updated.expiresAt.getTime()).toBe(original.expiresAt.getTime());
    await request(app.getHttpServer()).patch(`/api/admin/coupons/${id}`)
      .set('Cookie', adminCookie).send({ value: 20 }).expect(400);
  });

  it('serializes capacity=1 issuance for two members', async () => {
    const id = await coupon(1);
    const members = await Promise.all([user(), user()]);
    const results = await Promise.allSettled(members.map((member) =>
      coupons.issueCoupon({ couponId: id, userId: Number(member.id) })));
    expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await db.getRepository(UserCoupon).countBy({ couponId: id })).toBe(1);
    expect((await coupons.findAdminCoupon(id)).issuedCount).toBe(1);
  });

  it('does not duplicate one member/template grant under concurrent requests', async () => {
    const id = await coupon();
    const member = await user();
    const issue = () => coupons.issueCoupon({ couponId: id, userId: Number(member.id) });
    const result = await Promise.allSettled([issue(), issue()]);
    expect(result.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect((await coupons.findAdminCoupon(id)).issuedCount).toBe(1);
  });

  it('never deletes a grant after concurrent issuance succeeds', async () => {
    const id = await coupon();
    const member = await user();
    const [issued, removed] = await Promise.allSettled([
      coupons.issueCoupon({ couponId: id, userId: Number(member.id) }), coupons.removeCoupon(id),
    ]);
    expect([issued, removed].filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await db.getRepository(UserCoupon).countBy({ couponId: id })).toBe(issued.status === 'fulfilled' ? 1 : 0);
  });

  it('does not overwrite issuance count when a template update races issuance', async () => {
    const id = await coupon();
    const member = await user();
    await Promise.allSettled([
      coupons.issueCoupon({ couponId: id, userId: Number(member.id) }),
      coupons.updateCoupon(id, { name: '동시 수정' }),
    ]);
    expect((await coupons.findAdminCoupon(id)).issuedCount).toBe(1);
    expect(await db.getRepository(UserCoupon).countBy({ couponId: id })).toBe(1);
  });

  it('uses a coupon only once and does not restore its newer use on old cancellation replay', async () => {
    const member = await user();
    const userId = Number(member.id);
    const id = await coupon();
    const grant = await coupons.issueCoupon({ couponId: id, userId });
    const [first, second] = await Promise.all([order(userId), order(userId)]);
    const uses = await Promise.allSettled([
      coupons.useCoupon(Number(grant.id), userId, Number(first.id)),
      coupons.useCoupon(Number(grant.id), userId, Number(second.id)),
    ]);
    expect(uses.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const used = await db.getRepository(UserCoupon).findOneByOrFail({ id: Number(grant.id) });
    const originalOrderId = Number(used.orderId);
    const cancel = () => db.transaction((manager) => runFirstTerminalTransitionRecovery(manager, {
      orderId: originalOrderId, nextOrderStatus: OrderStatus.CANCELLED,
      pointsService: app.get(PointsService), pointRestoreDescription: '검증 복구',
      applyMutations: async () => {
        await manager.update(Order, originalOrderId, { status: OrderStatus.CANCELLED });
        return true;
      },
    }));
    await cancel();
    const next = await order(userId);
    await coupons.useCoupon(Number(grant.id), userId, Number(next.id));
    await cancel();
    const reused = await db.getRepository(UserCoupon).findOneByOrFail({ id: Number(grant.id) });
    expect(reused.status).toBe('used');
    expect(Number(reused.orderId)).toBe(Number(next.id));
  });

  it('persists a replacement rule template and grants only the replacement without changing prior grants', async () => {
    const originalId = await coupon();
    const replacementId = await coupon();
    const previousMember = await user();
    const previousGrant = await coupons.issueCoupon({ couponId: originalId, userId: Number(previousMember.id) });
    const previousSnapshot = await db.getRepository(UserCoupon).findOneByOrFail({ id: Number(previousGrant.id) });
    const rules = db.getRepository(CouponRule);
    const rule = await rules.save(rules.create({
      trigger: CouponRuleTrigger.SIGNUP, couponTemplateId: originalId, active: true, conditionsJson: null,
    }));

    const response = await request(app.getHttpServer()).patch(`/api/admin/coupon-rules/${rule.id}`)
      .set('Cookie', adminCookie).send({ couponTemplateId: replacementId }).expect(200);
    expect(response.body.couponTemplateId).toBe(replacementId);
    expect(response.body.couponTemplate.id).toBe(replacementId);
    const saved = await rules.findOneOrFail({ where: { id: Number(rule.id) }, relations: ['couponTemplate'] });
    expect(Number(saved.couponTemplateId)).toBe(replacementId);
    expect(Number(saved.couponTemplate.id)).toBe(replacementId);
    expect(saved).toMatchObject({ id: rule.id, trigger: rule.trigger, active: rule.active, conditionsJson: null });

    const nextMember = await user();
    await app.get(CouponRulesService).applyRulesForUser(CouponRuleTrigger.SIGNUP, Number(nextMember.id));
    const grants = await db.getRepository(UserCoupon).findBy({ userId: Number(nextMember.id) });
    expect(grants.map((grant) => Number(grant.couponId))).toContain(replacementId);
    expect(grants.map((grant) => Number(grant.couponId))).not.toContain(originalId);
    expect(await db.getRepository(UserCoupon).findOneByOrFail({ id: Number(previousGrant.id) })).toEqual(previousSnapshot);
  });

  it('deactivates a legacy birthday rule but rejects new or reactivated birthday rules', async () => {
    const id = await coupon();
    const legacy = await db.getRepository(CouponRule).save(db.getRepository(CouponRule).create({
      trigger: CouponRuleTrigger.BIRTHDAY, couponTemplateId: id, active: true, conditionsJson: null,
    }));
    await request(app.getHttpServer()).patch(`/api/admin/coupon-rules/${legacy.id}`)
      .set('Cookie', adminCookie).send({ active: false }).expect(200);
    await request(app.getHttpServer()).patch(`/api/admin/coupon-rules/${legacy.id}`)
      .set('Cookie', adminCookie).send({ active: true }).expect(400);
    await request(app.getHttpServer()).post('/api/admin/coupon-rules')
      .set('Cookie', adminCookie).send({ trigger: 'birthday', couponTemplateId: id }).expect(400);
  });

  it('rejects activating malformed legacy rule conditions but still allows deactivation', async () => {
    const id = await coupon();
    for (const conditions of [false, 0, []]) {
      const legacy = await db.getRepository(CouponRule).save(db.getRepository(CouponRule).create({
        trigger: CouponRuleTrigger.TIER_UP, couponTemplateId: id, active: false,
        conditionsJson: conditions as unknown as Record<string, unknown>,
      }));
      await request(app.getHttpServer()).patch(`/api/admin/coupon-rules/${legacy.id}`)
        .set('Cookie', adminCookie).send({ active: true }).expect(400);
      await request(app.getHttpServer()).patch(`/api/admin/coupon-rules/${legacy.id}`)
        .set('Cookie', adminCookie).send({ active: false }).expect(200);
    }
  });

  it('accrues the paid total once when admin and cron complete the same order', async () => {
    const member = await user();
    const candidate = await order(Number(member.id), OrderStatus.DELIVERED);
    jest.spyOn(app.get(NotificationService), 'sendOrderConfirmed').mockResolvedValue(undefined);
    await Promise.allSettled([
      adminOrders.updateStatus(Number(candidate.id), OrderStatus.COMPLETED),
      confirmationJob(candidate).handleDeliveredOrderAutoConfirm(),
    ]);
    const saved = await db.getRepository(Order).findOneByOrFail({ id: Number(candidate.id) });
    const account = await db.getRepository(User).findOneByOrFail({ id: Number(member.id) });
    expect(saved.status).toBe(OrderStatus.COMPLETED);
    expect(Number(account.tierAccumulatedAmount)).toBe(46_000);
  });

  it.each(['admin', 'cron'])('rolls back order status and accrual together on %s failure', async (source) => {
    const member = await user();
    const candidate = await order(Number(member.id), OrderStatus.DELIVERED);
    const increment = membership.incrementAccumulatedAmount.bind(membership);
    jest.spyOn(membership, 'incrementAccumulatedAmount').mockImplementationOnce(async (...args) => {
      await increment(...args);
      throw new Error('forced accrual failure');
    });
    await Promise.allSettled([source === 'admin'
      ? adminOrders.updateStatus(Number(candidate.id), OrderStatus.COMPLETED)
      : confirmationJob(candidate).handleDeliveredOrderAutoConfirm()]);
    expect((await db.getRepository(Order).findOneByOrFail({ id: Number(candidate.id) })).status)
      .toBe(OrderStatus.DELIVERED);
    expect(Number((await db.getRepository(User).findOneByOrFail({ id: Number(member.id) })).tierAccumulatedAmount))
      .toBe(0);
  });
});
