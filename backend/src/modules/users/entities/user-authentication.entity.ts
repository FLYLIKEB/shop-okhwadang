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

export enum OAuthProvider {
  KAKAO = 'kakao',
  GOOGLE = 'google',
}

@Entity('user_authentications')
@Index(['provider', 'providerId'], { unique: true })
export class UserAuthentication {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @Column({ type: 'enum', enum: OAuthProvider })
  provider!: OAuthProvider;

  @Column({ name: 'provider_id', length: 255 })
  providerId!: string;

  @Column({ name: 'access_token', type: 'text', nullable: true })
  accessToken!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
