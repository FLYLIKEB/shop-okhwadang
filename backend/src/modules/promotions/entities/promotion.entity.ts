import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type PromotionType = 'timesale' | 'exhibition' | 'event';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'title_en', type: 'varchar', length: 255, nullable: true })
  titleEn!: string | null;

  @Column({ type: 'longtext', nullable: true })
  description!: string | null;

  @Column({ name: 'description_en', type: 'longtext', nullable: true })
  descriptionEn!: string | null;

  @Column({ type: 'enum', enum: ['timesale', 'exhibition', 'event'] })
  type!: PromotionType;

  @Column({ name: 'starts_at', type: 'datetime' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'datetime' })
  endsAt!: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'discount_rate', type: 'int', nullable: true })
  discountRate!: number | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
