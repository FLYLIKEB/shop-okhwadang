import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductOption } from '../../products/entities/product-option.entity';

@Entity('restock_alerts')
@Index(['userId', 'productId'])
@Index(['productId', 'notifiedAt'])
@Index(['productOptionId', 'notifiedAt'])
export class RestockAlert {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: number;

  @Column({ name: 'product_option_id', type: 'bigint', nullable: true })
  productOptionId!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'notified_at', type: 'datetime', nullable: true })
  notifiedAt!: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => ProductOption, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_option_id' })
  productOption!: ProductOption | null;
}
