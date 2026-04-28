import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum JournalCategory {
  CULTURE = 'CULTURE',
  USAGE = 'USAGE',
  TABLE_SETTING = 'TABLE_SETTING',
  NEWS = 'NEWS',
}

@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Index()
  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ name: 'title_en', type: 'varchar', length: 200, nullable: true })
  titleEn!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  subtitle!: string | null;

  @Column({ name: 'subtitle_en', type: 'varchar', length: 300, nullable: true })
  subtitleEn!: string | null;

  @Column({ type: 'varchar', length: 50 })
  category!: JournalCategory;

  @Column({ type: 'varchar', length: 10 })
  date!: string;

  @Column({ name: 'read_time', type: 'varchar', length: 20, nullable: true })
  readTime!: string | null;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ name: 'summary_en', type: 'text', nullable: true })
  summaryEn!: string | null;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ name: 'content_en', type: 'text', nullable: true })
  contentEn!: string | null;

  @Column({ name: 'cover_image_url', type: 'varchar', length: 500, nullable: true })
  coverImageUrl!: string | null;

  @Column({ name: 'is_published', default: false })
  isPublished!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
