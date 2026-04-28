import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PageBlock } from './page-block.entity';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

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

  @Column({ name: 'content_en', type: 'longtext', nullable: true })
  contentEn!: string | null;

  @Column({ name: 'content_ja', type: 'longtext', nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  contentJa!: string | null;

  @Column({ name: 'content_zh', type: 'longtext', nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  contentZh!: string | null;

  @Column({ type: 'varchar', length: 100, default: 'default' })
  template!: string;

  @Column({ type: 'boolean', default: false })
  is_published!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => PageBlock, (block) => block.page, { cascade: true })
  blocks!: PageBlock[];
}
