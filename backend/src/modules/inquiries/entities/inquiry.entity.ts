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

export enum InquiryType {
  PRODUCT = '상품',
  DELIVERY = '배송',
  PAYMENT = '결제',
  EXCHANGE_RETURN = '교환/반품',
  OTHER = '기타',
}

export enum InquiryStatus {
  PENDING = 'pending',
  ANSWERED = 'answered',
}

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ type: 'enum', enum: InquiryType })
  type!: InquiryType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'longtext' })
  content!: string;

  @Column({ type: 'enum', enum: InquiryStatus, default: InquiryStatus.PENDING })
  status!: InquiryStatus;

  @Column({ type: 'longtext', nullable: true })
  answer!: string | null;

  @Column({ name: 'answered_at', type: 'datetime', nullable: true })
  answeredAt!: Date | null;

  @Column({ name: 'customer_read_at', type: 'datetime', nullable: true })
  customerReadAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
