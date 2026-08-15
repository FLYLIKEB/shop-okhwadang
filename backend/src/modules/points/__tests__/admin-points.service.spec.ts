import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PointHistory } from '../../coupons/entities/point-history.entity';
import { User } from '../../users/entities/user.entity';
import { PointsService } from '../points.service';
import { AuditLogService } from '../../audit-logs/audit-log.service';
import { AuditAction } from '../../audit-logs/entities/audit-log.entity';

describe('PointsService admin contract', () => {
  let lots: Array<{
    id: number;
    userId: number;
    type: 'earn' | 'admin_adjust';
    amount: number;
    remainingAmount: number;
    balance: number;
    expiresAt: Date | null;
    createdAt: Date;
  }>;
  let nextPointHistoryId: number;
  const pointHistoryRepo = {
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
    })),
  };
  const userRepo = {
    findOne: jest.fn(),
  };
  const auditLogService = {
    logWithManager: jest.fn(),
  };
  const manager = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(async (cb: (tx: typeof manager) => Promise<unknown>) => cb(manager)),
  };

  let service: PointsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    pointHistoryRepo.findAndCount.mockReset();
    userRepo.findOne.mockReset();
    manager.findOne.mockReset();
    manager.findAndCount.mockReset();
    manager.save.mockReset();
    manager.createQueryBuilder.mockReset();
    auditLogService.logWithManager.mockReset();
    lots = [];
    nextPointHistoryId = 1;
    manager.createQueryBuilder.mockImplementation(() => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({
          total: String(
            lots
              .filter(
                (lot) =>
                  lot.remainingAmount > 0 &&
                  (lot.expiresAt === null || lot.expiresAt > new Date()),
              )
              .reduce((total, lot) => total + lot.remainingAmount, 0),
          ),
        })),
        getMany: jest.fn(async () =>
          lots.filter(
            (lot) =>
              lot.remainingAmount > 0 && (lot.expiresAt === null || lot.expiresAt > new Date()),
          ),
        ),
      };
      return queryBuilder;
    });
    manager.save.mockImplementation(async (_target, entity?) => {
      const saved = entity ?? _target;
      if (entity && !('id' in saved)) {
        return {
          ...saved,
          id: nextPointHistoryId++,
          createdAt: new Date('2026-07-25T00:00:00.000Z'),
        };
      }
      return saved;
    });
    userRepo.findOne.mockResolvedValue({ id: 42 });
    auditLogService.logWithManager.mockResolvedValue({ id: 88 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        { provide: getRepositoryToken(PointHistory), useValue: pointHistoryRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(PointsService);
  });

  it('returns paginated admin point history with exact sourceKind values', async () => {
    pointHistoryRepo.findAndCount.mockResolvedValueOnce([
      [
        {
          id: 1,
          userId: 42,
          type: 'earn',
          amount: 3000,
          balance: 9000,
          description: '리뷰 적립',
          createdAt: new Date('2026-07-25T00:00:00.000Z'),
          orderId: null,
          relatedEntityType: 'review',
          relatedEntityId: 77,
        },
      ],
      1,
    ]);

    await expect(service.getUserPointHistoryForAdmin(42, 2, 10)).resolves.toEqual({
      items: [expect.objectContaining({ sourceKind: 'review_reward_earn' })],
      total: 1,
      page: 2,
      limit: 10,
    });
  });

  it('returns admin adjustment response with audit metadata and delta fields', async () => {
    lots = [
      {
        id: 1,
        userId: 42,
        type: 'earn',
        amount: 1200,
        remainingAmount: 1200,
        balance: 1200,
        expiresAt: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ];
    manager.findOne
      .mockResolvedValueOnce({ id: 42 })
      .mockResolvedValueOnce({ balance: 1200 });
    manager.save.mockResolvedValueOnce({
      id: 91,
      userId: 42,
      type: 'earn',
      amount: 500,
      balance: 2700,
      description: '관리자 수동 포인트 조정: CS 보상 지급',
      createdAt: new Date('2026-07-25T00:00:00.000Z'),
      orderId: null,
      relatedEntityType: null,
      relatedEntityId: null,
    });

    const result = await service.adjustPointsManually(
      { actorId: 7, actorRole: 'admin', ip: '203.0.113.10', userAgent: 'jest' },
      { userId: 42, delta: 500, reason: 'CS 보상 지급' },
    );

    expect(auditLogService.logWithManager).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        action: AuditAction.POINT_MANUAL_ADJUSTMENT,
        resourceType: 'point_history',
        resourceId: 91,
        afterJson: expect.objectContaining({ delta: 500, balanceAfter: 1700, pointHistoryId: 91 }),
      }),
    );
    expect(result).toMatchObject({
      pointHistoryId: 91,
      auditLogId: 88,
      userId: 42,
      delta: 500,
      balanceAfter: 1700,
    });
  });
  it('returns negative adjustments with manual_debit semantics and delta fields', async () => {
    lots = [
      {
        id: 1,
        userId: 42,
        type: 'earn',
        amount: 100,
        remainingAmount: 100,
        balance: 100,
        expiresAt: new Date('2099-08-16T00:00:00.000Z'),
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      },
      {
        id: 2,
        userId: 42,
        type: 'earn',
        amount: 1900,
        remainingAmount: 1900,
        balance: 2000,
        expiresAt: null,
        createdAt: new Date('2026-07-02T00:00:00.000Z'),
      },
    ];
    nextPointHistoryId = 92;
    manager.findOne
      .mockResolvedValueOnce({ id: 42 })
      .mockResolvedValueOnce({ balance: 2000 });
    auditLogService.logWithManager.mockResolvedValueOnce({ id: 89 });

    const result = await service.adjustPointsManually(
      { actorId: 7, actorRole: 'admin' },
      { userId: 42, delta: -300, reason: '사후 차감' },
    );

    expect(result).toMatchObject({
      pointHistoryId: 92,
      auditLogId: 89,
      delta: -300,
      balanceAfter: 1700,
    });
    expect(lots.map((lot) => lot.remainingAmount)).toEqual([0, 1700]);
    expect(manager.findOne).toHaveBeenNthCalledWith(1, User, {
      where: { id: 42 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.save).toHaveBeenNthCalledWith(
      3,
      PointHistory,
      expect.objectContaining({
        type: 'spend',
        amount: -300,
        remainingAmount: null,
        balance: 1700,
      }),
    );
  });

  it('rejects manual debits when the effective balance is insufficient', async () => {
    lots = [
      {
        id: 1,
        userId: 42,
        type: 'earn',
        amount: 200,
        remainingAmount: 200,
        balance: 200,
        expiresAt: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ];
    manager.findOne.mockResolvedValueOnce({ id: 42 });

    await expect(
      service.adjustPointsManually(
        { actorId: 7, actorRole: 'admin' },
        { userId: 42, delta: -300, reason: '잔액 부족 차감' },
      ),
    ).rejects.toThrow('적립금이 부족합니다.');
    expect(manager.save).not.toHaveBeenCalled();
    expect(auditLogService.logWithManager).not.toHaveBeenCalled();
  });

  it('propagates audit failure so the transaction can roll back', async () => {
    lots = [
      {
        id: 1,
        userId: 42,
        type: 'earn',
        amount: 2200,
        remainingAmount: 2200,
        balance: 2200,
        expiresAt: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ];
    manager.findOne
      .mockResolvedValueOnce({ id: 42 })
      .mockResolvedValueOnce({ balance: 2200 });
    manager.save.mockResolvedValueOnce({
      id: 93,
      userId: 42,
      type: 'earn',
      amount: 500,
      balance: 2700,
      description: '관리자 수동 포인트 조정: 감사 실패',
      createdAt: new Date('2026-07-25T00:00:00.000Z'),
      orderId: null,
      relatedEntityType: null,
      relatedEntityId: null,
    });
    auditLogService.logWithManager.mockRejectedValueOnce(new Error('audit failed'));

    await expect(
      service.adjustPointsManually(
        { actorId: 7, actorRole: 'admin' },
        { userId: 42, delta: 500, reason: '감사 실패' },
      ),
    ).rejects.toThrow('audit failed');
  });

  it('propagates point-history write failure before audit logging', async () => {
    lots = [
      {
        id: 1,
        userId: 42,
        type: 'earn',
        amount: 1200,
        remainingAmount: 1200,
        balance: 1200,
        expiresAt: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ];
    manager.findOne
      .mockResolvedValueOnce({ id: 42 })
      .mockResolvedValueOnce({ balance: 1200 });
    manager.save.mockRejectedValueOnce(new Error('point history save failed'));

    await expect(
      service.adjustPointsManually(
        { actorId: 7, actorRole: 'admin' },
        { userId: 42, delta: 500, reason: '저장 실패' },
      ),
    ).rejects.toThrow('point history save failed');
    expect(auditLogService.logWithManager).not.toHaveBeenCalled();
  });
});
