import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_options')
export class ProductOption {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 100, nullable: true })
  nameEn!: string | null;

  @Column({ length: 100 })
  value!: string;

  @Column({ name: 'value_en', type: 'varchar', length: 100, nullable: true })
  valueEn!: string | null;

  @Column({
    name: 'price_adjustment',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  priceAdjustment!: number;

  @Column({ default: 0 })
  stock!: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @ManyToOne(() => Product, (product) => product.options, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
