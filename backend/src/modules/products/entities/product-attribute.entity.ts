import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { AttributeType } from './attribute-type.entity';

@Entity('product_attributes')
@Unique(['productId', 'attributeTypeId'])
@Index(['attributeTypeId', 'value'])
export class ProductAttribute {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id!: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: number;

  @Column({ name: 'attribute_type_id', type: 'int' })
  attributeTypeId!: number;

  @Column({ type: 'varchar', length: 255 })
  value!: string;

  @Column({ type: 'varchar', length: 255, name: 'display_value', nullable: true })
  displayValue!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Product, (product) => product.attributes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => AttributeType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_type_id' })
  attributeType!: AttributeType;
}
