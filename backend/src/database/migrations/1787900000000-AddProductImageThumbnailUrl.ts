import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductImageThumbnailUrl1787900000000 implements MigrationInterface {
  name = 'AddProductImageThumbnailUrl1787900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_images' AND COLUMN_NAME = 'thumbnail_url'",
    )) as Array<{ cnt: string }>;

    if (rows[0]?.cnt === '0') {
      await queryRunner.query(
        "ALTER TABLE `product_images` ADD `thumbnail_url` varchar(500) NULL AFTER `url`",
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `product_images` DROP COLUMN `thumbnail_url`',
    );
  }
}
