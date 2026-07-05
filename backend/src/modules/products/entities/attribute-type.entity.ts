import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

export enum AttributeInputType {
  TEXT = 'text',
  SELECT = 'select',
  RANGE = 'range',
}

@Entity('attribute_types')
@Index(['code'], { unique: true })
export class AttributeType {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100, name: 'name_ko', nullable: true })
  nameKo!: string | null;

  @Column({ type: 'varchar', length: 100, name: 'name_en', nullable: true })
  nameEn!: string | null;

  @Column({ type: 'varchar', length: 100, name: 'name_ja', nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  nameJa!: string | null;

  @Column({ type: 'varchar', length: 100, name: 'name_zh', nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  nameZh!: string | null;

  @Column({
    type: 'enum',
    enum: AttributeInputType,
    name: 'input_type',
    default: AttributeInputType.TEXT,
  })
  inputType!: AttributeInputType;

  @Column({ name: 'is_filterable', type: 'boolean', default: false })
  isFilterable!: boolean;

  @Column({ name: 'is_searchable', type: 'boolean', default: false })
  isSearchable!: boolean;

  @Column({ type: 'json', nullable: true, name: 'valid_values' })
  validValues!: string[] | null;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId!: number | null;

  @Column({ name: 'related_type_ids', type: 'json', nullable: true })
  relatedTypeIds!: number[] | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => AttributeType, (type) => type.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: AttributeType | null;

  @OneToMany(() => AttributeType, (type) => type.parent)
  children!: AttributeType[];
}
