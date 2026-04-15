import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PromotionsService } from '../promotions.service';
import { Promotion } from '../entities/promotion.entity';
import { Banner } from '../entities/banner.entity';

const mockPromotionRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
});

const mockBannerRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
});

describe('PromotionsService', () => {
  let service: PromotionsService;
  let promotionRepo: ReturnType<typeof mockPromotionRepo>;
  let bannerRepo: ReturnType<typeof mockBannerRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: getRepositoryToken(Promotion), useFactory: mockPromotionRepo },
        { provide: getRepositoryToken(Banner), useFactory: mockBannerRepo },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    promotionRepo = module.get(getRepositoryToken(Promotion));
    bannerRepo = module.get(getRepositoryToken(Banner));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllActive', () => {
    it('활성 프로모션만 반환', async () => {
      const now = new Date();
      const mockPromotions = [
        {
          id: 1,
          title: '타임세일',
          type: 'timesale',
          isActive: true,
          startsAt: new Date(now.getTime() - 3600000),
          endsAt: new Date(now.getTime() + 3600000),
          discountRate: 20,
        },
      ] as Promotion[];
      promotionRepo.find.mockResolvedValue(mockPromotions);

      const result = await service.findAllActive();
      expect(result).toHaveLength(1);
      expect(promotionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
          order: { createdAt: 'DESC' },
        }),
      );
    });

    it('만료된 프로모션 제외 - repository 쿼리에 날짜 조건 포함', async () => {
      promotionRepo.find.mockResolvedValue([]);

      const result = await service.findAllActive();
      expect(result).toHaveLength(0);
      const callArg = promotionRepo.find.mock.calls[0][0];
      expect(callArg.where).toHaveProperty('startsAt');
      expect(callArg.where).toHaveProperty('endsAt');
    });
  });

  describe('findOne', () => {
    it('프로모션 상세 조회 성공', async () => {
      const promotion = { id: 1, title: '기획전', type: 'exhibition' } as Promotion;
      promotionRepo.findOne.mockResolvedValue(promotion);

      const result = await service.findOne(1);
      expect(result.id).toBe(1);
    });

    it('존재하지 않는 프로모션 → NotFoundException', async () => {
      promotionRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('타임세일 할인율 포함 생성', async () => {
      const dto = {
        title: '50% 타임세일',
        type: 'timesale' as const,
        startsAt: '2026-03-26T00:00:00Z',
        endsAt: '2026-03-27T00:00:00Z',
        discountRate: 50,
      };
      const created = { ...dto, id: 1, isActive: true, discountRate: 50 } as unknown as Promotion;
      promotionRepo.create.mockReturnValue(created);
      promotionRepo.save.mockResolvedValue(created);

      const result = await service.create(dto);
      expect(result.discountRate).toBe(50);
      expect(promotionRepo.save).toHaveBeenCalledWith(created);
    });
  });

  describe('remove', () => {
    it('프로모션 삭제 성공', async () => {
      const promotion = { id: 1, title: '이벤트' } as Promotion;
      promotionRepo.findOne.mockResolvedValue(promotion);
      promotionRepo.remove.mockResolvedValue(promotion);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(promotionRepo.remove).toHaveBeenCalledWith(promotion);
    });

    it('존재하지 않는 프로모션 삭제 → NotFoundException', async () => {
      promotionRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllActiveBanners', () => {
    it('활성 배너 sort_order 정렬 반환', async () => {
      const mockBanners = [
        { id: 1, title: '배너1', isActive: true, sortOrder: 0, startsAt: null, endsAt: null },
        { id: 2, title: '배너2', isActive: true, sortOrder: 1, startsAt: null, endsAt: null },
      ] as Banner[];
      bannerRepo.find.mockResolvedValue(mockBanners);

      const result = await service.findAllActiveBanners();
      expect(result).toHaveLength(2);
      expect(bannerRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          order: { sortOrder: 'ASC' },
        }),
      );
    });

    it('기간이 지난 배너 제외', async () => {
      const past = new Date(Date.now() - 3600000);
      const mockBanners = [
        { id: 1, title: '만료배너', isActive: true, sortOrder: 0, startsAt: null, endsAt: past },
      ] as Banner[];
      bannerRepo.find.mockResolvedValue(mockBanners);

      const result = await service.findAllActiveBanners();
      expect(result).toHaveLength(0);
    });
  });
});
