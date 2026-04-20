import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatus } from '../orders/entities/order.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { paginate } from '../../common/utils/pagination.util';
import { assertOwnership } from '../../common/utils/ownership.util';
import { SettingsService } from '../settings/settings.service';
import { addOneYear } from '../points/points.service';

const REVIEW_POINT_REWARD_KEY = 'review_point_reward';
const PHOTO_REVIEW_BONUS_KEY = 'photo_review_bonus';
const DEFAULT_REVIEW_POINT_REWARD = 100;
const DEFAULT_PHOTO_REVIEW_BONUS = 0;

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
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(PointHistory)
    private readonly pointHistoryRepo: Repository<PointHistory>,
    private readonly settingsService: SettingsService,
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
    const [reward, bonus] = await Promise.all([
      this.settingsService.getNumber(REVIEW_POINT_REWARD_KEY, DEFAULT_REVIEW_POINT_REWARD),
      this.settingsService.getNumber(PHOTO_REVIEW_BONUS_KEY, DEFAULT_PHOTO_REVIEW_BONUS),
    ]);

    const result = await this.dataSource.transaction(async (manager) => {
      // Verify purchase and load order status in one query
      const orderItem = await manager
        .createQueryBuilder(OrderItem, 'orderItem')
        .innerJoinAndSelect('orderItem.order', 'order')
        .where('orderItem.id = :orderItemId', { orderItemId: dto.orderItemId })
        .andWhere('order.userId = :userId', { userId })
        .andWhere('orderItem.productId = :productId', { productId: dto.productId })
        .getOne();

      if (!orderItem) {
        throw new BadRequestException('구매한 상품만 리뷰 작성 가능합니다.');
      }

      // Block review on refunded or cancelled orders
      const blockedStatuses: OrderStatus[] = [OrderStatus.REFUNDED, OrderStatus.CANCELLED];
      if (blockedStatuses.includes(orderItem.order.status)) {
        throw new BadRequestException('환불되거나 취소된 주문은 리뷰할 수 없습니다.');
      }

      // Check duplicate (unique constraint is at DB level too, but check here for friendly message)
      const existing = await manager.findOne(Review, {
        where: { orderItemId: dto.orderItemId },
      });
      if (existing) {
        throw new ConflictException('이미 리뷰를 작성한 주문 항목입니다.');
      }

      const review = manager.create(Review, {
        userId,
        productId: dto.productId,
        orderItemId: dto.orderItemId,
        rating: dto.rating,
        content: dto.content ?? null,
        imageUrls: dto.imageUrls ?? null,
      });

      const saved = await manager.save(Review, review);

      // Award points
      const isPhotoReview = Array.isArray(dto.imageUrls) && dto.imageUrls.length > 0;
      const earnAmount = reward + (isPhotoReview ? bonus : 0);

      if (earnAmount > 0) {
        const currentBalance = await this.getBalanceInTx(manager, userId);
        const newBalance = currentBalance + earnAmount;

        const pointEntry = manager.create(PointHistory, {
          userId,
          type: 'earn' as const,
          amount: earnAmount,
          balance: newBalance,
          description: `리뷰 포인트 적립 (review_id:${saved.id})`,
          orderId: null,
          relatedEntityType: 'review' as const,
          relatedEntityId: Number(saved.id),
          expiresAt: addOneYear(new Date()),
        });
        await manager.save(PointHistory, pointEntry);
      }

      return saved;
    });

    this.logger.log(`Review created: id=${result.id}, userId=${userId}, productId=${dto.productId}`);

    // Reload with user
    const loaded = await findOrThrow(this.reviewRepo, { id: result.id }, '리뷰를 찾을 수 없습니다.', ['user']);

    return this.toResponse(loaded);
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

    await this.dataSource.transaction(async (manager) => {
      // Revoke points — find the original EARN entry for this review
      const earnEntry = await manager.findOne(PointHistory, {
        where: {
          userId: Number(review.userId),
          relatedEntityType: 'review',
          relatedEntityId: id,
          type: 'earn',
        },
      });

      if (earnEntry) {
        // Check if already revoked (spend entry exists for this review)
        const alreadyRevoked = await manager.findOne(PointHistory, {
          where: {
            userId: Number(review.userId),
            relatedEntityType: 'review',
            relatedEntityId: id,
            type: 'spend',
          },
        });

        if (!alreadyRevoked) {
          const currentBalance = await this.getBalanceInTx(manager, Number(review.userId));
          const newBalance = currentBalance - earnEntry.amount;

          const revokeEntry = manager.create(PointHistory, {
            userId: Number(review.userId),
            type: 'spend' as const,
            amount: earnEntry.amount,
            balance: newBalance,
            description: `리뷰 포인트 환수 (review_id:${id})`,
            orderId: null,
            relatedEntityType: 'review' as const,
            relatedEntityId: id,
            expiresAt: null,
          });
          await manager.save(PointHistory, revokeEntry);
        }
      }

      await manager.remove(Review, review);
    });

    this.logger.log(`Review deleted: id=${id}, by userId=${userId}`);
  }

  private async getBalanceInTx(
    manager: EntityManager,
    userId: number,
  ): Promise<number> {
    const latest = await manager.findOne(PointHistory, {
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return latest ? latest.balance : 0;
  }
}
