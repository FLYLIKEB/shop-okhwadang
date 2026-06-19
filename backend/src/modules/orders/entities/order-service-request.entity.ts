import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { User } from '../../users/entities/user.entity';

export enum OrderServiceRequestType {
  CANCEL = 'cancel',
  RETURN = 'return',
  EXCHANGE = 'exchange',
  REFUND = 'refund',
}

export enum OrderServiceRequestStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

@Entity('order_service_requests')
@Index(['orderId'])
@Index(['userId'])
@Index(['type', 'status'])
export class OrderServiceRequest {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ type: 'enum', enum: OrderServiceRequestType })
  type!: OrderServiceRequestType;

  @Column({ type: 'enum', enum: OrderServiceRequestStatus, default: OrderServiceRequestStatus.REQUESTED })
  status!: OrderServiceRequestStatus;

  @Column({ type: 'varchar', length: 100 })
  reason!: string;

  @Column({ type: 'longtext', nullable: true })
  detail!: string | null;

  @Column({ name: 'image_urls', type: 'json', nullable: true })
  imageUrls!: string[] | null;

  @Column({ name: 'use_shipping_address', type: 'boolean', default: true })
  useShippingAddress!: boolean;

  @Column({ name: 'pickup_name', type: 'varchar', length: 100, nullable: true })
  pickupName!: string | null;

  @Column({ name: 'pickup_phone', type: 'varchar', length: 20, nullable: true })
  pickupPhone!: string | null;

  @Column({ name: 'pickup_zipcode', type: 'varchar', length: 10, nullable: true })
  pickupZipcode!: string | null;

  @Column({ name: 'pickup_address', type: 'varchar', length: 255, nullable: true })
  pickupAddress!: string | null;

  @Column({ name: 'pickup_address_detail', type: 'varchar', length: 255, nullable: true })
  pickupAddressDetail!: string | null;

  @Column({ name: 'admin_note', type: 'longtext', nullable: true })
  adminNote!: string | null;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
