import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderCancellationFields1786500000000 implements MigrationInterface {
  name = 'AddOrderCancellationFields1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');
    const hasCancelReason = table?.findColumnByName('cancel_reason');
    const hasCancelledAt = table?.findColumnByName('cancelled_at');

    if (!hasCancelReason) {
      await queryRunner.query('ALTER TABLE `orders` ADD `cancel_reason` varchar(500) NULL');
    }

    if (!hasCancelledAt) {
      await queryRunner.query('ALTER TABLE `orders` ADD `cancelled_at` datetime NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');

    if (table?.findColumnByName('cancelled_at')) {
      await queryRunner.query('ALTER TABLE `orders` DROP COLUMN `cancelled_at`');
    }

    if (table?.findColumnByName('cancel_reason')) {
      await queryRunner.query('ALTER TABLE `orders` DROP COLUMN `cancel_reason`');
    }
  }
}
