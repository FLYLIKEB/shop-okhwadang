import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInquiryNotificationColumns1782100000000 implements MigrationInterface {
  name = 'AddInquiryNotificationColumns1782100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inquiries' AND COLUMN_NAME = 'customer_read_at'`,
    );
    if (!row) {
      await queryRunner.query(
        `ALTER TABLE \`inquiries\` ADD COLUMN \`customer_read_at\` datetime NULL AFTER \`answered_at\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inquiries' AND COLUMN_NAME = 'customer_read_at'`,
    );
    if (row) {
      await queryRunner.query(`ALTER TABLE \`inquiries\` DROP COLUMN \`customer_read_at\``);
    }
  }
}
