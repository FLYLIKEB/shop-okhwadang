import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Coupon } from './coupon.entity';

export enum CouponRuleTrigger {
  SIGNUP = 'signup',
  FIRST_PURCHASE = 'first_purchase',
  BIRTHDAY = 'birthday',
  TIER_UP = 'tier_up',
}

@Entity('coupon_rules')
@Index(['trigger'])
@Index(['active'])
export class CouponRule {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'enum', enum: CouponRuleTrigger })
  trigger!: CouponRuleTrigger;

  @Column({ name: 'coupon_template_id', type: 'bigint' })
  couponTemplateId!: number;

  @Column({ name: 'conditions_json', type: 'json', nullable: true })
  conditionsJson!: Record<string, unknown> | null;

  @Column({ type: 'tinyint', width: 1, default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Coupon, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coupon_template_id' })
  couponTemplate!: Coupon;
}
