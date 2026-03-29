import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type InquiryType = '상품' | '배송' | '결제' | '교환/반품' | '기타';
export type InquiryStatus = 'pending' | 'answered';

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ type: 'enum', enum: ['상품', '배송', '결제', '교환/반품', '기타'] })
  type!: InquiryType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'longtext' })
  content!: string;

  @Column({ type: 'enum', enum: ['pending', 'answered'], default: 'pending' })
  status!: InquiryStatus;

  @Column({ type: 'longtext', nullable: true })
  answer!: string | null;

  @Column({ name: 'answered_at', type: 'datetime', nullable: true })
  answeredAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
