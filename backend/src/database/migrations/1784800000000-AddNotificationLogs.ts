import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationLogs1784800000000 implements MigrationInterface {
  name = 'AddNotificationLogs1784800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id BIGINT NOT NULL AUTO_INCREMENT,
        event_type VARCHAR(80) NOT NULL,
        channel ENUM('kakao_alimtalk', 'sms', 'lms') NOT NULL DEFAULT 'kakao_alimtalk',
        provider VARCHAR(50) NOT NULL,
        resource_type VARCHAR(30) NOT NULL,
        resource_id BIGINT NOT NULL,
        recipient_phone_hash VARCHAR(64) NULL,
        recipient_phone_masked VARCHAR(30) NULL,
        template_key VARCHAR(80) NOT NULL,
        provider_message_id VARCHAR(120) NULL,
        status ENUM('pending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
        error_message VARCHAR(500) NULL,
        sent_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_notification_logs_event_resource (event_type, resource_type, resource_id),
        INDEX IDX_notification_logs_phone_hash (recipient_phone_hash),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS notification_logs');
  }
}
