import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notices')
export class Notice {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'title_en', type: 'varchar', length: 255, nullable: true })
  titleEn!: string | null;

  @Column({ name: 'title_ja', type: 'varchar', length: 255, nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  titleJa!: string | null;

  @Column({ name: 'title_zh', type: 'varchar', length: 255, nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  titleZh!: string | null;

  @Column({ type: 'longtext' })
  content!: string;

  @Column({ name: 'content_en', type: 'longtext', nullable: true })
  contentEn!: string | null;

  @Column({ name: 'content_ja', type: 'longtext', nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  contentJa!: string | null;

  @Column({ name: 'content_zh', type: 'longtext', nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  contentZh!: string | null;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned!: boolean;

  @Column({ name: 'is_published', type: 'boolean', default: true })
  isPublished!: boolean;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
