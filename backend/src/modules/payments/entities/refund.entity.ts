import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Payment } from './payment.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

export enum RefundStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('refunds')
@Index(['paymentId'])
@Index('IDX_refunds_payment_status', ['paymentId', 'status'])
@Index('UQ_refunds_idempotency_key', ['idempotencyKey'], { unique: true })
export class Refund {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'payment_id', type: 'bigint' })
  paymentId!: number;

  @Column({ name: 'order_item_id', type: 'bigint', nullable: true })
  orderItemId!: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'provider_minor_amount', type: 'int', nullable: true })
  providerMinorAmount!: number | null;

  @Column({ name: 'local_cumulative_offset', type: 'decimal', precision: 12, scale: 2, nullable: true })
  localCumulativeOffset!: number | null;

  @Column({ type: 'varchar', length: 500 })
  reason!: string;

  @Column({ type: 'enum', enum: RefundStatus, default: RefundStatus.PENDING })
  status!: RefundStatus;

  @Column({ name: 'gateway_refund_id', type: 'varchar', length: 255, nullable: true })
  gatewayRefundId!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255 })
  idempotencyKey!: string;

  @Column({ name: 'gateway_attempted_at', type: 'datetime', nullable: true })
  gatewayAttemptedAt!: Date | null;

  @Column({ name: 'reconciliation_evidence', type: 'varchar', length: 1000, nullable: true })
  reconciliationEvidence!: string | null;

  @Column({ name: 'reconciled_at', type: 'datetime', nullable: true })
  reconciledAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Payment)
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;

  @ManyToOne(() => OrderItem, { nullable: true })
  @JoinColumn({ name: 'order_item_id' })
  orderItem!: OrderItem | null;
}
