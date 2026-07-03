import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';
import { AdminReviewQueryDto } from './dto/admin-review-query.dto';
import { ExternalReview } from './entities/external-review.entity';

export interface AdminReviewProductSummary {
  id: number;
  name: string;
  sku: string | null;
}

export interface AdminReviewItem {
  id: number;
  source: string;
  externalReviewId: string;
  externalProductId: string | null;
  product: AdminReviewProductSummary | null;
  reviewType: string | null;
  rating: number;
  content: string | null;
  reviewerNameMasked: string;
  helpfulCount: number;
  imageUrls: string[] | null;
  mediaCount: number;
  mediaFailureCount: number;
  sourceDisplayStatus: string | null;
  isVisible: boolean;
  isBest: boolean;
  reviewedAt: Date;
  sourceUpdatedAt: Date | null;
  lastSyncedAt: Date;
  importBatchId: string | null;
  orderNo: string | null;
  relatedReviewExternalId: string | null;
  relatedReviewContent: string | null;
}

export interface AdminReviewListResult {
  items: AdminReviewItem[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AdminReviewsService {
  constructor(
    @InjectRepository(ExternalReview)
    private readonly externalReviewRepository: Repository<ExternalReview>,
  ) {}

  async findAll(query: AdminReviewQueryDto): Promise<AdminReviewListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.externalReviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.product', 'product');

    this.applyFilters(qb, query);
    this.applySort(qb, query);
    qb.skip((page - 1) * limit).take(limit);

    const [reviews, total] = await qb.getManyAndCount();
    return {
      items: reviews.map((review) => this.toItem(review)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<AdminReviewItem> {
    const review = await this.externalReviewRepository.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }
    return this.toItem(review);
  }

  async setVisibility(id: number, isVisible: boolean): Promise<AdminReviewItem> {
    const review = await this.externalReviewRepository.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }
    review.isVisible = isVisible;
    const saved = await this.externalReviewRepository.save(review);
    await this.refreshProductReviewStats(Number(saved.productId));
    return this.toItem(saved);
  }

  async bulkSetVisibility(ids: number[], isVisible: boolean): Promise<{ updated: number }> {
    if (ids.length === 0) return { updated: 0 };
    const reviews = await this.externalReviewRepository.find({
      select: ['id', 'productId'],
      where: { id: In(ids) },
    });
    const result = await this.externalReviewRepository.update({ id: In(ids) }, { isVisible });
    await Promise.all(
      [...new Set(reviews.map((review) => Number(review.productId)))].map((productId) =>
        this.refreshProductReviewStats(productId),
      ),
    );
    return { updated: result.affected ?? 0 };
  }

  private async refreshProductReviewStats(productId: number): Promise<void> {
    await this.externalReviewRepository.manager.query(
      `UPDATE products p
       LEFT JOIN (
         SELECT product_id, COUNT(*) AS review_count, COALESCE(AVG(rating), 0) AS avg_rating
         FROM (
           SELECT product_id, rating FROM reviews WHERE product_id = ? AND is_visible = 1
           UNION ALL
           SELECT product_id, rating FROM external_reviews WHERE product_id = ? AND is_visible = 1
         ) all_reviews
         GROUP BY product_id
       ) rs ON rs.product_id = p.id
       SET p.review_count = COALESCE(rs.review_count, 0),
           p.avg_rating = COALESCE(rs.avg_rating, 0)
       WHERE p.id = ?`,
      [productId, productId, productId],
    );
  }

  private applyFilters(qb: SelectQueryBuilder<ExternalReview>, query: AdminReviewQueryDto): void {
    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('review.external_review_id LIKE :search', { search: `%${search}%` })
            .orWhere('review.external_product_id LIKE :search', { search: `%${search}%` })
            .orWhere('review.reviewer_name_masked LIKE :search', { search: `%${search}%` })
            .orWhere('review.content LIKE :search', { search: `%${search}%` })
            .orWhere('product.name LIKE :search', { search: `%${search}%` })
            .orWhere('product.sku LIKE :search', { search: `%${search}%` });
        }),
      );
    }

    if (query.visibility === 'visible') {
      qb.andWhere('review.is_visible = :visible', { visible: true });
    }
    if (query.visibility === 'hidden') {
      qb.andWhere('review.is_visible = :visible', { visible: false });
    }
    if (query.rating) {
      qb.andWhere('review.rating = :rating', { rating: query.rating });
    }
    if (query.reviewType?.trim()) {
      qb.andWhere('review.review_type = :reviewType', { reviewType: query.reviewType.trim() });
    }
    if (query.importBatchId?.trim()) {
      qb.andWhere('review.import_batch_id = :importBatchId', {
        importBatchId: query.importBatchId.trim(),
      });
    }
    if (query.hasMedia === 'true') {
      qb.andWhere('review.image_urls IS NOT NULL AND JSON_LENGTH(review.image_urls) > 0');
    }
    if (query.hasMedia === 'false') {
      qb.andWhere('(review.image_urls IS NULL OR JSON_LENGTH(review.image_urls) = 0)');
    }
  }

  private applySort(qb: SelectQueryBuilder<ExternalReview>, query: AdminReviewQueryDto): void {
    const order = String(query.order ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    switch (query.sort ?? 'reviewedAt') {
      case 'rating':
        qb.orderBy('review.rating', order).addOrderBy('review.reviewed_at', 'DESC');
        break;
      case 'helpful':
        qb.orderBy('review.helpful_count', order).addOrderBy('review.reviewed_at', 'DESC');
        break;
      case 'importedAt':
        qb.orderBy('review.last_synced_at', order).addOrderBy('review.reviewed_at', 'DESC');
        break;
      default:
        qb.orderBy('review.reviewed_at', order);
    }
  }

  private toItem(review: ExternalReview): AdminReviewItem {
    const mediaAssets = review.mediaAssets ?? [];
    return {
      id: Number(review.id),
      source: review.source,
      externalReviewId: review.externalReviewId,
      externalProductId: review.externalProductId,
      product: review.product
        ? {
            id: Number(review.product.id),
            name: review.product.name,
            sku: review.product.sku,
          }
        : null,
      reviewType: review.reviewType,
      rating: review.rating,
      content: review.content,
      reviewerNameMasked: review.reviewerNameMasked,
      helpfulCount: review.helpfulCount,
      imageUrls: review.imageUrls,
      mediaCount: mediaAssets.length || review.imageUrls?.length || 0,
      mediaFailureCount: mediaAssets.filter((asset) => asset.status === 'failed').length,
      sourceDisplayStatus: review.sourceDisplayStatus,
      isVisible: review.isVisible,
      isBest: review.isBest,
      reviewedAt: review.reviewedAt,
      sourceUpdatedAt: review.sourceUpdatedAt,
      lastSyncedAt: review.lastSyncedAt,
      importBatchId: review.importBatchId,
      orderNo: review.orderNo,
      relatedReviewExternalId: review.relatedReviewExternalId,
      relatedReviewContent: review.relatedReviewContent,
    };
  }
}
