import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { PointHistory } from '../../coupons/entities/point-history.entity';
import { PointsService, addOneYear } from '../points.service';

const mockSelectQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawOne: jest.fn(),
};

const mockPointHistoryRepo = {
  createQueryBuilder: jest.fn().mockReturnValue(mockSelectQueryBuilder),
};

const mockEntityManager = {
  findOne: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockSelectQueryBuilder),
};

describe('PointsService', () => {
  let service: PointsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPointHistoryRepo.createQueryBuilder.mockReturnValue(mockSelectQueryBuilder);
    mockEntityManager.createQueryBuilder.mockReturnValue(mockSelectQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        { provide: getRepositoryToken(PointHistory), useValue: mockPointHistoryRepo },
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

  describe('deductFifo', () => {
    it('should create a spend record with correct balance and return new balance', async () => {
      mockEntityManager.findOne.mockResolvedValue({ balance: 5000 });
      mockEntityManager.save.mockResolvedValue({});

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
        balance: 4000,
        orderId: 42,
        description: '주문 사용 (ORD-001)',
      });
    });

    it('should use balance 0 when no prior history exists', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);
      mockEntityManager.save.mockResolvedValue({});

      const newBalance = await service.deductFifo(
        mockEntityManager as unknown as EntityManager,
        1,
        500,
        '주문 사용 (ORD-002)',
        null,
      );

      expect(newBalance).toBe(-500);
      expect(mockEntityManager.save).toHaveBeenCalledWith(PointHistory, {
        userId: 1,
        type: 'spend',
        amount: -500,
        balance: -500,
        orderId: null,
        description: '주문 사용 (ORD-002)',
      });
    });

    it('should query latest entry ordered by createdAt DESC, id DESC for FIFO', async () => {
      mockEntityManager.findOne.mockResolvedValue({ balance: 2000 });
      mockEntityManager.save.mockResolvedValue({});

      await service.deductFifo(mockEntityManager as unknown as EntityManager, 1, 200, 'test', null);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(PointHistory, {
        where: { userId: 1 },
        order: { createdAt: 'DESC', id: 'DESC' },
      });
    });

    it('should deduct full balance when amount equals balance', async () => {
      mockEntityManager.findOne.mockResolvedValue({ balance: 1000 });
      mockEntityManager.save.mockResolvedValue({});

      const newBalance = await service.deductFifo(
        mockEntityManager as unknown as EntityManager,
        1,
        1000,
        '전액 사용',
        null,
      );

      expect(newBalance).toBe(0);
    });
  });
});
