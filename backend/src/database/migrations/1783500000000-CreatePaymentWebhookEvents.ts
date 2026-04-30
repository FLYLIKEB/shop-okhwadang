import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 결제 웹훅 멱등성·관측성 테이블 (#725)
 *
 * 목적:
 *   - PG 웹훅 중복 수신을 (gateway, event_id) UNIQUE 제약으로 차단 → 멱등성 보장
 *   - 처리 결과(success/ignored/failed)를 보존하여 운영자가 재처리 가능
 *
 * idempotent up:
 *   - 부분 적용 상태에서도 안전하게 재실행되도록 CREATE TABLE IF NOT EXISTS 사용
 */
export class CreatePaymentWebhookEvents1783500000000 implements MigrationInterface {
  name = 'CreatePaymentWebhookEvents1783500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`payment_webhook_events\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`gateway\` enum('mock','toss','inicis','stripe','naverpay') NOT NULL,
        \`event_id\` varchar(255) NOT NULL,
        \`event_type\` varchar(64) NOT NULL,
        \`payment_id\` bigint NULL,
        \`order_id\` bigint NULL,
        \`received_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`processed_at\` datetime NULL,
        \`result\` enum('success','ignored','failed') NOT NULL,
        \`error_message\` text NULL,
        \`raw_payload\` json NULL,
        UNIQUE INDEX \`IDX_payment_webhook_events_gateway_event\` (\`gateway\`, \`event_id\`),
        INDEX \`IDX_payment_webhook_events_received_at\` (\`received_at\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `payment_webhook_events`');
  }
}
