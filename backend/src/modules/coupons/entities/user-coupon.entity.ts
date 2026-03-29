import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Coupon } from './coupon.entity';

@Entity('user_coupons')
@Unique('UQ_user_coupon', ['userId', 'couponId'])
@Index(['userId'])
@Index(['couponId'])
export class UserCoupon {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ name: 'coupon_id', type: 'bigint' })
  couponId!: number;

  @Column({ type: 'enum', enum: ['available', 'used', 'expired'], default: 'available' })
  status!: 'available' | 'used' | 'expired';

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usedAt!: Date | null;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId!: number | null;

  @CreateDateColumn({ name: 'issued_at' })
  issuedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Coupon, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coupon_id' })
  coupon!: Coupon;
}
