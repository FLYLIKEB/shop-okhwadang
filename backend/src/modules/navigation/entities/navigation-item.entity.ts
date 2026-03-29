import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('navigation_items')
export class NavigationItem {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'enum', enum: ['gnb', 'sidebar', 'footer'] })
  group!: 'gnb' | 'sidebar' | 'footer';

  @Column({ type: 'varchar', length: 100 })
  label!: string;

  @Column({ type: 'varchar', length: 500 })
  url!: string;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ name: 'parent_id', nullable: true, type: 'bigint' })
  parent_id!: number | null;

  @ManyToOne(() => NavigationItem, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent!: NavigationItem | null;

  @OneToMany(() => NavigationItem, (item) => item.parent)
  children!: NavigationItem[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
