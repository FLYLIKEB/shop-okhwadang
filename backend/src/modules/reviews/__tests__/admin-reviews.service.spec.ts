import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminReviewsService } from '../admin-reviews.service';
import { ExternalReview } from '../entities/external-review.entity';

describe('AdminReviewsService', () => {
  let service: AdminReviewsService;

  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  const externalReviewRepository = {
    createQueryBuilder: jest.fn(() => qb),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    manager: { query: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminReviewsService,
        { provide: getRepositoryToken(ExternalReview), useValue: externalReviewRepository },
      ],
    }).compile();

    service = module.get(AdminReviewsService);
    jest.clearAllMocks();
    qb.leftJoinAndSelect.mockReturnThis();
    qb.andWhere.mockReturnThis();
    qb.orderBy.mockReturnThis();
    qb.addOrderBy.mockReturnThis();
    qb.skip.mockReturnThis();
    qb.take.mockReturnThis();
    qb.getManyAndCount.mockResolvedValue([[], 0]);
    externalReviewRepository.createQueryBuilder.mockReturnValue(qb);
  });

  it('lists all visibility reviews using entity property paths for paginated sorting', async () => {
    const result = await service.findAll({ page: 1, limit: 20, visibility: 'all' });

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    expect(externalReviewRepository.createQueryBuilder).toHaveBeenCalledWith('review');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('review.product', 'product');
    expect(qb.andWhere).not.toHaveBeenCalledWith('review.is_visible = :visible', expect.anything());
    expect(qb.orderBy).toHaveBeenCalledWith('review.reviewedAt', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(20);
  });

  it('applies visibility and secondary sort filters with entity property paths', async () => {
    await service.findAll({
      page: 2,
      limit: 10,
      visibility: 'hidden',
      sort: 'helpful',
      order: 'ASC',
    });

    expect(qb.andWhere).toHaveBeenCalledWith('review.isVisible = :visible', { visible: false });
    expect(qb.orderBy).toHaveBeenCalledWith('review.helpfulCount', 'ASC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('review.reviewedAt', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
  });
});
