import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PointHistory } from '../../coupons/entities/point-history.entity';
import { User } from '../../users/entities/user.entity';
import { PointsService } from '../points.service';
import { AuditLogService } from '../../audit-logs/audit-log.service';
import { AuditAction } from '../../audit-logs/entities/audit-log.entity';

describe('PointsService admin contract', () => {
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
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '1200' }),
    })),
  };
  const dataSource = {
    transaction: jest.fn(async (cb: (tx: typeof manager) => Promise<unknown>) => cb(manager)),
  };

  let service: PointsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    userRepo.findOne.mockResolvedValue({ id: 42 });
    manager.findOne
      .mockResolvedValueOnce({ id: 42 })
      .mockResolvedValueOnce({ balance: 1200 });
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
    manager.findOne.mockReset();
    manager.findOne
      .mockResolvedValueOnce({ id: 42 })
      .mockResolvedValueOnce({ balance: 2200 });
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
    manager.findOne.mockReset();
    manager.findOne
      .mockResolvedValueOnce({ id: 42 })
      .mockResolvedValueOnce({ balance: 2000 })
      .mockResolvedValueOnce({ balance: 2000 })
      .mockResolvedValueOnce({
        id: 92,
        userId: 42,
        type: 'spend',
        amount: -300,
        balance: 1700,
        description: '관리자 수동 포인트 조정: 사후 차감',
        createdAt: new Date('2026-07-25T00:00:00.000Z'),
        orderId: null,
        relatedEntityType: null,
        relatedEntityId: null,
      });
    auditLogService.logWithManager.mockResolvedValueOnce({ id: 89 });

    const result = await service.adjustPointsManually(
      { actorId: 7, actorRole: 'admin' },
      { userId: 42, delta: -300, reason: '사후 차감' },
    );

    expect(result).toMatchObject({
      pointHistoryId: 92,
      auditLogId: 89,
      delta: -300,
      balanceAfter: 900,
    });
  });

  it('rejects manual debits when the effective balance is insufficient', async () => {
    manager.findOne.mockReset();
    manager.findOne
      .mockResolvedValueOnce({ id: 42 })
      .mockResolvedValueOnce({ balance: 200 });
    manager.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '200' }),
    });

    await expect(
      service.adjustPointsManually(
        { actorId: 7, actorRole: 'admin' },
        { userId: 42, delta: -300, reason: '잔액 부족 차감' },
      ),
    ).rejects.toThrow('적립금이 부족합니다.');
    expect(auditLogService.logWithManager).not.toHaveBeenCalled();
  });

  it('propagates audit failure so the transaction can roll back', async () => {
    manager.findOne.mockReset();
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
