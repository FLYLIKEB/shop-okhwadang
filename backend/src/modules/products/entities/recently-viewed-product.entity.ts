import {
  Entity,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from './product.entity';

@Entity('recently_viewed_products')
@Index('IDX_recently_viewed_user', ['userId'])
@Index('IDX_recently_viewed_product', ['productId'])
export class RecentlyViewedProduct {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @PrimaryColumn({ name: 'product_id', type: 'bigint' })
  productId!: number;

  @UpdateDateColumn({ name: 'viewed_at' })
  viewedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
