import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Column, DataSource, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AdminReviewsService } from '../admin-reviews.service';
import { ExternalReview } from '../entities/external-review.entity';
import { Review } from '../entities/review.entity';

@Entity('test_products')
class TestProduct {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku!: string | null;
}

@Entity('test_external_reviews')
class TestExternalReview {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: number;

  @Column({ name: 'reviewed_at', type: 'datetime' })
  reviewedAt!: Date;

  @Column({ name: 'last_synced_at', type: 'datetime' })
  lastSyncedAt!: Date;

  @Column({ name: 'helpful_count', type: 'int', unsigned: true, default: 0 })
  helpfulCount!: number;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible!: boolean;

  @ManyToOne(() => TestProduct)
  @JoinColumn({ name: 'product_id' })
  product!: TestProduct;
}

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

  const reviewRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminReviewsService,
        { provide: getRepositoryToken(ExternalReview), useValue: externalReviewRepository },
        { provide: getRepositoryToken(Review), useValue: reviewRepository },
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
    reviewRepository.find.mockResolvedValue([]);
  });

  it('lists all visibility reviews using entity property paths for paginated sorting', async () => {
    const result = await service.findAll({ page: 1, limit: 20, visibility: 'all' });

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    expect(externalReviewRepository.createQueryBuilder).toHaveBeenCalledWith('review');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('review.product', 'product');
    expect(qb.andWhere.mock.calls).toEqual([]);
    expect(qb.orderBy).toHaveBeenCalledWith('review.reviewedAt', 'DESC');
    expect(reviewRepository.find).toHaveBeenCalledWith({ relations: ['product', 'user'] });
  });


  it('keeps joined pagination order paths resolvable by TypeORM metadata', async () => {
    const dataSource = new DataSource({
      type: 'mysql',
      database: 'metadata_only',
      entities: [TestProduct, TestExternalReview],
    });
    await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

    const qb = dataSource
      .getRepository(TestExternalReview)
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.product', 'product')
      .orderBy('review.reviewedAt', 'DESC')
      .skip(0)
      .take(20);

    expect(() =>
      (
        qb as unknown as {
          createOrderByCombinedWithSelectExpression: (parentAlias: string) => unknown;
        }
      ).createOrderByCombinedWithSelectExpression('distinctAlias'),
    ).not.toThrow();
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
    expect(reviewRepository.find).toHaveBeenCalledWith({ relations: ['product', 'user'] });
  });

  it('saves replies for internal reviews when source identifies okhwadang', async () => {
    const review = {
      id: 3,
      productId: 9,
      rating: 5,
      content: '좋아요',
      imageUrls: null,
      isVisible: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      product: { id: 9, name: '상품', sku: 'SKU-9' },
      user: { name: '고객' },
    } as unknown as Review;
    reviewRepository.findOne.mockResolvedValue(review);
    reviewRepository.save.mockImplementation(async (entity: unknown) => entity as Review);

    const result = await service.setReply(3, ' 감사합니다 ', undefined, 'okhwadang');

    expect(reviewRepository.findOne).toHaveBeenCalledWith({
      where: { id: 3 },
      relations: ['product', 'user'],
    });
    expect(reviewRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ adminReplyContent: '감사합니다', adminReplyAuthor: '옥화당' }),
    );
    expect(result.source).toBe('okhwadang');
    expect(result.adminReplyContent).toBe('감사합니다');
  });

});
