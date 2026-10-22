import { Logger } from '@nestjs/common';
import { MigrationInterface, QueryRunner } from 'typeorm';
import designs from './data/email-html-1788500000002.json';

export class ResetSavedEmailHtml1788500000002 implements MigrationInterface {
  private readonly logger = new Logger(ResetSavedEmailHtml1788500000002.name);

  async up(queryRunner: QueryRunner): Promise<void> {
    const templates: Array<{ key: string; locale: string }> = await queryRunner.query(
      'SELECT `key`, locale FROM notification_templates WHERE channel = ?', ['email'],
    );
    for (const template of templates) {
      if (!Object.hasOwn(designs, template.key) || !['ko', 'en'].includes(template.locale)) {
        throw new Error('알 수 없는 메일 템플릿이 있어 HTML 일괄 변경을 중단합니다.');
      }
    }

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS notification_email_html_backup_1788500000002 (
      \`key\` varchar(64) NOT NULL, locale varchar(2) NOT NULL,
      original_html mediumtext NOT NULL, replacement_html mediumtext NOT NULL,
      PRIMARY KEY (\`key\`, locale)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    for (const template of templates) {
      const html = designs[template.key as keyof typeof designs][template.locale as 'ko' | 'en'];
      await queryRunner.query(
        `INSERT IGNORE INTO notification_email_html_backup_1788500000002
          (\`key\`, locale, original_html, replacement_html)
         SELECT \`key\`, locale, html, ? FROM notification_templates
         WHERE channel = ? AND \`key\` = ? AND locale = ?`,
        [html, 'email', template.key, template.locale],
      );
    }

    await queryRunner.query(`UPDATE notification_templates AS templates
      JOIN notification_email_html_backup_1788500000002 AS backup
        ON BINARY templates.\`key\` = BINARY backup.\`key\` AND BINARY templates.locale = BINARY backup.locale
      SET templates.html = backup.replacement_html
      WHERE templates.channel = 'email'`);

    const [result]: Array<{ total: string | number; matched: string | number }> = await queryRunner.query(
      `SELECT COUNT(*) AS total,
        COALESCE(SUM(BINARY templates.html = BINARY backup.replacement_html), 0) AS matched
       FROM notification_templates AS templates
       LEFT JOIN notification_email_html_backup_1788500000002 AS backup
         ON BINARY templates.\`key\` = BINARY backup.\`key\` AND BINARY templates.locale = BINARY backup.locale
       WHERE templates.channel = 'email'`,
    );
    if (Number(result.total) !== Number(result.matched)) {
      throw new Error('메일 HTML 일괄 변경 검증에 실패했습니다.');
    }
    this.logger.log(`Email HTML reset verified: ${result.matched}/${result.total} saved templates; originals backed up.`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE notification_templates AS templates
      JOIN notification_email_html_backup_1788500000002 AS backup
        ON BINARY templates.\`key\` = BINARY backup.\`key\` AND BINARY templates.locale = BINARY backup.locale
      SET templates.html = backup.original_html
      WHERE templates.channel = 'email' AND BINARY templates.html = BINARY backup.replacement_html`);
  }
}
