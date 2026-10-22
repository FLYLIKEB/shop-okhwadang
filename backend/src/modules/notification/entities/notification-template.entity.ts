import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryColumn({ length: 16 }) channel!: 'email' | 'alimtalk';
  @PrimaryColumn({ length: 64 }) key!: string;
  @PrimaryColumn({ length: 2 }) locale!: 'ko' | 'en';
  @Column({ length: 255 }) subject!: string;
  @Column({ type: 'mediumtext' }) html!: string;
  @Column({ type: 'text' }) text!: string;
  @Column({ name: 'template_id', length: 100 }) templateId!: string;
  @Column({ name: 'pending_template_id', type: 'varchar', length: 100, nullable: true }) pendingTemplateId!: string | null;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
