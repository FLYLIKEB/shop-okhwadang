import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import type { SmartStoreReviewSource } from '../../../common/imports/external-source.util';

export type ExternalReviewSource = SmartStoreReviewSource;

export type ExternalReviewMediaStatus = 'uploaded' | 'failed';

export interface ExternalReviewMediaAsset {
  type: 'image' | 'video' | 'unknown';
  originalUrl: string;
  s3Url: string | null;
  s3Key: string | null;
  status: ExternalReviewMediaStatus;
  error?: string;
}

@Entity('external_reviews')
@Index(['productId'])
@Index(['source', 'externalReviewId'], { unique: true })
@Index(['importBatchId'])
export class ExternalReview {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: number;

  @Column({ type: 'varchar', length: 32, default: 'smartstore' })
  source!: ExternalReviewSource;

  @Column({ name: 'external_review_id', type: 'varchar', length: 128 })
  externalReviewId!: string;

  @Column({ name: 'external_product_id', type: 'varchar', length: 128, nullable: true })
  externalProductId!: string | null;

  @Column({ name: 'review_type', type: 'varchar', length: 40, nullable: true })
  reviewType!: string | null;

  @Column({ type: 'tinyint', unsigned: true })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ name: 'image_urls', type: 'json', nullable: true })
  imageUrls!: string[] | null;

  @Column({ name: 'media_assets', type: 'json', nullable: true })
  mediaAssets!: ExternalReviewMediaAsset[] | null;

  @Column({
    name: 'reviewer_name_masked',
    type: 'varchar',
    length: 80,
    default: '스마트스토어 구매자',
  })
  reviewerNameMasked!: string;

  @Column({ name: 'helpful_count', type: 'int', unsigned: true, default: 0 })
  helpfulCount!: number;

  @Column({ name: 'source_display_status', type: 'varchar', length: 40, nullable: true })
  sourceDisplayStatus!: string | null;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible!: boolean;

  @Column({ name: 'is_best', type: 'boolean', default: false })
  isBest!: boolean;

  @Column({ name: 'admin_reply_content', type: 'text', nullable: true })
  adminReplyContent!: string | null;

  @Column({ name: 'admin_reply_author', type: 'varchar', length: 100, nullable: true })
  adminReplyAuthor!: string | null;

  @Column({ name: 'admin_replied_at', type: 'datetime', nullable: true })
  adminRepliedAt!: Date | null;

  @Column({ name: 'best_selected_at', type: 'datetime', nullable: true })
  bestSelectedAt!: Date | null;

  @Column({ name: 'related_review_external_id', type: 'varchar', length: 128, nullable: true })
  relatedReviewExternalId!: string | null;

  @Column({ name: 'related_review_content', type: 'text', nullable: true })
  relatedReviewContent!: string | null;

  @Column({ name: 'order_no', type: 'varchar', length: 128, nullable: true })
  orderNo!: string | null;

  @Column({ name: 'raw_data', type: 'json', nullable: true })
  rawData!: Record<string, string | null> | null;

  @Column({ name: 'import_batch_id', type: 'varchar', length: 64, nullable: true })
  importBatchId!: string | null;

  @Column({ name: 'reviewed_at', type: 'datetime' })
  reviewedAt!: Date;

  @Column({ name: 'source_updated_at', type: 'datetime', nullable: true })
  sourceUpdatedAt!: Date | null;

  @Column({ name: 'last_synced_at', type: 'datetime' })
  lastSyncedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
