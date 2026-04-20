import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDeletionAndLoginFailureFields1782000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `users` ADD `last_failed_login_at` datetime NULL AFTER `failed_login_attempts`',
    );
    await queryRunner.query(
      'ALTER TABLE `users` ADD `deletion_requested_at` datetime NULL AFTER `email_verified_at`',
    );
    await queryRunner.query(
      'ALTER TABLE `users` ADD `deletion_scheduled_at` datetime NULL AFTER `deletion_requested_at`',
    );
    await queryRunner.query(
      'ALTER TABLE `users` ADD `deleted_at` datetime NULL AFTER `deletion_scheduled_at`',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_users_deletion_scheduled_at` ON `users` (`deletion_scheduled_at`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_users_deleted_at` ON `users` (`deleted_at`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_users_deleted_at` ON `users`');
    await queryRunner.query('DROP INDEX `IDX_users_deletion_scheduled_at` ON `users`');
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `deleted_at`');
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `deletion_scheduled_at`');
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `deletion_requested_at`');
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `last_failed_login_at`');
  }
}
