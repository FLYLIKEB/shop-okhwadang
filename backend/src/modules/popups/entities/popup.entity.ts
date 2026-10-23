import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('popups')
@Index('IDX_popups_active_order', ['isActive', 'sortOrder'])
export class Popup {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'image_url', type: 'varchar', length: 2048 })
  imageUrl!: string;

  @Column({ name: 'link_url', type: 'varchar', length: 2048, nullable: true })
  linkUrl!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ name: 'starts_at', type: 'datetime', nullable: true })
  startsAt!: Date | null;

  @Column({ name: 'ends_at', type: 'datetime', nullable: true })
  endsAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
