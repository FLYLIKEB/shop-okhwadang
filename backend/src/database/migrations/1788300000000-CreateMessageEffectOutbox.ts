import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessageEffectOutbox1788300000000 implements MigrationInterface {
  name = 'CreateMessageEffectOutbox1788300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`message_effect_outbox\` (
      \`id\` bigint NOT NULL AUTO_INCREMENT,
      \`order_id\` bigint NOT NULL,
      \`event_type\` enum('order.created','shipping.started','shipping.delivered') NOT NULL,
      \`state\` enum('PENDING','PROCESSING','SUCCEEDED','FAILED','MANUAL_REVIEW') NOT NULL DEFAULT 'PENDING',
      \`attempt_count\` int unsigned NOT NULL DEFAULT 0,
      \`next_attempt_at\` datetime NULL,
      \`lease_owner\` varchar(128) NULL,
      \`lease_expires_at\` datetime NULL,
      \`last_error\` varchar(128) NULL,
      \`processed_at\` datetime NULL,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_message_effect_outbox_order_event\` (\`order_id\`, \`event_type\`),
      KEY \`IDX_message_effect_outbox_due\` (\`state\`, \`next_attempt_at\`)
    ) ENGINE=InnoDB`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `message_effect_outbox`');
  }
}
