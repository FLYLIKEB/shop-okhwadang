import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('faqs')
export class Faq {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  category!: string;

  @Column({ type: 'varchar', length: 500 })
  question!: string;

  @Column({ name: 'question_en', type: 'varchar', length: 500, nullable: true })
  questionEn!: string | null;

  @Column({ name: 'question_ja', type: 'varchar', length: 500, nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  questionJa!: string | null;

  @Column({ name: 'question_zh', type: 'varchar', length: 500, nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  questionZh!: string | null;

  @Column({ type: 'longtext' })
  answer!: string;

  @Column({ name: 'answer_en', type: 'longtext', nullable: true })
  answerEn!: string | null;

  @Column({ name: 'answer_ja', type: 'longtext', nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  answerJa!: string | null;

  @Column({ name: 'answer_zh', type: 'longtext', nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  answerZh!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_published', type: 'boolean', default: true })
  isPublished!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
