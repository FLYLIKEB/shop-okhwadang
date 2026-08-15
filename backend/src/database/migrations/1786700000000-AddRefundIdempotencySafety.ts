import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundIdempotencySafety1786700000000 implements MigrationInterface {
  name = 'AddRefundIdempotencySafety1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('refunds');
    if (!table) return;

    if (!table.findColumnByName('idempotency_key')) {
      await queryRunner.query('ALTER TABLE `refunds` ADD `idempotency_key` varchar(255) NULL');
      await queryRunner.query("UPDATE `refunds` SET `idempotency_key` = CONCAT('legacy-refund-', `id`) WHERE `idempotency_key` IS NULL");
      await queryRunner.query('ALTER TABLE `refunds` MODIFY `idempotency_key` varchar(255) NOT NULL');
    }

    if (!table.findColumnByName('gateway_attempted_at')) {
      await queryRunner.query('ALTER TABLE `refunds` ADD `gateway_attempted_at` datetime NULL');
    }
    if (!table.findColumnByName('reconciliation_evidence')) {
      await queryRunner.query('ALTER TABLE `refunds` ADD `reconciliation_evidence` varchar(1000) NULL');
    }
    if (!table.findColumnByName('reconciled_at')) {
      await queryRunner.query('ALTER TABLE `refunds` ADD `reconciled_at` datetime NULL');
    }

    const refreshedTable = await queryRunner.getTable('refunds');
    if (!refreshedTable?.indices.some((index) => index.name === 'UQ_refunds_idempotency_key')) {
      await queryRunner.query('CREATE UNIQUE INDEX `UQ_refunds_idempotency_key` ON `refunds` (`idempotency_key`)');
    }
    if (!refreshedTable?.indices.some((index) => index.name === 'IDX_refunds_payment_status')) {
      await queryRunner.query('CREATE INDEX `IDX_refunds_payment_status` ON `refunds` (`payment_id`, `status`)');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('refunds');
    if (!table) return;

    if (table.indices.some((index) => index.name === 'IDX_refunds_payment_status')) {
      await queryRunner.query('DROP INDEX `IDX_refunds_payment_status` ON `refunds`');
    }
    if (table.indices.some((index) => index.name === 'UQ_refunds_idempotency_key')) {
      await queryRunner.query('DROP INDEX `UQ_refunds_idempotency_key` ON `refunds`');
    }
    if (table.findColumnByName('gateway_attempted_at')) {
      await queryRunner.query('ALTER TABLE `refunds` DROP COLUMN `gateway_attempted_at`');
    }
    if (table.findColumnByName('reconciliation_evidence')) {
      await queryRunner.query('ALTER TABLE `refunds` DROP COLUMN `reconciliation_evidence`');
    }
    if (table.findColumnByName('reconciled_at')) {
      await queryRunner.query('ALTER TABLE `refunds` DROP COLUMN `reconciled_at`');
    }
    if (table.findColumnByName('idempotency_key')) {
      await queryRunner.query('ALTER TABLE `refunds` DROP COLUMN `idempotency_key`');
    }
  }
}
