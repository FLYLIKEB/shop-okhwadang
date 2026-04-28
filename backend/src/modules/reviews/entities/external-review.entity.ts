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

export type ExternalReviewSource = 'smartstore';

@Entity('external_reviews')
@Index(['productId'])
@Index(['source', 'externalReviewId'], { unique: true })
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

  @Column({ type: 'tinyint', unsigned: true })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ name: 'image_urls', type: 'json', nullable: true })
  imageUrls!: string[] | null;

  @Column({ name: 'reviewer_name_masked', type: 'varchar', length: 80, default: '스마트스토어 구매자' })
  reviewerNameMasked!: string;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible!: boolean;

  @Column({ name: 'reviewed_at', type: 'datetime' })
  reviewedAt!: Date;

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
