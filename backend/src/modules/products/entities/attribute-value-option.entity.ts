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
import { AttributeType } from './attribute-type.entity';

@Entity('attribute_value_options')
@Unique(['attributeTypeId', 'value'])
@Index(['attributeTypeId', 'sortOrder'])
export class AttributeValueOptionEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id!: number;

  @Column({ name: 'attribute_type_id', type: 'int' })
  attributeTypeId!: number;

  @Column({ type: 'varchar', length: 255 })
  value!: string;

  @Column({ type: 'varchar', length: 255, name: 'display_value' })
  displayValue!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => AttributeType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_type_id' })
  attributeType!: AttributeType;
}
