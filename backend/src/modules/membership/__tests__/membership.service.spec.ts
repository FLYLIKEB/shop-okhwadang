import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MembershipService } from '../membership.service';
import { MembershipTier } from '../entities/membership-tier.entity';
import { User } from '../../users/entities/user.entity';
import { MembershipEventEmitter } from '../membership-event.emitter';

const makeTier = (overrides: Partial<MembershipTier> = {}): MembershipTier =>
  Object.assign(new MembershipTier(), {
    id: 1,
    name: 'Bronze',
    minAmount: 0,
    pointRate: 1,
    benefitsJson: null,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makeUser = (overrides: Partial<User> = {}): User =>
  Object.assign(new User(), {
    id: 1,
    email: 'test@example.com',
    tier: 'Bronze',
    tierAccumulatedAmount: 0,
    tierEvaluatedAt: null,
    isActive: true,
    ...overrides,
  });

const mockTierRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockUserRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  increment: jest.fn(),
  update: jest.fn(),
};

const mockEventEmitter = {
  emitTierUpgraded: jest.fn(),
  onTierUpgraded: jest.fn(),
};

describe('MembershipService', () => {
  let service: MembershipService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        { provide: getRepositoryToken(MembershipTier), useValue: mockTierRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: MembershipEventEmitter, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
  });

  describe('findAllTiers', () => {
    it('should return all tiers sorted', async () => {
      const tiers = [makeTier()];
      mockTierRepo.find.mockResolvedValue(tiers);
      const result = await service.findAllTiers();
      expect(result).toEqual(tiers);
      expect(mockTierRepo.find).toHaveBeenCalledWith({ order: { sortOrder: 'ASC', minAmount: 'ASC' } });
    });
  });

  describe('findOneTier', () => {
    it('should return tier if found', async () => {
      const tier = makeTier();
      mockTierRepo.findOne.mockResolvedValue(tier);
      const result = await service.findOneTier(1);
      expect(result).toEqual(tier);
    });

    it('should throw NotFoundException if not found', async () => {
      mockTierRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneTier(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTier', () => {
    it('should create a new tier', async () => {
      mockTierRepo.findOne.mockResolvedValue(null);
      const tier = makeTier({ name: 'Gold' });
      mockTierRepo.create.mockReturnValue(tier);
      mockTierRepo.save.mockResolvedValue(tier);

      const result = await service.createTier({
        name: 'Gold',
        minAmount: 700000,
        pointRate: 2,
      });
      expect(result).toEqual(tier);
    });

    it('should throw ConflictException if name already exists', async () => {
      mockTierRepo.findOne.mockResolvedValue(makeTier());
      await expect(
        service.createTier({ name: 'Bronze', minAmount: 0, pointRate: 1 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateTier', () => {
    it('should update a tier', async () => {
      const tier = makeTier();
      mockTierRepo.findOne.mockResolvedValue(tier);
      mockTierRepo.save.mockResolvedValue({ ...tier, pointRate: 1.5 });

      const result = await service.updateTier(1, { pointRate: 1.5 });
      expect(result.pointRate).toBe(1.5);
    });

    it('should throw NotFoundException when tier not found', async () => {
      mockTierRepo.findOne.mockResolvedValue(null);
      await expect(service.updateTier(99, { pointRate: 2 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserTierInfo', () => {
    it('should return tier info for a user', async () => {
      const user = makeUser({ tierAccumulatedAmount: 350000, tier: 'Silver' });
      const tiers = [
        makeTier({ name: 'Bronze', minAmount: 0, sortOrder: 1 }),
        makeTier({ id: 2, name: 'Silver', minAmount: 300000, sortOrder: 2 }),
        makeTier({ id: 3, name: 'Gold', minAmount: 700000, sortOrder: 3 }),
      ];
      mockUserRepo.findOne.mockResolvedValue(user);
      mockTierRepo.find.mockResolvedValue(tiers);

      const result = await service.getUserTierInfo(1);
      expect(result.tier).toBe('Silver');
      expect(result.tierAccumulatedAmount).toBe(350000);
      expect(result.nextTier?.name).toBe('Gold');
      expect(result.amountToNextTier).toBe(350000);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.getUserTierInfo(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('incrementAccumulatedAmount', () => {
    it('should increment tier_accumulated_amount', async () => {
      mockUserRepo.increment.mockResolvedValue({ affected: 1 });
      await service.incrementAccumulatedAmount(1, 50000);
      expect(mockUserRepo.increment).toHaveBeenCalledWith({ id: 1 }, 'tierAccumulatedAmount', 50000);
    });
  });

  describe('evaluateAllUserTiers', () => {
    it('should upgrade user tier and emit event', async () => {
      const tiers = [
        makeTier({ id: 2, name: 'Silver', minAmount: 300000, sortOrder: 2 }),
        makeTier({ id: 1, name: 'Bronze', minAmount: 0, sortOrder: 1 }),
      ];
      const users = [makeUser({ id: 1, tier: 'Bronze', tierAccumulatedAmount: 350000 })];

      mockTierRepo.find.mockResolvedValue(tiers);
      mockUserRepo.find.mockResolvedValue(users);
      mockUserRepo.update.mockResolvedValue({ affected: 1 });

      await service.evaluateAllUserTiers();

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        { id: expect.any(Object) },
        expect.objectContaining({ tier: 'Silver' }),
      );
      expect(mockEventEmitter.emitTierUpgraded).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, previousTier: 'Bronze', newTier: 'Silver' }),
      );
    });

    it('should not emit event when tier unchanged', async () => {
      const tiers = [makeTier({ name: 'Bronze', minAmount: 0 })];
      const users = [makeUser({ id: 1, tier: 'Bronze', tierAccumulatedAmount: 100 })];

      mockTierRepo.find.mockResolvedValue(tiers);
      mockUserRepo.find.mockResolvedValue(users);
      mockUserRepo.update.mockResolvedValue({ affected: 1 });

      await service.evaluateAllUserTiers();

      expect(mockEventEmitter.emitTierUpgraded).not.toHaveBeenCalled();
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        { id: expect.any(Object) },
        expect.objectContaining({ tierEvaluatedAt: expect.any(Date) }),
      );
    });

    it('should do nothing when no tiers configured', async () => {
      mockTierRepo.find.mockResolvedValue([]);
      await service.evaluateAllUserTiers();
      expect(mockUserRepo.find).not.toHaveBeenCalled();
    });
  });
});
