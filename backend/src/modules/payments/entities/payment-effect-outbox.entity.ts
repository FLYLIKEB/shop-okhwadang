import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PaymentEffectState {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

export enum PaymentEffectType {
  PAYMENT_CONFIRMED_NOTIFICATION = 'PAYMENT_CONFIRMED_NOTIFICATION',
  MEMBER_MESSAGE_NOTIFICATION = 'MEMBER_MESSAGE_NOTIFICATION',
  ORDER_COMPLETED_EVENT = 'ORDER_COMPLETED_EVENT',
  FIRST_PURCHASE = 'FIRST_PURCHASE',
  SHIPPING = 'SHIPPING',
  GUEST_ORDER_ACCESS = 'GUEST_ORDER_ACCESS',
}

export interface PaymentCompletionEffectPayload extends Record<string, unknown> {
  userId: number | null;
  orderId: number;
  orderNumber: string;
  recipientName: string;
  amount: number;
  method: string;
  locale: 'ko' | 'en';
  customerType: 'member' | 'guest';
  isFirstPurchase: boolean;
  guestEmail: string | null;
}

@Entity('payment_effect_outbox')
@Index('UQ_payment_effect_outbox_order_effect', ['orderId', 'effectType'], { unique: true })
@Index('IDX_payment_effect_outbox_due', ['state', 'nextAttemptAt'])
export class PaymentEffectOutbox {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: number;

  @Column({ name: 'effect_type', type: 'enum', enum: PaymentEffectType })
  effectType!: PaymentEffectType;

  @Column({ type: 'enum', enum: PaymentEffectState, default: PaymentEffectState.PENDING })
  state!: PaymentEffectState;

  @Column({ type: 'json' })
  payload!: Record<string, unknown>;

  @Column({ name: 'evidence', type: 'json', nullable: true })
  evidence!: Record<string, unknown> | null;

  @Column({ name: 'attempt_count', type: 'int', unsigned: true, default: 0 })
  attemptCount!: number;

  @Column({ name: 'next_attempt_at', type: 'datetime', nullable: true })
  nextAttemptAt!: Date | null;

  @Column({ name: 'lease_owner', type: 'varchar', length: 128, nullable: true })
  leaseOwner!: string | null;

  @Column({ name: 'lease_expires_at', type: 'datetime', nullable: true })
  leaseExpiresAt!: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
