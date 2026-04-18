import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('point_history')
@Index(['userId'])
export class PointHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ type: 'enum', enum: ['earn', 'spend', 'expire', 'admin_adjust'] })
  type!: 'earn' | 'spend' | 'expire' | 'admin_adjust';

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'int' })
  balance!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
