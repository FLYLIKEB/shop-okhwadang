import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('reviews')
@Index(['productId'])
@Index(['userId'])
export class Review {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: number;

  @Column({ name: 'order_item_id', type: 'bigint', unique: true })
  orderItemId!: number;

  @Column({ type: 'tinyint', unsigned: true })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ name: 'image_urls', type: 'json', nullable: true })
  imageUrls!: string[] | null;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible!: boolean;

  @Column({ name: 'admin_reply_content', type: 'text', nullable: true })
  adminReplyContent!: string | null;

  @Column({ name: 'admin_reply_author', type: 'varchar', length: 100, nullable: true })
  adminReplyAuthor!: string | null;

  @Column({ name: 'admin_replied_at', type: 'datetime', nullable: true })
  adminRepliedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
