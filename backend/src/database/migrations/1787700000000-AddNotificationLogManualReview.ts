import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationLogManualReview1787700000000 implements MigrationInterface {
  name = 'AddNotificationLogManualReview1787700000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `notification_logs` MODIFY `status` enum('pending','processing','sent','failed','skipped','manual_review') NOT NULL DEFAULT 'pending'");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `notification_logs` MODIFY `status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending'");
  }
}
