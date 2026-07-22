import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PolicyConsentContext {
  SIGNUP = 'signup',
  CHECKOUT = 'checkout',
}

export interface PolicyConsentSnapshot {
  slug: string;
  version: string | null;
  effectiveDate: string | null;
  title?: string | null;
}

@Entity('policy_consents')
@Index(['userId'])
@Index(['context', 'resourceType', 'resourceId'])
export class PolicyConsent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId!: number | null;

  @Column({ type: 'enum', enum: PolicyConsentContext })
  context!: PolicyConsentContext;

  @Column({ name: 'resource_type', type: 'varchar', length: 50, nullable: true })
  resourceType!: string | null;

  @Column({ name: 'resource_id', type: 'bigint', nullable: true })
  resourceId!: number | null;

  @Column({ type: 'json' })
  policies!: PolicyConsentSnapshot[];

  @Column({ name: 'marketing_consent', type: 'boolean', default: false })
  marketingConsent!: boolean;

  @CreateDateColumn({ name: 'consented_at' })
  consentedAt!: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;
}
