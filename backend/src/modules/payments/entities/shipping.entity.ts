import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

export enum ShippingStatus {
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PREPARING = 'preparing',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

@Entity('shipping')
export class Shipping {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'order_id', type: 'bigint', unique: true })
  orderId!: number;

  @Column({ length: 50, default: 'mock' })
  carrier!: string;

  @Column({ name: 'tracking_number', type: 'varchar', length: 100, nullable: true })
  trackingNumber!: string | null;

  @Column({
    type: 'enum',
    enum: ShippingStatus,
    default: ShippingStatus.PAYMENT_CONFIRMED,
  })
  status!: ShippingStatus;

  @Column({ name: 'shipped_at', type: 'datetime', nullable: true })
  shippedAt!: Date | null;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true })
  deliveredAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order!: Order;
}
