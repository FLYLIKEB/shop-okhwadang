import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { paginate } from '../../common/utils/pagination.util';
import { assertOwnership } from '../../common/utils/ownership.util';

export interface ReviewResponse {
  id: number;
  userId: number;
  userName: string;
  productId: number;
  orderItemId: number;
  rating: number;
  content: string | null;
  imageUrls: string[] | null;
  isVisible: boolean;
  createdAt: Date;
}

export interface ReviewStats {
  averageRating: number;
  totalCount: number;
  distribution: Record<string, number>;
}

export interface ReviewListResult {
  data: ReviewResponse[];
  stats: ReviewStats;
  pagination: { page: number; limit: number; total: number };
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    private readonly dataSource: DataSource,
  ) {}

  private maskUserName(name: string): string {
    if (!name || name.length === 0) return '***';
    return `${name.charAt(0)}**`;
  }

  private toResponse(review: Review & { user?: { name: string } }): ReviewResponse {
    return {
      id: Number(review.id),
      userId: Number(review.userId),
      userName: this.maskUserName(review.user?.name ?? ''),
      productId: Number(review.productId),
      orderItemId: Number(review.orderItemId),
      rating: review.rating,
      content: review.content,
      imageUrls: review.imageUrls,
      isVisible: review.isVisible,
      createdAt: review.createdAt,
    };
  }

  async findAll(query: ReviewQueryDto): Promise<ReviewListResult> {
    const sort = query.sort ?? 'recent';

    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.is_visible = :visible', { visible: true });

    if (query.productId) {
      qb.andWhere('review.product_id = :productId', { productId: query.productId });
    }

    switch (sort) {
      case 'rating_high':
        qb.orderBy('review.rating', 'DESC').addOrderBy('review.createdAt', 'DESC');
        break;
      case 'rating_low':
        qb.orderBy('review.rating', 'ASC').addOrderBy('review.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('review.createdAt', 'DESC');
    }

    const { items: reviews, total, page, limit } = await paginate(qb, query);

    const stats = await this.getStats(query.productId);

    return {
      data: reviews.map((r) => this.toResponse(r)),
      stats,
      pagination: { page, limit, total },
    };
  }

  async getStats(productId?: number): Promise<ReviewStats> {
    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .where('review.is_visible = :visible', { visible: true });

    if (productId) {
      qb.andWhere('review.product_id = :productId', { productId });
    }

    const result = await qb
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(*)', 'cnt')
      .getRawOne<{ avg: string | null; cnt: string }>();

    const avgRating = result?.avg ? parseFloat(parseFloat(result.avg).toFixed(1)) : 0;
    const totalCount = result?.cnt ? parseInt(result.cnt, 10) : 0;

    const distQb = this.reviewRepo
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.is_visible = :visible', { visible: true })
      .groupBy('review.rating');

    if (productId) {
      distQb.andWhere('review.product_id = :productId', { productId });
    }

    const distRows = await distQb.getRawMany<{ rating: number; count: string }>();
    const distribution: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    for (const row of distRows) {
      distribution[String(row.rating)] = parseInt(row.count, 10);
    }

    return { averageRating: avgRating, totalCount, distribution };
  }

  async create(userId: number, dto: CreateReviewDto): Promise<ReviewResponse> {
    // Verify purchase: check if order_item belongs to user
    const [orderItem] = await this.dataSource.query(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = ? AND o.user_id = ? AND oi.product_id = ?`,
      [dto.orderItemId, userId, dto.productId],
    ) as Array<{ id: number }>;

    if (!orderItem) {
      throw new BadRequestException('구매한 상품만 리뷰 작성 가능합니다.');
    }

    // Check duplicate
    const existing = await this.reviewRepo.findOne({
      where: { orderItemId: dto.orderItemId },
    });
    if (existing) {
      throw new ConflictException('이미 리뷰를 작성한 상품입니다.');
    }

    const review = this.reviewRepo.create({
      userId,
      productId: dto.productId,
      orderItemId: dto.orderItemId,
      rating: dto.rating,
      content: dto.content ?? null,
      imageUrls: dto.imageUrls ?? null,
    });

    const saved = await this.reviewRepo.save(review);
    this.logger.log(`Review created: id=${saved.id}, userId=${userId}, productId=${dto.productId}`);

    // Reload with user
    const loaded = await this.reviewRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });

    return this.toResponse(loaded!);
  }

  async update(id: number, userId: number, dto: UpdateReviewDto): Promise<ReviewResponse> {
    const review = await findOrThrow(this.reviewRepo, { id }, '리뷰를 찾을 수 없습니다.', ['user']);

    assertOwnership(review.userId, userId, '권한이 없습니다.');

    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.content !== undefined) review.content = dto.content ?? null;
    if (dto.imageUrls !== undefined) review.imageUrls = dto.imageUrls ?? null;

    const saved = await this.reviewRepo.save(review);
    return this.toResponse(saved);
  }

  async remove(id: number, userId: number, userRole: string): Promise<void> {
    const review = await findOrThrow(this.reviewRepo, { id }, '리뷰를 찾을 수 없습니다.');

    if (Number(review.userId) !== Number(userId) && userRole !== 'admin' && userRole !== 'super_admin') {
      throw new ForbiddenException('권한이 없습니다.');
    }

    await this.reviewRepo.remove(review);
    this.logger.log(`Review deleted: id=${id}, by userId=${userId}`);
  }
}
