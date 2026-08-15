import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentConfirmationOperation1787200000000 implements MigrationInterface {
  name = 'AddPaymentConfirmationOperation1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('payments');
    if (!table) return;
    if (!table.findColumnByName('confirmation_operation_key')) {
      await queryRunner.query('ALTER TABLE `payments` ADD `confirmation_operation_key` varchar(255) NULL');
    }
    if (!table.findColumnByName('status')?.enum?.includes('confirming')) {
      await queryRunner.query("ALTER TABLE `payments` MODIFY `status` ENUM('pending', 'confirming', 'confirmed', 'cancelled', 'partial_cancelled', 'refunded', 'failed') NOT NULL DEFAULT 'pending'");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('payments');
    if (!table) return;
    if (table.findColumnByName('status')?.enum?.includes('confirming')) {
      await queryRunner.query("UPDATE `payments` SET `status` = 'pending' WHERE `status` = 'confirming'");
      await queryRunner.query("ALTER TABLE `payments` MODIFY `status` ENUM('pending', 'confirmed', 'cancelled', 'partial_cancelled', 'refunded', 'failed') NOT NULL DEFAULT 'pending'");
    }
    if (table.findColumnByName('confirmation_operation_key')) {
      await queryRunner.query('ALTER TABLE `payments` DROP COLUMN `confirmation_operation_key`');
    }
  }
}
