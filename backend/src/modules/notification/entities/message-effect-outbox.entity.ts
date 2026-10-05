import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type MessageEffectEventType = 'order.created' | 'shipping.started' | 'shipping.delivered';

export enum MessageEffectState {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

@Entity('message_effect_outbox')
@Index('UQ_message_effect_outbox_order_event', ['orderId', 'eventType'], { unique: true })
@Index('IDX_message_effect_outbox_due', ['state', 'nextAttemptAt'])
export class MessageEffectOutbox {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: number;

  @Column({ name: 'event_type', type: 'enum', enum: ['order.created', 'shipping.started', 'shipping.delivered'] })
  eventType!: MessageEffectEventType;

  @Column({ type: 'enum', enum: MessageEffectState, default: MessageEffectState.PENDING })
  state!: MessageEffectState;

  @Column({ name: 'attempt_count', type: 'int', unsigned: true, default: 0 })
  attemptCount!: number;

  @Column({ name: 'next_attempt_at', type: 'datetime', nullable: true })
  nextAttemptAt!: Date | null;

  @Column({ name: 'lease_owner', type: 'varchar', length: 128, nullable: true })
  leaseOwner!: string | null;

  @Column({ name: 'lease_expires_at', type: 'datetime', nullable: true })
  leaseExpiresAt!: Date | null;

  @Column({ name: 'last_error', type: 'varchar', length: 128, nullable: true })
  lastError!: string | null;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
