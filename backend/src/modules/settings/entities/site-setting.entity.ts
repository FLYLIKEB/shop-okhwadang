import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('site_settings')
export class SiteSetting {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'setting_key', unique: true, length: 100 })
  key!: string;

  @Column('text')
  value!: string;

  @Column({ name: 'value_en', type: 'text', nullable: true })
  valueEn!: string | null;

  @Column({ name: 'value_ja', type: 'text', nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  valueJa!: string | null;

  @Column({ name: 'value_zh', type: 'text', nullable: true })
  /** @deprecated ko/en only policy: retained only for legacy DB compatibility. */
  valueZh!: string | null;

  @Column({ length: 50 })
  group!: string;

  @Column({ length: 100 })
  label!: string;

  @Column({ name: 'input_type', default: 'text', length: 20 })
  inputType!: string;

  @Column('text', { nullable: true })
  options!: string | null;

  @Column({ name: 'default_value', length: 200 })
  defaultValue!: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;
}
