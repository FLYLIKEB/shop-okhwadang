import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentEffectOutbox1787500000000 implements MigrationInterface {
  name = 'CreatePaymentEffectOutbox1787500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`payment_effect_outbox\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`order_id\` bigint NOT NULL,
      \`effect_type\` enum('PAYMENT_CONFIRMED_NOTIFICATION','MEMBER_MESSAGE_NOTIFICATION','ORDER_COMPLETED_EVENT','FIRST_PURCHASE','SHIPPING','GUEST_ORDER_ACCESS') NOT NULL,
      \`state\` enum('PENDING','PROCESSING','SUCCEEDED','FAILED','MANUAL_REVIEW') NOT NULL DEFAULT 'PENDING',
      \`payload\` json NOT NULL,
      \`evidence\` json NULL,
      \`attempt_count\` int unsigned NOT NULL DEFAULT 0,
      \`next_attempt_at\` datetime NULL,
      \`lease_owner\` varchar(128) NULL,
      \`lease_expires_at\` datetime NULL,
      \`last_error\` text NULL,
      \`processed_at\` datetime NULL,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_payment_effect_outbox_order_effect\` (\`order_id\`, \`effect_type\`),
      KEY \`IDX_payment_effect_outbox_due\` (\`state\`, \`next_attempt_at\`)
    ) ENGINE=InnoDB`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `payment_effect_outbox`');
  }
}
