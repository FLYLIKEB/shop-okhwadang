import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';
import { AdminReviewQueryDto } from './dto/admin-review-query.dto';
import { ExternalReview } from './entities/external-review.entity';
import { Review } from './entities/review.entity';

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
  adminReplyContent: string | null;
  adminReplyAuthor: string | null;
  adminRepliedAt: Date | null;
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
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async findAll(query: AdminReviewQueryDto): Promise<AdminReviewListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.externalReviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.product', 'product');

    this.applyFilters(qb, query);
    this.applySort(qb, query);

    const [externalReviews] = await qb.getManyAndCount();
    const internalReviews = await this.findInternalReviews(query);
    const items = [
      ...externalReviews.map((review) => this.toExternalItem(review)),
      ...internalReviews.map((review) => this.toInternalItem(review)),
    ].sort((a, b) => this.compareItems(a, b, query));

    return {
      items: items.slice((page - 1) * limit, page * limit),
      total: items.length,
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
    return this.toExternalItem(review);
  }

  async setVisibility(
    id: number,
    isVisible: boolean,
    source?: string | null,
  ): Promise<AdminReviewItem> {
    if (source === 'okhwadang' || source === 'internal') {
      const review = await this.reviewRepository.findOne({
        where: { id },
        relations: ['product', 'user'],
      });
      if (!review) throw new NotFoundException('리뷰를 찾을 수 없습니다.');
      review.isVisible = isVisible;
      const saved = await this.reviewRepository.save(review);
      await this.refreshProductReviewStats(Number(saved.productId));
      return this.toInternalItem(saved);
    }

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
    return this.toExternalItem(saved);
  }

  async bulkSetVisibility(
    items: Array<{ id: number; source?: string | null }>,
    isVisible: boolean,
  ): Promise<{ updated: number }> {
    if (items.length === 0) return { updated: 0 };

    const externalIds = items
      .filter((item) => item.source !== 'okhwadang' && item.source !== 'internal')
      .map((item) => item.id);
    const internalIds = items
      .filter((item) => item.source === 'okhwadang' || item.source === 'internal')
      .map((item) => item.id);

    let updated = 0;
    const productIds = new Set<number>();

    if (externalIds.length > 0) {
      const reviews = await this.externalReviewRepository.find({
        select: ['id', 'productId'],
        where: { id: In(externalIds) },
      });
      const result = await this.externalReviewRepository.update({ id: In(externalIds) }, { isVisible });
      updated += result.affected ?? 0;
      reviews.forEach((review) => productIds.add(Number(review.productId)));
    }

    if (internalIds.length > 0) {
      const reviews = await this.reviewRepository.find({
        select: ['id', 'productId'],
        where: { id: In(internalIds) },
      });
      const result = await this.reviewRepository.update({ id: In(internalIds) }, { isVisible });
      updated += result.affected ?? 0;
      reviews.forEach((review) => productIds.add(Number(review.productId)));
    }

    await Promise.all([...productIds].map((productId) => this.refreshProductReviewStats(productId)));
    return { updated };
  }

  async setReply(
    id: number,
    content: string | null,
    author?: string,
    source?: string | null,
  ): Promise<AdminReviewItem> {
    const trimmed = content?.trim() ?? '';
    const reply = {
      adminReplyContent: trimmed.length > 0 ? trimmed : null,
      adminReplyAuthor: trimmed.length > 0 ? (author?.trim() || '옥화당') : null,
      adminRepliedAt: trimmed.length > 0 ? new Date() : null,
    };

    if (source === 'okhwadang' || source === 'internal') {
      const review = await this.reviewRepository.findOne({
        where: { id },
        relations: ['product', 'user'],
      });
      if (!review) throw new NotFoundException('리뷰를 찾을 수 없습니다.');
      Object.assign(review, reply);
      return this.toInternalItem(await this.reviewRepository.save(review));
    }

    const review = await this.externalReviewRepository.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    Object.assign(review, reply);
    return this.toExternalItem(await this.externalReviewRepository.save(review));
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
            .where('review.externalReviewId LIKE :search', { search: `%${search}%` })
            .orWhere('review.externalProductId LIKE :search', { search: `%${search}%` })
            .orWhere('review.reviewerNameMasked LIKE :search', { search: `%${search}%` })
            .orWhere('review.content LIKE :search', { search: `%${search}%` })
            .orWhere('product.name LIKE :search', { search: `%${search}%` })
            .orWhere('product.sku LIKE :search', { search: `%${search}%` });
        }),
      );
    }

    if (query.visibility === 'visible') {
      qb.andWhere('review.isVisible = :visible', { visible: true });
    }
    if (query.visibility === 'hidden') {
      qb.andWhere('review.isVisible = :visible', { visible: false });
    }
    if (query.rating) {
      qb.andWhere('review.rating = :rating', { rating: query.rating });
    }
    if (query.reviewType?.trim()) {
      qb.andWhere('review.reviewType = :reviewType', { reviewType: query.reviewType.trim() });
    }
    if (query.importBatchId?.trim()) {
      qb.andWhere('review.importBatchId = :importBatchId', {
        importBatchId: query.importBatchId.trim(),
      });
    }
    if (query.hasMedia === 'true') {
      qb.andWhere('review.imageUrls IS NOT NULL AND JSON_LENGTH(review.imageUrls) > 0');
    }
    if (query.hasMedia === 'false') {
      qb.andWhere('(review.imageUrls IS NULL OR JSON_LENGTH(review.imageUrls) = 0)');
    }
  }

  private applySort(qb: SelectQueryBuilder<ExternalReview>, query: AdminReviewQueryDto): void {
    const order = String(query.order ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    switch (query.sort ?? 'reviewedAt') {
      case 'rating':
        qb.orderBy('review.rating', order).addOrderBy('review.reviewedAt', 'DESC');
        break;
      case 'helpful':
        qb.orderBy('review.helpfulCount', order).addOrderBy('review.reviewedAt', 'DESC');
        break;
      case 'importedAt':
        qb.orderBy('review.lastSyncedAt', order).addOrderBy('review.reviewedAt', 'DESC');
        break;
      default:
        qb.orderBy('review.reviewedAt', order);
    }
  }


  private async findInternalReviews(query: AdminReviewQueryDto): Promise<Review[]> {
    if (query.reviewType?.trim() || query.importBatchId?.trim()) return [];

    const reviews = await this.reviewRepository.find({ relations: ['product', 'user'] });
    return reviews.filter((review) => {
      if (query.visibility === 'visible' && !review.isVisible) return false;
      if (query.visibility === 'hidden' && review.isVisible) return false;
      if (query.rating && review.rating !== query.rating) return false;
      if (query.hasMedia === 'true' && (!review.imageUrls || review.imageUrls.length === 0)) return false;
      if (query.hasMedia === 'false' && review.imageUrls && review.imageUrls.length > 0) return false;

      const search = query.search?.trim().toLowerCase();
      if (!search) return true;
      return [
        `internal-${review.id}`,
        review.content,
        review.user?.name,
        review.product?.name,
        review.product?.sku,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }

  private compareItems(a: AdminReviewItem, b: AdminReviewItem, query: AdminReviewQueryDto): number {
    const order = String(query.order ?? 'DESC').toUpperCase() === 'ASC' ? 1 : -1;
    const dateDiff = (new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()) * order;
    switch (query.sort ?? 'reviewedAt') {
      case 'rating': {
        const diff = (a.rating - b.rating) * order;
        return diff || dateDiff;
      }
      case 'helpful': {
        const diff = (a.helpfulCount - b.helpfulCount) * order;
        return diff || dateDiff;
      }
      case 'importedAt':
        return (new Date(a.lastSyncedAt).getTime() - new Date(b.lastSyncedAt).getTime()) * order || dateDiff;
      default:
        return dateDiff;
    }
  }

  private toInternalItem(review: Review): AdminReviewItem {
    return {
      id: Number(review.id),
      source: 'okhwadang',
      externalReviewId: `internal-${review.id}`,
      externalProductId: null,
      product: review.product
        ? { id: Number(review.product.id), name: review.product.name, sku: review.product.sku }
        : null,
      reviewType: 'internal',
      rating: review.rating,
      content: review.content,
      reviewerNameMasked: review.user?.name ?? '회원',
      helpfulCount: 0,
      imageUrls: review.imageUrls,
      mediaCount: review.imageUrls?.length ?? 0,
      mediaFailureCount: 0,
      sourceDisplayStatus: null,
      isVisible: review.isVisible,
      isBest: false,
      reviewedAt: review.createdAt,
      sourceUpdatedAt: null,
      lastSyncedAt: review.updatedAt,
      importBatchId: null,
      orderNo: null,
      relatedReviewExternalId: null,
      relatedReviewContent: null,
      adminReplyContent: review.adminReplyContent,
      adminReplyAuthor: review.adminReplyAuthor,
      adminRepliedAt: review.adminRepliedAt,
    };
  }

  private toExternalItem(review: ExternalReview): AdminReviewItem {
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
      adminReplyContent: review.adminReplyContent,
      adminReplyAuthor: review.adminReplyAuthor,
      adminRepliedAt: review.adminRepliedAt,
    };
  }
}
