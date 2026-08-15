import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMING = 'confirming',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  PARTIAL_CANCELLED = 'partial_cancelled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  VIRTUAL_ACCOUNT = 'virtual_account',
  PHONE = 'phone',
  MOCK = 'mock',
  PAYPAL = 'paypal',
  EXIMBAY = 'eximbay',
}

export enum PaymentGatewayType {
  MOCK = 'mock',
  TOSS = 'toss',
  INICIS = 'inicis',
  STRIPE = 'stripe',

  PAYPAL = 'paypal',
  EXIMBAY = 'eximbay',
}

@Entity('payments')
@Index(['status'])
export class Payment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'order_id', type: 'bigint', unique: true })
  orderId!: number;

  @Column({ name: 'payment_key', type: 'varchar', length: 255, unique: true, nullable: true })
  paymentKey!: string | null;

  @Column({ name: 'provider_transaction_id', type: 'varchar', length: 255, nullable: true })
  providerTransactionId!: string | null;

  @Column({ name: 'provider_order_reference', type: 'varchar', length: 255, nullable: true })
  providerOrderReference!: string | null;

  @Column({ name: 'expected_provider_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  expectedProviderAmount!: number | null;

  @Column({ name: 'expected_provider_currency', type: 'varchar', length: 8, nullable: true })
  expectedProviderCurrency!: string | null;

  @Column({ name: 'local_order_reference', type: 'varchar', length: 255, nullable: true })
  localOrderReference!: string | null;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.MOCK,
  })
  method!: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentGatewayType,
    default: PaymentGatewayType.MOCK,
  })
  gateway!: PaymentGatewayType;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 500, nullable: true })
  cancelReason!: string | null;

  @Column({ name: 'confirmation_operation_key', type: 'varchar', length: 255, nullable: true })
  confirmationOperationKey!: string | null;

  @Column({ name: 'raw_response', type: 'json', nullable: true })
  rawResponse!: object | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order!: Order;
}
