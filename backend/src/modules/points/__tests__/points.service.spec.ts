import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PointHistory } from '../../coupons/entities/point-history.entity';
import { User } from '../../users/entities/user.entity';
import { PointsService, addOneYear } from '../points.service';
import { AuditLogService } from '../../audit-logs/audit-log.service';
import { AuditAction } from '../../audit-logs/entities/audit-log.entity';

const mockSelectQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  setLock: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  setParameter: jest.fn().mockReturnThis(),
  getRawOne: jest.fn(),
  getMany: jest.fn(),
};

const mockPointHistoryRepo = {
  createQueryBuilder: jest.fn().mockReturnValue(mockSelectQueryBuilder),
  find: jest.fn(),
};

const mockUserRepo = {
  findOne: jest.fn(),
};

const mockAuditLogService = {
  logWithManager: jest.fn(),
};

const mockEntityManager = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockSelectQueryBuilder),
};

const mockDataSource = {
  transaction: jest.fn(),
};

describe('PointsService', () => {
  let service: PointsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPointHistoryRepo.createQueryBuilder.mockReturnValue(mockSelectQueryBuilder);
    mockEntityManager.createQueryBuilder.mockReturnValue(mockSelectQueryBuilder);
    mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '999999' });
    mockUserRepo.findOne.mockResolvedValue({ id: 1 });
    mockAuditLogService.logWithManager.mockResolvedValue({ id: 501 });
    mockDataSource.transaction.mockImplementation((cb: (manager: typeof mockEntityManager) => Promise<unknown>) => cb(mockEntityManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        { provide: getRepositoryToken(PointHistory), useValue: mockPointHistoryRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<PointsService>(PointsService);
  });

  describe('addOneYear', () => {
    it('should add 365 days to the given date', () => {
      const base = new Date('2025-01-01T00:00:00.000Z');
      const result = addOneYear(base);
      expect(result.getTime()).toBe(base.getTime() + 365 * 24 * 60 * 60 * 1000);
    });

    it('정책 고정: 1년 만료는 정확히 365일이며 다른 단위로 변경 불가', () => {
      const base = new Date('2025-06-15T12:00:00.000Z');
      const result = addOneYear(base);
      const diffDays = (result.getTime() - base.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBe(365);
    });
  });

  describe('mapSourceKind', () => {
    it('maps current point producers to non-null source kinds', () => {
      expect(service.mapSourceKind({ type: 'earn', orderId: null, relatedEntityType: 'review', relatedEntityId: 1 })).toBe('review_reward_earn');
      expect(service.mapSourceKind({ type: 'spend', orderId: null, relatedEntityType: 'review', relatedEntityId: 1 })).toBe('review_reward_revoke');
      expect(service.mapSourceKind({ type: 'spend', orderId: 33, relatedEntityType: null, relatedEntityId: null })).toBe('order_use');
      expect(service.mapSourceKind({ type: 'admin_adjust', orderId: 44, relatedEntityType: null, relatedEntityId: null })).toBe('order_restore');
      expect(service.mapSourceKind({ type: 'expire', orderId: null, relatedEntityType: null, relatedEntityId: 10 })).toBe('expiry');
      expect(service.mapSourceKind({ type: 'earn', orderId: null, relatedEntityType: null, relatedEntityId: null })).toBe('manual_grant');
      expect(service.mapSourceKind({ type: 'spend', orderId: null, relatedEntityType: null, relatedEntityId: null })).toBe('manual_debit');
    });
  });

  describe('toHistoryResponse', () => {
    it('includes non-null sourceKind for member/admin history responses', () => {
      const response = service.toHistoryResponse({
        id: 9,
        userId: 1,
        type: 'admin_adjust',
        amount: 1000,
        balance: 4000,
        description: '주문 ORD-1 취소/환불로 인한 적립금 복구',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        orderId: 77,
        relatedEntityType: null,
      } as PointHistory);

      expect(response).toMatchObject({
        id: 9,
        userId: 1,
        type: 'admin_adjust',
        amount: 1000,
        balance: 4000,
        sourceKind: 'order_restore',
      });
    });
  });

  describe('getUserPointBalance', () => {
    it('should return the sum of non-expired points', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '3000' });

      const balance = await service.getUserPointBalance(1);

      expect(balance).toBe(3000);
      expect(mockPointHistoryRepo.createQueryBuilder).toHaveBeenCalledWith('ph');
      expect(mockSelectQueryBuilder.where).toHaveBeenCalledWith(
        'ph.user_id = :userId',
        { userId: 1 },
      );
    });

    it('should return 0 when no point history exists', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '0' });

      const balance = await service.getUserPointBalance(99);

      expect(balance).toBe(0);
    });

    it('should return 0 when getRawOne returns null', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue(null);

      const balance = await service.getUserPointBalance(1);

      expect(balance).toBe(0);
    });

    it('정책 고정: earn 항목 중 expires_at 이 지난 것은 잔액에서 제외하는 SQL 가드를 갖는다', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '1000' });

      await service.getUserPointBalance(1);

      expect(mockSelectQueryBuilder.select).toHaveBeenCalledWith(
        expect.stringContaining('ph.remaining_amount IS NOT NULL'),
        'total',
      );
      expect(mockSelectQueryBuilder.select).toHaveBeenCalledWith(
        expect.stringContaining('ph.expires_at > :now'),
        'total',
      );
    });
  });

  describe('getUserPointSummary', () => {
    it('returns userId and effective balance for admin point summary endpoint', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 42 });
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '1800' });

      await expect(service.getUserPointSummary(42)).resolves.toEqual({ userId: 42, balance: 1800 });
    });

    it('throws when the target user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.getUserPointSummary(404)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserPointHistory', () => {
    it('returns newest-first rows with sourceKind mapping', async () => {
      mockPointHistoryRepo.find.mockResolvedValue([
        {
          id: 1,
          userId: 42,
          type: 'spend',
          amount: -500,
          balance: 1500,
          description: '관리자 수동 포인트 조정: 사후 차감',
          createdAt: new Date(),
          orderId: null,
          relatedEntityType: null,
        },
      ]);

      await expect(service.getUserPointHistory(42, 20)).resolves.toEqual([
        expect.objectContaining({ sourceKind: 'manual_debit' }),
      ]);
      expect(mockPointHistoryRepo.find).toHaveBeenCalledWith({
        where: { userId: 42 },
        order: { createdAt: 'DESC', id: 'DESC' },
        take: 20,
      });
    });
  });

  describe('getEffectiveBalanceInTx', () => {
    it('should return parsed integer balance from query', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '1500' });

      const balance = await service.getEffectiveBalanceInTx(
        mockEntityManager as unknown as EntityManager,
        1,
      );

      expect(balance).toBe(1500);
    });

    it('should return 0 when result is null', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue(null);

      const balance = await service.getEffectiveBalanceInTx(
        mockEntityManager as unknown as EntityManager,
        1,
      );

      expect(balance).toBe(0);
    });

    it('post-cron expire rows do not double-subtract expired earns', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '1000' });

      const balance = await service.getEffectiveBalanceInTx(
        mockEntityManager as unknown as EntityManager,
        1,
      );

      expect(balance).toBe(1000);
      expect(mockSelectQueryBuilder.select).toHaveBeenCalledWith(
        expect.stringContaining('THEN ph.remaining_amount'),
        'total',
      );
      expect(mockSelectQueryBuilder.select).toHaveBeenCalledWith(
        expect.stringContaining('ph.remaining_amount IS NOT NULL'),
        'total',
      );
    });
  });

  describe('getRunningBalanceInTx', () => {
    it('should return latest running balance', async () => {
      mockEntityManager.findOne.mockResolvedValue({ balance: 2500 });

      const balance = await service.getRunningBalanceInTx(
        mockEntityManager as unknown as EntityManager,
        1,
      );

      expect(balance).toBe(2500);
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(PointHistory, {
        where: { userId: 1 },
        order: { createdAt: 'DESC', id: 'DESC' },
      });
    });

    it('should return 0 when latest running balance does not exist', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      const balance = await service.getRunningBalanceInTx(
        mockEntityManager as unknown as EntityManager,
        1,
      );

      expect(balance).toBe(0);
    });
  });

  describe('adjustPointsManually', () => {
    it('creates positive adjustments as earn rows with one-year expiry and effective balance metadata', async () => {
      const createdAt = new Date('2026-01-02T00:00:00.000Z');
      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: 42 })
        .mockResolvedValueOnce({ balance: 2000 });
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '1000' });
      mockEntityManager.save.mockResolvedValue({
        id: 88,
        userId: 42,
        type: 'earn',
        amount: 500,
        balance: 2500,
        description: '관리자 수동 포인트 조정: CS 보상 지급',
        createdAt,
        orderId: null,
        relatedEntityType: null,
      });

      const result = await service.adjustPointsManually(
        { actorId: 7, actorRole: 'admin' },
        { userId: 42, delta: 500, reason: 'CS 보상 지급' },
      );

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalledWith(PointHistory, expect.objectContaining({
        userId: 42,
        type: 'earn',
        amount: 500,
        balance: 2500,
        description: '관리자 수동 포인트 조정: CS 보상 지급',
        expiresAt: expect.any(Date),
      }));
      expect(mockAuditLogService.logWithManager).toHaveBeenCalledWith(
        mockEntityManager,
        expect.objectContaining({
          actorId: 7,
          actorRole: 'admin',
          action: AuditAction.POINT_MANUAL_ADJUSTMENT,
          resourceType: 'point_history',
          resourceId: 88,
          afterJson: expect.objectContaining({ delta: 500, balanceAfter: 1500, pointHistoryId: 88 }),
        }),
      );
      expect(result).toMatchObject({
        pointHistoryId: 88,
        auditLogId: 501,
        userId: 42,
        delta: 500,
        balanceAfter: 1500,
      });
    });

    it('creates negative adjustments with running-ledger rows and effective balance metadata', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: 42 })
        .mockResolvedValueOnce({ balance: 2000 })
        .mockResolvedValueOnce({ id: 42 })
        .mockResolvedValueOnce({ balance: 2000 });
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '1200' });
      mockSelectQueryBuilder.getMany.mockResolvedValue([
        { id: 10, remainingAmount: 1200 },
      ]);
      mockEntityManager.save.mockImplementation(async (_entity, value) => (
        (value as { type?: string }).type === 'spend'
          ? { ...value, id: 91, createdAt: new Date() }
          : value
      ));

      const result = await service.adjustPointsManually(
        { actorId: 7, actorRole: 'admin' },
        { userId: 42, delta: -300, reason: '사후 차감' },
      );

      expect(mockEntityManager.save).toHaveBeenCalledWith(PointHistory, expect.objectContaining({
        type: 'spend',
        amount: -300,
        balance: 1700,
        orderId: null,
        description: '관리자 수동 포인트 조정: 사후 차감',
      }));
      expect(result).toMatchObject({ pointHistoryId: 91, auditLogId: 501, balanceAfter: 900, delta: -300 });
    });


    it('rejects zero adjustments', async () => {
      await expect(
        service.adjustPointsManually(
          { actorId: 7, actorRole: 'admin' },
          { userId: 42, delta: 0, reason: 'noop' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('propagates audit failure so the transaction can roll back', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: 42 })
        .mockResolvedValueOnce({ balance: 1000 });
      mockEntityManager.save.mockResolvedValue({
        id: 88,
        userId: 42,
        type: 'earn',
        amount: 500,
        balance: 1500,
        description: '관리자 수동 포인트 조정: CS 보상 지급',
        createdAt: new Date(),
        orderId: null,
        relatedEntityType: null,
      });
      mockAuditLogService.logWithManager.mockRejectedValue(new Error('audit failed'));

      await expect(
        service.adjustPointsManually(
          { actorId: 7, actorRole: 'admin' },
          { userId: 42, delta: 500, reason: 'CS 보상 지급' },
        ),
      ).rejects.toThrow('audit failed');
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('deductFifo', () => {

  beforeEach(() => {
    mockEntityManager.findOne.mockReset();
    mockEntityManager.save.mockImplementation(
      async (_entity: unknown, value: unknown) => value,
    );
  });
    it('should create a spend record with correct balance and return new balance', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '5000' });
      mockSelectQueryBuilder.getMany.mockResolvedValue([
        { id: 1, remainingAmount: 5000 },
      ]);
      mockEntityManager.findOne.mockResolvedValue({ balance: 5000 });

      const newBalance = await service.deductFifo(
        mockEntityManager as unknown as EntityManager,
        1,
        1000,
        '주문 사용 (ORD-001)',
        42,
      );

      expect(newBalance).toBe(4000);
      expect(mockEntityManager.save).toHaveBeenCalledWith(PointHistory, {
        userId: 1,
        type: 'spend',
        amount: -1000,
        remainingAmount: null,
        balance: 4000,
        orderId: 42,
        description: '주문 사용 (ORD-001)',
      });
    });

    it('should reject when no effective balance exists', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '0' });
      mockSelectQueryBuilder.getMany.mockResolvedValue([]);
      mockEntityManager.findOne.mockResolvedValue({ id: 1 });

      await expect(
        service.deductFifo(
          mockEntityManager as unknown as EntityManager,
          1,
          500,
          '주문 사용 (ORD-002)',
          null,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });

    it('should query latest entry ordered by createdAt DESC, id DESC for FIFO', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '2000' });
      mockSelectQueryBuilder.getMany.mockResolvedValue([
        { id: 1, remainingAmount: 2000 },
      ]);
      mockEntityManager.findOne.mockResolvedValue({ balance: 2000 });

      await service.deductFifo(mockEntityManager as unknown as EntityManager, 1, 200, 'test', null);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(PointHistory, {
        where: { userId: 1 },
        order: { createdAt: 'DESC', id: 'DESC' },
      });
    });

    it('should deduct full balance when amount equals balance', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '1000' });
      mockSelectQueryBuilder.getMany.mockResolvedValue([
        { id: 1, remainingAmount: 1000 },
      ]);
      mockEntityManager.findOne.mockResolvedValue({ balance: 1000 });

      const newBalance = await service.deductFifo(
        mockEntityManager as unknown as EntityManager,
        1,
        1000,
        '전액 사용',
        null,
      );

      expect(newBalance).toBe(0);
    });

    it('rejects spending expired earn that is still present in running balance before cron expiry', async () => {
      mockSelectQueryBuilder.getRawOne.mockResolvedValue({ total: '1000' });
      mockSelectQueryBuilder.getMany.mockResolvedValue([
        { id: 1, remainingAmount: 1000 },
      ]);
      mockEntityManager.findOne.mockResolvedValue({ balance: 2000 });

      await expect(
        service.deductFifo(
          mockEntityManager as unknown as EntityManager,
          1,
          1500,
          '주문 사용 (ORD-EXPIRED)',
          42,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });
  });
});
