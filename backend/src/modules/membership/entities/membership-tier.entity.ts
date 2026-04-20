import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('membership_tiers')
export class MembershipTier {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string;

  @Column({ name: 'min_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  minAmount!: number;

  @Column({ name: 'point_rate', type: 'decimal', precision: 5, scale: 2, default: 1 })
  pointRate!: number;

  @Column({ name: 'benefits_json', type: 'json', nullable: true })
  benefitsJson!: Record<string, unknown> | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
