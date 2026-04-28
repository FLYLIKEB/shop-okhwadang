import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nilo_types')
export class NiloType {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 100, nullable: true })
  nameEn!: string | null;

  @Column({ type: 'varchar', length: 100 })
  nameKo!: string;

  @Column({ type: 'varchar', length: 7 })
  color!: string;

  @Column({ type: 'varchar', length: 200 })
  region!: string;

  @Column({ name: 'region_en', type: 'varchar', length: 200, nullable: true })
  regionEn!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn!: string | null;

  @Column({ type: 'json' })
  characteristics!: string[];

  @Column({ name: 'characteristics_en', type: 'json', nullable: true })
  characteristicsEn!: string[] | null;

  @Column({ name: 'product_url', type: 'varchar', length: 500 })
  productUrl!: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('process_steps')
export class ProcessStep {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column()
  step!: number;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ name: 'title_en', type: 'varchar', length: 100, nullable: true })
  titleEn!: string | null;

  @Column({ type: 'varchar', length: 200 })
  description!: string;

  @Column({ name: 'description_en', type: 'varchar', length: 200, nullable: true })
  descriptionEn!: string | null;

  @Column({ type: 'text' })
  detail!: string;

  @Column({ name: 'detail_en', type: 'text', nullable: true })
  detailEn!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('artists')
export class Artist {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 100, nullable: true })
  nameEn!: string | null;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ name: 'title_en', type: 'varchar', length: 100, nullable: true })
  titleEn!: string | null;

  @Column({ type: 'varchar', length: 100 })
  region!: string;

  @Column({ name: 'region_en', type: 'varchar', length: 100, nullable: true })
  regionEn!: string | null;

  @Column({ type: 'text' })
  story!: string;

  @Column({ name: 'story_en', type: 'text', nullable: true })
  storyEn!: string | null;

  @Column({ type: 'varchar', length: 200 })
  specialty!: string;

  @Column({ name: 'specialty_en', type: 'varchar', length: 200, nullable: true })
  specialtyEn!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'product_url', type: 'varchar', length: 500 })
  productUrl!: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
