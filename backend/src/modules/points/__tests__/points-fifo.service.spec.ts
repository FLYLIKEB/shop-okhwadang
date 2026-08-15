import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditLogService } from '../../audit-logs/audit-log.service';
import { PointHistory } from '../../coupons/entities/point-history.entity';
import { User } from '../../users/entities/user.entity';
import { PointsService } from '../points.service';

const queryBuilder = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  setParameter: jest.fn().mockReturnThis(),
  setLock: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  getRawOne: jest.fn(),
  getMany: jest.fn(),
};
const pointHistoryRepo = { createQueryBuilder: jest.fn(() => queryBuilder), find: jest.fn() };
const userRepo = { findOne: jest.fn() };
const manager = {
  findOne: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => queryBuilder),
};
const dataSource = { transaction: jest.fn() };
const auditLogService = { logWithManager: jest.fn() };

const lot = (id: number, remainingAmount: number, expiresAt: Date | null): PointHistory =>
  ({
    id,
    userId: 1,
    type: 'earn',
    amount: remainingAmount,
    remainingAmount,
    balance: remainingAmount,
    description: null,
    expiresAt,
    orderId: null,
    relatedEntityType: null,
    relatedEntityId: null,
    createdAt: new Date(`2026-01-0${id}T00:00:00.000Z`),
  }) as PointHistory;

