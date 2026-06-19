import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MessageTemplateKey, TransactionalMessageChannel } from '../interfaces/message-provider.interface';

export type NotificationLogStatus = 'pending' | 'sent' | 'failed' | 'skipped';
export type NotificationResourceType = 'order' | 'payment' | 'shipping';

@Entity('notification_logs')
@Index(['eventType', 'resourceType', 'resourceId'])
@Index(['recipientPhoneHash'])
export class NotificationLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ name: 'event_type', length: 80 })
  eventType!: string;

  @Column({ type: 'enum', enum: ['kakao_alimtalk', 'sms', 'lms'], default: 'kakao_alimtalk' })
  channel!: TransactionalMessageChannel;

  @Column({ length: 50 })
  provider!: string;

  @Column({ name: 'resource_type', length: 30 })
  resourceType!: NotificationResourceType;

  @Column({ name: 'resource_id', type: 'bigint' })
  resourceId!: number;

  @Column({ name: 'recipient_phone_hash', type: 'varchar', length: 64, nullable: true })
  recipientPhoneHash!: string | null;

  @Column({ name: 'recipient_phone_masked', type: 'varchar', length: 30, nullable: true })
  recipientPhoneMasked!: string | null;

  @Column({ name: 'template_key', length: 80 })
  templateKey!: MessageTemplateKey;

  @Column({ name: 'provider_message_id', type: 'varchar', length: 120, nullable: true })
  providerMessageId!: string | null;

  @Column({ type: 'enum', enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' })
  status!: NotificationLogStatus;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
