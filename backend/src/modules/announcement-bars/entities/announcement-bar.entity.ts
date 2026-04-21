import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('announcement_bars')
@Index(['is_active'])
@Index(['sort_order'])
export class AnnouncementBar {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  message!: string;

  @Column({ name: 'message_en', type: 'varchar', length: 255, nullable: true })
  message_en!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  href!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sort_order!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
