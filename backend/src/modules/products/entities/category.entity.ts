import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('categories')
@Index(['parentId'])
export class Category {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ name: 'name_en', length: 100, nullable: true })
  nameEn!: string | null;

  @Column({ name: 'name_ja', length: 100, nullable: true })
  nameJa!: string | null;

  @Column({ name: 'name_zh', length: 100, nullable: true })
  nameZh!: string | null;

  @Column({ length: 100, unique: true })
  slug!: string;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId!: number | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children!: Category[];

  @OneToMany('Product', 'category')
  products!: unknown[];
}
