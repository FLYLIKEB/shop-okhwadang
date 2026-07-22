import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('guest_order_access')
@Index('IDX_guest_order_access_order_id', ['orderId'])
@Index('IDX_guest_order_access_token_digest', ['tokenDigest'], { unique: true })
@Index('IDX_guest_order_access_expires_at', ['expiresAt'])
@Index('IDX_guest_order_access_superseded_by_id', ['supersededById'])
export class GuestOrderAccess {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: number;

  @Column({ name: 'token_digest', type: 'varchar', length: 64 })
  tokenDigest!: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;

  @Column({ name: 'superseded_at', type: 'datetime', nullable: true })
  supersededAt!: Date | null;

  @Column({ name: 'superseded_by_id', type: 'bigint', nullable: true })
  supersededById!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => GuestOrderAccess, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'superseded_by_id' })
  supersededBy!: GuestOrderAccess | null;
}
