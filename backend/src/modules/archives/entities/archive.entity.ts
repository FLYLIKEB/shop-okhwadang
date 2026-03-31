import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('nilo_types')
export class NiloType {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  nameKo!: string;

  @Column({ type: 'varchar', length: 7 })
  color!: string;

  @Column({ type: 'varchar', length: 200 })
  region!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'json' })
  characteristics!: string[];

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

  @Column({ type: 'varchar', length: 200 })
  description!: string;

  @Column({ type: 'text' })
  detail!: string;

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

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'varchar', length: 100 })
  region!: string;

  @Column({ type: 'text' })
  story!: string;

  @Column({ type: 'varchar', length: 200 })
  specialty!: string;

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
