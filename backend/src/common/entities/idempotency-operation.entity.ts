import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('idempotency_operations')
@Index(['scope', 'operation', 'key'], { unique: true })
export class IdempotencyOperation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  scope!: string;

  @Column({ length: 100 })
  operation!: string;

  @Column({ length: 255 })
  key!: string;

  @Column({ length: 64 })
  fingerprint!: string;

  @Column({ length: 20, default: 'completed' })
  status!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  leaseOwner!: string | null;

  @Column({ type: 'datetime', nullable: true })
  leaseExpiresAt!: Date | null;

  @Column({ type: 'json' })
  result!: unknown;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
