import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  // Admin order actions
  ORDER_STATUS_UPDATE = 'ORDER_STATUS_UPDATE',
  ORDER_SHIPPING_REGISTER = 'ORDER_SHIPPING_REGISTER',
  // Admin member actions
  MEMBER_SUSPEND = 'MEMBER_SUSPEND',
  MEMBER_UNSUSPEND = 'MEMBER_UNSUSPEND',
  MEMBER_ROLE_CHANGE = 'MEMBER_ROLE_CHANGE',
  // Admin product actions
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  // Admin coupon actions
  COUPON_CREATE = 'COUPON_CREATE',
  COUPON_UPDATE = 'COUPON_UPDATE',
  COUPON_DELETE = 'COUPON_DELETE',
  // Auth actions
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
}

@Entity('audit_logs')
@Index(['actorId', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: false })
  actorId!: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  actorRole!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  action!: AuditAction;

  @Column({ type: 'varchar', length: 100, nullable: false })
  resourceType!: string;

  @Column({ type: 'int', nullable: true })
  resourceId!: number | null;

  @Column({ type: 'json', nullable: true })
  beforeJson!: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  afterJson!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}