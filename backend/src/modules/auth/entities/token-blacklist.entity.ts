import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('token_blacklist')
@Index(['userId'])
@Index(['expiresAt'])
export class TokenBlacklist {
  @PrimaryColumn({ name: 'jti', type: 'varchar', length: 36 })
  jti!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}