describe('PointsService canonical FIFO lots', () => {
  let service: PointsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    manager.findOne.mockResolvedValue({ id: 1 });
    manager.save.mockImplementation(
      async (_target: unknown, value?: PointHistory) => value ?? _target,
    );
    dataSource.transaction.mockImplementation(
      (callback: (tx: typeof manager) => Promise<unknown>) => callback(manager),
    );
    auditLogService.logWithManager.mockResolvedValue({ id: 9 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        { provide: getRepositoryToken(PointHistory), useValue: pointHistoryRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();
    service = module.get(PointsService);
  });

  it('allocates a partial debit from the first eligible FIFO lot', async () => {
    const first = lot(1, 100, new Date('2026-02-01T00:00:00.000Z'));
    const second = lot(2, 300, new Date('2026-03-01T00:00:00.000Z'));
    queryBuilder.getMany.mockResolvedValue([first, second]);
    manager.findOne.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ balance: 400 });

    await expect(
      service.deductFifo(manager as unknown as EntityManager, 1, 60, 'use', 7),
    ).resolves.toBe(340);

    expect(first.remainingAmount).toBe(40);
    expect(second.remainingAmount).toBe(300);
    expect(manager.save).toHaveBeenNthCalledWith(1, PointHistory, first);
    expect(manager.save).toHaveBeenLastCalledWith(
      PointHistory,
      expect.objectContaining({
        type: 'spend',
        amount: -60,
        remainingAmount: null,
        balance: 340,
        orderId: 7,
      }),
    );
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('ph.id', 'ASC');
  });

  it('consumes exact multi-lot boundaries in expiry, creation, and id FIFO order', async () => {
    const first = lot(1, 100, new Date('2026-02-01T00:00:00.000Z'));
    const second = lot(2, 200, new Date('2026-03-01T00:00:00.000Z'));
    queryBuilder.getMany.mockResolvedValue([first, second]);
    manager.findOne.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ balance: 300 });

    await service.deductFifo(manager as unknown as EntityManager, 1, 300, 'all');

    expect(first.remainingAmount).toBe(0);
    expect(second.remainingAmount).toBe(0);
    expect(manager.save).toHaveBeenCalledTimes(3);
  });

  it('rejects insufficient lots before writing either a lot or spend history', async () => {
    queryBuilder.getMany.mockResolvedValue([lot(1, 99, null)]);

    await expect(
      service.deductFifo(manager as unknown as EntityManager, 1, 100, 'too much'),
    ).rejects.toThrow(BadRequestException);

    expect(manager.save).not.toHaveBeenCalled();
  });

  it('excludes expired or consumed lots so explicit expiry cannot be double-subtracted', async () => {
    queryBuilder.getMany.mockResolvedValue([lot(2, 50, null)]);
    manager.findOne.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ balance: 50 });

    await service.deductFifo(manager as unknown as EntityManager, 1, 50, 'use');

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('ph.remaining_amount > 0');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(ph.expires_at IS NULL OR ph.expires_at > :now)',
      expect.objectContaining({ now: expect.any(Date) }),
    );
  });

  it('uses remaining unexpired credit lots for effective balance', async () => {
    queryBuilder.getRawOne.mockResolvedValue({ total: '250' });

    await expect(service.getUserPointBalance(1)).resolves.toBe(250);

    expect(queryBuilder.select).toHaveBeenCalledWith(
      expect.stringContaining('ph.remaining_amount'),
      'total',
    );
  });

  it('creates credit lots with remaining amount and running-balance metadata under the user lock', async () => {
    manager.findOne.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ balance: 100 });

    await service.creditFifo(manager as unknown as EntityManager, 1, 50, 'grant', null);

    expect(manager.findOne.mock.calls[0]).toEqual([
      User,
      {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      },
    ]);
    expect(manager.save).toHaveBeenCalledWith(
      PointHistory,
      expect.objectContaining({
        type: 'earn',
        amount: 50,
        remainingAmount: 50,
        balance: 150,
      }),
    );
  });

  it('creates non-expiring admin-adjust credit lots for order restoration', async () => {
    manager.findOne.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ balance: 100 });

    await service.creditFifo(
      manager as unknown as EntityManager,
      1,
      50,
      'restore',
      null,
      10,
      null,
      null,
      'admin_adjust',
    );

    expect(manager.save).toHaveBeenCalledWith(
      PointHistory,
      expect.objectContaining({
        type: 'admin_adjust',
        amount: 50,
        remainingAmount: 50,
        expiresAt: null,
        orderId: 10,
      }),
    );
  });

  it('revokes only the untouched source lot and records a source-related spend', async () => {
    const reviewLot = {
      ...lot(9, 100, null),
      amount: 100,
      relatedEntityType: 'review' as const,
      relatedEntityId: 7,
    };
    manager.findOne
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(reviewLot)
      .mockResolvedValueOnce({ balance: 200 });

    await service.revokeSourceCreditLocked(
      manager as unknown as EntityManager,
      1,
      'review',
      7,
      'revoke',
    );

    expect(reviewLot.remainingAmount).toBe(0);
    expect(manager.findOne).toHaveBeenNthCalledWith(2, PointHistory, {
      where: {
        userId: 1,
        type: 'earn',
        relatedEntityType: 'review',
        relatedEntityId: 7,
      },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.save).toHaveBeenLastCalledWith(
      PointHistory,
      expect.objectContaining({
        type: 'spend',
        amount: -100,
        balance: 100,
        relatedEntityType: 'review',
        relatedEntityId: 7,
      }),
    );
  });

  it('rejects revocation when the source lot was partially spent', async () => {
    manager.findOne
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ ...lot(9, 50, null), amount: 100 });

    await expect(
      service.revokeSourceCreditLocked(
        manager as unknown as EntityManager,
        1,
        'review',
        7,
        'revoke',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(manager.save).not.toHaveBeenCalled();
  });

  it('uses the same locked lot primitives for admin credit and debit', async () => {
    const credit = {
      id: 10,
      balance: 150,
      createdAt: new Date(),
      description: '관리자 수동 포인트 조정: grant',
    };
    manager.findOne.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ balance: 100 });
    manager.save.mockResolvedValueOnce(credit);

    await service.adjustPointsManually(
      { actorId: 2, actorRole: 'admin' },
      { userId: 1, delta: 50, reason: 'grant' },
    );
    expect(manager.save).toHaveBeenCalledWith(
      PointHistory,
      expect.objectContaining({ remainingAmount: 50 }),
    );

    jest.clearAllMocks();
    manager.findOne.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ balance: 150 });
    queryBuilder.getRawOne.mockResolvedValue({ total: '150' });
    queryBuilder.getMany.mockResolvedValue([lot(1, 150, null)]);
    manager.save.mockImplementation(async (_target: unknown, value?: PointHistory) => ({
      ...(value as PointHistory),
      id: 11,
      createdAt: new Date(),
      description: '관리자 수동 포인트 조정: debit',
    }));
    auditLogService.logWithManager.mockResolvedValue({ id: 12 });

    await service.adjustPointsManually(
      { actorId: 2, actorRole: 'admin' },
      { userId: 1, delta: -50, reason: 'debit' },
    );
    expect(manager.findOne).toHaveBeenCalledTimes(2);
    expect(manager.save).toHaveBeenLastCalledWith(
      PointHistory,
      expect.objectContaining({
        type: 'spend',
        amount: -50,
        remainingAmount: null,
        balance: 100,
      }),
    );
  });
});
