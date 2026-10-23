import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AdminCouponRulesController } from '../coupon-rules.controller';
import { CouponRulesService } from '../coupon-rules.service';
import { Coupon } from '../entities/coupon.entity';
import { CouponRule, CouponRuleTrigger } from '../entities/coupon-rule.entity';
import { CouponsService } from '../coupons.service';
import { MembershipEventEmitter } from '../../membership/membership-event.emitter';
import { MembershipService } from '../../membership/membership.service';
import { AuthEventEmitter } from '../../auth/auth-event.emitter';
import { OrderEventEmitter } from '../../orders/order-event.emitter';
import { SchedulerLockService } from '../../../common/services/scheduler-lock.service';

describe('Coupon rule PATCH validation', () => {
  let app: INestApplication;
  let rule: Partial<CouponRule>;
  const repository = { findOne: jest.fn(), save: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminCouponRulesController],
      providers: [
        CouponRulesService,
        { provide: getRepositoryToken(CouponRule), useValue: repository },
        { provide: getRepositoryToken(Coupon), useValue: {} },
        { provide: CouponsService, useValue: {} },
        { provide: MembershipEventEmitter, useValue: { onTierUpgraded: jest.fn() } },
        { provide: MembershipService, useValue: { findAllTiers: jest.fn().mockResolvedValue([{ name: 'Silver', minAmount: 300000 }]) } },
        { provide: AuthEventEmitter, useValue: { onUserRegistered: jest.fn() } },
        { provide: OrderEventEmitter, useValue: { onOrderCompleted: jest.fn() } },
        { provide: SchedulerLockService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    rule = { id: 1, trigger: CouponRuleTrigger.TIER_UP, active: true, couponTemplateId: 10, conditionsJson: { minTier: 'Silver' } };
    repository.findOne.mockImplementation(async () => rule);
    repository.save.mockImplementation(async (saved: CouponRule) => saved);
  });

  afterAll(async () => app.close());

  it.each(['trigger', 'active', 'couponTemplateId'])('rejects null %s before any repository access', async (field) => {
    await request(app.getHttpServer()).patch('/admin/coupon-rules/1').send({ [field]: null }).expect(400);
    expect(repository.findOne).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects null active on creation before any repository access', async () => {
    await request(app.getHttpServer()).post('/admin/coupon-rules')
      .send({ trigger: 'signup', couponTemplateId: 10, active: null }).expect(400);
    expect(repository.findOne).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('preserves omitted fields', async () => {
    const response = await request(app.getHttpServer()).patch('/admin/coupon-rules/1').send({}).expect(200);
    expect(response.body).toMatchObject({ trigger: 'tier_up', active: true, conditionsJson: { minTier: 'Silver' } });
  });

  it('accepts a supported trigger, false, and explicit condition clearing', async () => {
    const response = await request(app.getHttpServer()).patch('/admin/coupon-rules/1')
      .send({ trigger: 'signup', active: false, conditionsJson: null }).expect(200);
    expect(response.body).toMatchObject({ trigger: 'signup', active: false, conditionsJson: null });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'signup', active: false, conditionsJson: null }));
  });

  it('clears conditions with null while preserving the omitted trigger and active flag', async () => {
    const response = await request(app.getHttpServer()).patch('/admin/coupon-rules/1')
      .send({ conditionsJson: null }).expect(200);
    expect(response.body).toMatchObject({ trigger: 'tier_up', active: true, conditionsJson: null });
  });
});
