import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeRefundQuoteAllocation1787000000000 implements MigrationInterface {
  name = 'AddStripeRefundQuoteAllocation1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('refunds');
    if (!table) return;
    if (!table.findColumnByName('provider_minor_amount')) {
      await queryRunner.query('ALTER TABLE `refunds` ADD `provider_minor_amount` int NULL');
    }
    if (!table.findColumnByName('local_cumulative_offset')) {
      await queryRunner.query('ALTER TABLE `refunds` ADD `local_cumulative_offset` decimal(12,2) NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('refunds');
    if (!table) return;
    if (table.findColumnByName('local_cumulative_offset')) {
      await queryRunner.query('ALTER TABLE `refunds` DROP COLUMN `local_cumulative_offset`');
    }
    if (table.findColumnByName('provider_minor_amount')) {
      await queryRunner.query('ALTER TABLE `refunds` DROP COLUMN `provider_minor_amount`');
    }
  }
}
