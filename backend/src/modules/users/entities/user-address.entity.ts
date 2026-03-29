import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_addresses')
@Index(['userId'])
export class UserAddress {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'recipient_name', length: 100 })
  recipientName!: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ length: 10 })
  zipcode!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ name: 'address_detail', type: 'varchar', length: 255, nullable: true })
  addressDetail!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  label!: string | null;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
