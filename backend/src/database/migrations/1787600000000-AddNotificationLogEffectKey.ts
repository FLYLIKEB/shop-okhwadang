import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationLogEffectKey1787600000000 implements MigrationInterface {
  name = 'AddNotificationLogEffectKey1787600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `notification_logs` ADD `effect_key` varchar(191) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `notification_logs` ADD UNIQUE INDEX `UQ_notification_logs_effect_key` (`effect_key`)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `notification_logs` DROP INDEX `UQ_notification_logs_effect_key`');
    await queryRunner.query('ALTER TABLE `notification_logs` DROP COLUMN `effect_key`');
  }
}
