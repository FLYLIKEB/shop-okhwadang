import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDurablePaymentWebhookReceipts1787400000000 implements MigrationInterface {
  name = 'AddDurablePaymentWebhookReceipts1787400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('payment_webhook_events');
    if (!table) return;
    const columns = [
      ['state', "enum('pending','processing','succeeded','ignored','failed','manual_review') NOT NULL DEFAULT 'pending'"],
      ['attempt_count', 'int unsigned NOT NULL DEFAULT 0'],
      ['lease_owner', 'varchar(128) NULL'], ['lease_expires_at', 'datetime NULL'],
      ['next_attempt_at', 'datetime NULL'], ['provider_route', "varchar(128) NOT NULL DEFAULT ''"],
      ['processing_started_at', 'datetime NULL'], ['max_attempts', 'int unsigned NOT NULL DEFAULT 8'],
      ['last_error', 'text NULL'], ['raw_body', 'longblob NULL'],
      ['signature_header', 'varchar(128) NULL'], ['signature_value', 'text NULL'],
      ['normalized_metadata', 'json NULL'], ['replayable', 'tinyint NOT NULL DEFAULT 1'],
      ['replay_count', 'int unsigned NOT NULL DEFAULT 0'], ['replayed_at', 'datetime NULL'],
    ] as const;
    for (const [name, definition] of columns) if (!table.findColumnByName(name)) await queryRunner.query(`ALTER TABLE \`payment_webhook_events\` ADD \`${name}\` ${definition}`);
    await queryRunner.query("ALTER TABLE `payment_webhook_events` MODIFY `state` enum('pending','processing','succeeded','ignored','failed','manual_review') NOT NULL DEFAULT 'pending'");
    await queryRunner.query("UPDATE `payment_webhook_events` SET `state` = 'manual_review', `replayable` = 0, `last_error` = COALESCE(`last_error`, 'Legacy receipt has no signed raw body and cannot be replayed.') WHERE `raw_body` IS NULL");
    const refreshed = await queryRunner.getTable('payment_webhook_events');
    if (refreshed && !refreshed.indices.some((index) => index.name === 'IDX_payment_webhook_events_retry')) await queryRunner.query('CREATE INDEX `IDX_payment_webhook_events_retry` ON `payment_webhook_events` (`state`, `next_attempt_at`)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('payment_webhook_events');
    if (!table) return;
    if (table.indices.some((index) => index.name === 'IDX_payment_webhook_events_retry')) await queryRunner.query('DROP INDEX `IDX_payment_webhook_events_retry` ON `payment_webhook_events`');
    for (const name of ['replayed_at', 'replay_count', 'replayable', 'normalized_metadata', 'signature_value', 'signature_header', 'raw_body', 'last_error', 'max_attempts', 'processing_started_at', 'provider_route', 'next_attempt_at', 'lease_expires_at', 'lease_owner', 'attempt_count', 'state']) if (table.findColumnByName(name)) await queryRunner.query(`ALTER TABLE \`payment_webhook_events\` DROP COLUMN \`${name}\``);
  }
}
