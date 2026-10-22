import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTemplates1788500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS notification_templates (
      channel varchar(16) NOT NULL, \`key\` varchar(64) NOT NULL, locale varchar(2) NOT NULL,
      subject varchar(255) NOT NULL, html mediumtext NOT NULL, text text NOT NULL,
      template_id varchar(100) NOT NULL,
      updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (channel, \`key\`, locale)
    ) ENGINE=InnoDB`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE notification_templates');
  }
}
