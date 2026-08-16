import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PaymentGatewayType } from './payment.entity';

/**
 * 웹훅 처리 결과 (issue #725)
 *
 * - SUCCESS: payment/order 상태 전이가 정상 완료
 * - IGNORED: 멱등 재수신, 차단 전이, 알 수 없는 이벤트, payment 미존재 등 의도된 무시
 * - FAILED: 처리 도중 예외 발생 (관리자 재처리 대상)
 */
export enum PaymentWebhookResult {
  SUCCESS = 'success',
  IGNORED = 'ignored',
  FAILED = 'failed',
}

export enum PaymentWebhookState {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  IGNORED = 'ignored',
  FAILED = 'failed',
  MANUAL_REVIEW = 'manual_review',
}

/**
 * PG 웹훅 수신 이벤트 로그 (issue #725)
 *
 * 목적:
 *   - 동일 (gateway, event_id) 조합 재수신 시 UNIQUE 제약으로 즉시 중복 차단 → 멱등성 보장
 *   - 성공 / 무시 / 실패 결과를 운영자가 추적 (관측성)
 *   - 실패한 웹훅은 raw_payload + error_message 가 보존되어 사후 재처리 가능
 *
 * Idempotency key (gateway 별):
 *   - Toss: `eventId` 우선 → 없으면 `paymentKey + ':' + eventType` 폴백
 *   - Stripe: `event.id`

 *   - KGInicis: `tid` (취소면 `:cancel` suffix)
 *   - Mock: `orderId + ':' + eventType` (테스트/개발용)
 */
@Entity('payment_webhook_events')
@Index('IDX_payment_webhook_events_gateway_event', ['gateway', 'eventId'], {
  unique: true,
})
@Index('IDX_payment_webhook_events_received_at', ['receivedAt'])
@Index('IDX_payment_webhook_events_retry', ['state', 'nextAttemptAt'])
export class PaymentWebhookEvent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({
    type: 'enum',
    enum: PaymentGatewayType,
  })
  gateway!: PaymentGatewayType;

  @Column({ name: 'event_id', type: 'varchar', length: 255 })
  eventId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: string;

  /** The gateway route which received the signed request; never rewritten on replay. */
  @Column({ name: 'provider_route', type: 'varchar', length: 128, default: '' })
  providerRoute!: string;

  @Column({ name: 'payment_id', type: 'bigint', nullable: true })
  paymentId!: number | null;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId!: number | null;

  @CreateDateColumn({ name: 'received_at' })
  receivedAt!: Date;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt!: Date | null;

  @Column({ name: 'processing_started_at', type: 'datetime', nullable: true })
  processingStartedAt!: Date | null;

  @Column({ type: 'enum', enum: PaymentWebhookState, default: PaymentWebhookState.PENDING })
  state!: PaymentWebhookState;

  @Column({ name: 'attempt_count', type: 'int', unsigned: true, default: 0 })
  attemptCount!: number;

  @Column({ name: 'max_attempts', type: 'int', unsigned: true, default: 8 })
  maxAttempts!: number;

  @Column({ name: 'lease_owner', type: 'varchar', length: 128, nullable: true })
  leaseOwner!: string | null;

  @Column({ name: 'lease_expires_at', type: 'datetime', nullable: true })
  leaseExpiresAt!: Date | null;

  @Column({ name: 'next_attempt_at', type: 'datetime', nullable: true })
  nextAttemptAt!: Date | null;

  @Column({
    type: 'enum',
    enum: PaymentWebhookResult,
  })
  result!: PaymentWebhookResult;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'raw_body', type: 'longblob', nullable: true })
  rawBody!: Buffer | null;

  @Column({ name: 'signature_header', type: 'varchar', length: 128, nullable: true })
  signatureHeader!: string | null;

  @Column({ name: 'signature_value', type: 'text', nullable: true })
  signatureValue!: string | null;

  /** Parsed provider fields used for routing; the source request is rawBody. */
  @Column({ name: 'normalized_metadata', type: 'json', nullable: true })
  normalizedMetadata!: object | null;

  @Column({ name: 'replayable', type: 'boolean', default: true })
  replayable!: boolean;

  @Column({ name: 'replay_count', type: 'int', unsigned: true, default: 0 })
  replayCount!: number;

  @Column({ name: 'replayed_at', type: 'datetime', nullable: true })
  replayedAt!: Date | null;
}
